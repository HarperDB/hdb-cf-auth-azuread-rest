'use strict'

const putHandler = async (request, hdbCore) => {
  const put_query_body = Object.assign({}, request.body)
  delete put_query_body.hdb_user

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

  // iterate table to capture attribute names
  for (let i = 0; i < table.attributes.length; i++) {
    const attribute_name = table.attributes[i].attribute

    // skip over these attributes
    if (attribute_name === '__createdtime__' || attribute_name === '__updatedtime__') {
      continue
    }
    // if there's no data in current attribute, assign a null value
    if (put_query_body[attribute_name] === undefined) {
      put_query_body[attribute_name] = null
    }
  }

  // assign id route param to the request.body's hash_attribute value
  put_query_body[hash_attr] = request.params.id

  // send the new record object
  request.body = {
    operation: 'update',
    schema: `${request.params.schema}`,
    table: `${request.params.table}`,
    records: [put_query_body],
    hdb_user: request.body.hdb_user,
  }

  return hdbCore.request(request)
}

module.exports = putHandler
