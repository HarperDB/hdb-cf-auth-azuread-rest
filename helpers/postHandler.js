'use strict'

const postHandler = (request, hdbCore) => {
  const records = Object.assign({}, request.body)
  delete records.hdb_user
  request.body = {
    operation: 'insert',
    schema: `${request.params.schema}`,
    table: `${request.params.table}`,
    records: [records],
    hdb_user: request.body.hdb_user,
  }

  return hdbCore.request(request)
}

module.exports = postHandler
