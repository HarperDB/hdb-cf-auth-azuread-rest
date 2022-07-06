'use strict'

const getHandler = async (request, hdbCore) => {
  request.body = {
    operation: 'search_by_hash',
    schema: `${request.params.schema}`,
    table: `${request.params.table}`,
    hash_values: [`${request.params.id}`],
    get_attributes: ['*'],
    hdb_user: request.body.hdb_user,
  }

  const results = await hdbCore.request(request)
  for (const idx in results) {
    delete results[idx].hdb_user
  }
  return results
}

module.exports = getHandler
