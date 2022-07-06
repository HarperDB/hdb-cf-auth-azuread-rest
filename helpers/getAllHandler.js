'use strict'

const getHandler = (request, hdbCore) => {
  request.body = {
    operation: 'sql',
    sql: `SELECT * FROM \`${request.params.schema}\`.\`${request.params.table}\``,
    hdb_user: request.body.hdb_user,
  }

  return hdbCore.request(request)
}

module.exports = getHandler
