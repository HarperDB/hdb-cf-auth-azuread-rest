'use strict'

const postHandler = (request, hdbCore) => {
  request.body = {
    operation: 'insert',
    schema: `${request.params.schema}`,
    table: `${request.params.table}`,
    records: [request.body],
    hdb_user: request.body.hdb_user,
  }

  return hdbCore.request(request)
}

module.exports = postHandler
