const crypto = require('crypto')
const msal = require('@azure/msal-node')

const MSAL_CONFIG = {
  auth: {
    clientId: process.env.AAD_CLIENT_ID,
    authority: process.env.AAD_AUTH_URL,
    clientSecret: process.env.AAD_CLIENT_SECRET,
  },
}

const SCHEMA = 'hdb_msal_auth'
const TABLE = 'sessions'

const REDIRECT_URI = process.env.AAD_REDIRECT_URI

const PERMISSION_MAP = {
  read: 'read',
  write: 'insert',
}

async function setup(request, response, hdbCore, logger) {
  logger.notify('Creating HDB MSAL Auth Schema')
  try {
    await hdbCore.requestWithoutAuthentication({
      body: {
        operation: 'create_schema',
        schema: SCHEMA,
      },
    })
    logger.notify('HDB MSAL Auth Schema has been created')
  } catch (error) {
    logger.notify('HDB MSAL Auth Schema already exists')
  }

  logger.notify('Create HDB MSAL Auth Table')
  try {
    await hdbCore.requestWithoutAuthentication({
      body: {
        operation: 'create_table',
        schema: SCHEMA,
        table: TABLE,
        hash_attribute: 'token',
      },
    })
    logger.notify('HDB MSAL Auth Table has been created')
  } catch (error) {
    logger.notify('HDB MSAL Auth Table already exists')
  }

  return response.code(200).send('HDB MSAL Auth has been setup')
}

async function loginPW(request, response, hdbCore, logger) {
  const confidentialClientApplication = new msal.ConfidentialClientApplication({ auth: MSAL_CONFIG.auth })

  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: REDIRECT_URI,
  }

  let roles

  try {
    await confidentialClientApplication.acquireTokenByUsernamePassword({
      username: request.body.username,
      password: request.body.password,
      scopes: ['user.read'],
    })
    const msalTokenCache = confidentialClientApplication.getTokenCache()
    const cachedAccounts = await msalTokenCache.getAllAccounts()
    roles = cachedAccounts[0].idTokenClaims.roles
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('MSAL Error')
  }

  const hdbToken = await new Promise((resolve) => {
    crypto.randomBytes(12, (error, buffer) => {
      resolve(buffer.toString('hex'))
    })
  })

  const hashedToken = crypto.createHash('md5').update(hdbToken).digest('hex')

  try {
    await hdbCore.requestWithoutAuthentication({
      body: {
        operation: 'insert',
        schema: SCHEMA,
        table: TABLE,
        records: [{ token: hashedToken, roles }],
      },
    })
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('HDB Token Error')
  }

  return response.code(200).send(hdbToken)
}

async function loginMSD(request, response, hdbCore, logger) {
  const confidentialClientApplication = new msal.ConfidentialClientApplication({ auth: MSAL_CONFIG.auth })

  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: REDIRECT_URI,
  }

  try {
    const authUrl = await confidentialClientApplication.getAuthCodeUrl(authCodeUrlParameters)
    console.log('authUrl', authUrl)
    return response.redirect(authUrl)
  } catch (error) {
    return response.code(500).send('Could not get Auth Code URL')
  }
}

async function loginSuccess(request, response, hdbCore, logger) {
  const confidentialClientApplication = new msal.ConfidentialClientApplication({ auth: MSAL_CONFIG.auth })

  const authCodeUrlParameters = {
    code: request.query.code,
    scopes: ['user.read'],
    redirectUri: REDIRECT_URI,
  }

  const msalTokenCache = confidentialClientApplication.getTokenCache()
  const cachedAccounts = await msalTokenCache.getAllAccounts()

  let roles

  try {
    await confidentialClientApplication.acquireTokenByCode(authCodeUrlParameters)
    const msalTokenCache = confidentialClientApplication.getTokenCache()
    const cachedAccounts = await msalTokenCache.getAllAccounts()
    roles = cachedAccounts[0].idTokenClaims.roles
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('MSAL Error')
  }

  const hdbToken = await new Promise((resolve) => {
    crypto.randomBytes(12, (error, buffer) => {
      resolve(buffer.toString('hex'))
    })
  })

  const hashedToken = crypto.createHash('md5').update(hdbToken).digest('hex')

  try {
    await hdbCore.requestWithoutAuthentication({
      body: {
        operation: 'insert',
        schema: SCHEMA,
        table: TABLE,
        records: [{ token: hashedToken, roles }],
      },
    })
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('HDB Token Error')
  }

  return response.code(200).send(hdbToken)
}

async function logout(request, response, hdbCore, logger) {
  const { token } = request.query
  const hashedToken = crypto.createHash('md5').update(token).digest('hex')
  try {
    await hdbCore.requestWithoutAuthentication({
      body: {
        operation: 'delete',
        schema: SCHEMA,
        table: TABLE,
        hash_values: [hashedToken],
      },
    })
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('HDB Token Error')
  }

  return response.code(200).send('Logout Successful')
}

async function validate(request, response, next, hdbCore, logging) {
  console.log('hdbCore', hdbCore)
  const { token } = request.query
  const hashedToken = crypto.createHash('md5').update(token).digest('hex')
  try {
    const results = await hdbCore.requestWithoutAuthentication({
      body: {
        operation: 'search_by_hash',
        schema: SCHEMA,
        table: TABLE,
        hash_values: [hashedToken],
        get_attributes: ['roles'],
      },
    })
    if (results.length) {
      console.log('AUTHED!', results[0].roles)
      if (!request.body) {
        request.body = {}
      }
      request.body.hdb_user = { role: { permission: {} } }
      results[0].roles.forEach((role) => {
        const [schema, table, operation] = role.split('.')
        if (!request.body.hdb_user.role.permission[schema]) {
          request.body.hdb_user.role.permission[schema] = { tables: {} }
        }
        if (!request.body.hdb_user.role.permission[schema].tables[table]) {
          request.body.hdb_user.role.permission[schema].tables[table] = {
            read: false,
            insert: false,
            update: false,
            delete: false,
            attribute_permissions: [],
          }
        }
        const permission = PERMISSION_MAP[operation]
        request.body.hdb_user.role.permission[schema].tables[table][permission] = true
        console.log('request.body.hdb_user', request.body.hdb_user.role.permission[schema])
      })
    }
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('HDB Token Error')
  }
}

module.exports = { setup, loginPW, loginMSD, loginSuccess, logout, validate }
