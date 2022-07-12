const crypto = require('crypto')
const bcrypt = require('bcrypt')
const msal = require('@azure/msal-node')

const homedir = require('os').homedir()
const path = require('path')
const fs = require('fs')
const aadConfigFilePath = path.join(homedir, '.aad_config.json')

const SALT_ROUNDS = 5

const MSAL_CONFIG = { auth: {} }
if (fs.existsSync(aadConfigFilePath)) {
  MSAL_CONFIG.auth = JSON.parse(fs.readFileSync(aadConfigFilePath))
} else {
  MSAL_CONFIG.auth = {
    clientId: process.env.AAD_CLIENT_ID,
    authority: process.env.AAD_AUTH_URL,
    clientSecret: process.env.AAD_CLIENT_SECRET,
    redirectUri: process.env.AAD_REDIRECT_URI,
  }
}

const SCHEMA = 'hdb_msal_auth'
const TABLE = 'sessions'

const REDIRECT_URI = MSAL_CONFIG.redirectUri

const PERMISSION_MAP = {
  read: 'read',
  write: 'insert',
}

const addToken = async (hdbCore, roles) => {
  const hdbToken = await new Promise((resolve) => {
    crypto.randomBytes(12, (error, buffer) => {
      resolve(buffer.toString('hex'))
    })
  })

  const hdbTokenUser = await new Promise((resolve) => {
    crypto.randomBytes(6, (error, buffer) => {
      resolve(buffer.toString('hex'))
    })
  })

  const hashedToken = bcrypt.hashSync(hdbToken, SALT_ROUNDS)

  await hdbCore.requestWithoutAuthentication({
    body: {
      operation: 'insert',
      schema: SCHEMA,
      table: TABLE,
      records: [{ user: hdbTokenUser, token: hashedToken, roles }],
    },
  })

  return `${hdbTokenUser}.${hdbToken}`
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
        hash_attribute: 'user',
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

  try {
    const userToken = await addToken(hdbCore, roles)
    return response.code(200).send(userToken)
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('HDB Token Error')
  }
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

  try {
    const userToken = await addToken(hdbCore, roles)
    return response.code(200).send(userToken)
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('HDB Token Error')
  }
}

async function logout(request, response, hdbCore, logger) {
  const userToken = request.headers.authorization
  const [user, token] = userToken.split('.')

  const results = await hdbCore.requestWithoutAuthentication({
    body: {
      operation: 'search_by_hash',
      schema: SCHEMA,
      table: TABLE,
      hash_values: [user],
      get_attributes: ['token'],
    },
  })

  for (const result of results) {
    const hashedToken = result.token
    if (bcrypt.compareSync(token, hashedToken)) {
      await hdbCore.requestWithoutAuthentication({
        body: {
          operation: 'delete',
          schema: SCHEMA,
          table: TABLE,
          hash_values: [user],
        },
      })
    }
  }

  return response.code(200).send('Logout Successful')
}

async function validate(request, response, next, hdbCore, logging) {
  const userToken = request.headers.authorization
  const [user, token] = userToken.split('.')
  try {
    const results = await hdbCore.requestWithoutAuthentication({
      body: {
        operation: 'search_by_hash',
        schema: SCHEMA,
        table: TABLE,
        hash_values: [user],
        get_attributes: ['token', 'roles'],
      },
    })
    if (!results.length) {
      return response.code(401).send('HDB Token Error')
    }

    const { token: hashedToken, roles } = results[0]

    if (!bcrypt.compareSync(token, hashedToken)) {
      return response.code(401).send('HDB Token Error')
    }

    if (!request.body) {
      request.body = {}
    }
    request.body.hdb_user = { role: { permission: {} } }
    console.log('roles', roles)
    roles.forEach((role) => {
      if (role === 'hdb.super_user') {
        request.body.hdb_user.role.permission.super_user = true
        return
      }
      const [type, schema, table, operation] = role.split('.')
      if (type !== 'hdb') return
      // const [schema, table, operation] = role.split('.')
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
    })
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('HDB Token Error')
  }
}

module.exports = { setup, loginPW, loginMSD, loginSuccess, logout, validate }
