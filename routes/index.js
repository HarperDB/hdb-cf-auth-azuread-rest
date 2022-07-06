'use strict'

const msalAuth = require('../helpers/msalAuth')
const getHandler = require('../helpers/getHandler')
const getAllHandler = require('../helpers/getAllHandler')
const postHandler = require('../helpers/postHandler')
const putHandler = require('../helpers/putHandler')
const patchHandler = require('../helpers/patchHandler')
const deleteHandler = require('../helpers/deleteHandler')

module.exports = async (server, { hdbCore, logger }) => {
  server.route({
    url: '/cf-reload',
    method: 'GET',
    handler: async (request) => {
      const response = await hdbCore.requestWithoutAuthentication({
        body: {
          operation: 'restart_service',
          service: 'custom_functions',
        },
      })
      return response
    },
  })

  // AUTHENTICATE - setup
  // Create the auth schema and tables
  server.route({
    url: '/setup',
    method: 'GET',
    handler: (request, response) => msalAuth.setup(request, response, hdbCore, logger),
  })

  // AUTHENTICATE - LOGIN - MS Dialog
  // Create MSAL request, redirect to MS Login
  server.route({
    url: '/login',
    method: 'GET',
    handler: (request, response) => msalAuth.loginMSD(request, response, hdbCore, logger),
  })

  // AUTHENTICATE - LOGIN - Username/Password
  // Create MSAL request, redirect to MS Login
  server.route({
    url: '/login',
    method: 'POST',
    handler: (request, response) => msalAuth.loginPW(request, response, hdbCore, logger),
  })

  // AUTHENTICATE - LOGOUT
  // Remove session
  server.route({
    url: '/logout',
    method: 'GET',
    handler: (request, response) => msalAuth.logout(request, response, hdbCore, logger),
  })

  // AUTHENTICATE - REDIRECT
  // Receive auth code, create hdb session
  server.route({
    url: '/redirect',
    method: 'GET',
    handler: (request, response) => msalAuth.loginSuccess(request, response, hdbCore, logger),
  })

  // GET A DATA RECORD
  server.route({
    url: '/:schema/:table/:id',
    preValidation: (request, response, next) => msalAuth.validate(request, response, next, hdbCore, logger),
    method: 'GET',
    handler: (request) => getHandler(request, hdbCore),
  })

  // GET ALL DATA RECORDS
  server.route({
    url: '/:schema/:table',
    preValidation: (request, response, next) => msalAuth.validate(request, response, next, hdbCore, logger),
    method: 'GET',
    handler: (request) => getAllHandler(request, hdbCore),
  })

  // POST A NEW DATA RECORD
  server.route({
    url: '/:schema/:table',
    preValidation: (request, response, next) => msalAuth.validate(request, response, next, hdbCore, logger),
    method: 'POST',
    handler: (request) => postHandler(request, hdbCore),
  })

  // PUT A DATA RECORD WITH ID ROUTE PARAM
  server.route({
    url: '/:schema/:table/:id',
    preValidation: (request, response, next) => msalAuth.validate(request, response, next, hdbCore, logger),
    method: 'PUT',
    handler: (request) => putHandler(request, hdbCore),
  })

  // PATCH A DATA RECORD WITH ID ROUTE PARAM
  server.route({
    url: '/:schema/:table/:id',
    preValidation: (request, response, next) => msalAuth.validate(request, response, next, hdbCore, logger),
    method: 'PATCH',
    handler: (request) => patchHandler(request, hdbCore),
  })

  // DELETE A DATA RECORD WITH ID ROUTE PARAM
  server.route({
    url: '/:schema/:table/:id',
    preValidation: (request, response, next) => msalAuth.validate(request, response, next, hdbCore, logger),
    method: 'DELETE',
    handler: (request) => deleteHandler(request, hdbCore),
  })
}
