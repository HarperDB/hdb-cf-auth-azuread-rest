'use strict'

const deleteHandler = (request, hdbCore) => {
  request.body = {
    operation: 'delete',
    schema: `${request.params.schema}`,
    table: `${request.params.table}`,
    hash_values: [`${request.params.id}`],
    hdb_user: request.body.hdb_user,
  }

  return hdbCore.request(request)
}

module.exports = deleteHandler
