'use strict'

const patchHandler = async (request, hdbCore) => {
  const patch_query_body = Object.assign({}, request.body)
  delete patch_query_body.hdb_user

  const get_table_query = {
    body: {
      operation: 'describe_table',
      schema: `${request.params.schema}`,
      table: `${request.params.table}`,
      hdb_user: request.body.hdb_user,
    },
  }

  // get the table
  const table = await hdbCore.request(get_table_query)

  // initialize and assign variable for the hash_attribute, or primary key
  const hash_attr = table.hash_attribute

  // assign id route param to the request.body's hash_attribute value
  patch_query_body[hash_attr] = request.params.id

  request.body = {
    operation: 'update',
    schema: `${request.params.schema}`,
    table: `${request.params.table}`,
    records: [patch_query_body],
    hdb_user: request.body.hdb_user,
  }

  return hdbCore.request(request)
}

module.exports = patchHandler
