var cassandra = require('express-cassandra')
var _ = require('lodash')
var contactPoints = process.env.sunbird_cassandra_urls.split(',')
var cassandraDriver = require('cassandra-driver')
var consistency = getConsistencyLevel(process.env.sunbird_cassandra_consistency_level)
var envReplicationStrategy = process.env.sunbird_cassandra_replication_strategy ||
  '{"class":"SimpleStrategy","replication_factor":1}'
var replicationStrategy = getReplicationStrategy(envReplicationStrategy)

var keyspaceConfig = [{
  'name': 'dialcodes',
  'schemaPath': require('./../models/cassandra/dialcodes')
}, {
  'name': 'lock_db',
  'schemaPath': require('./../models/cassandra/lock')
}]

var connection = {}
var connectionCount = 0;
_.forEach(keyspaceConfig, config => {
  var models = cassandra.createClient({
    clientOptions: {
      contactPoints: contactPoints,
      keyspace: config.name,
      queryOptions: { consistency: consistency }
    },
    ormOptions: {
      defaultReplicationStrategy: replicationStrategy,
      migration: 'safe'
    }
  })

  _.forEach(config.schemaPath, schema => {
    models.loadSchema(schema.table_name, schema)
    models.instance[schema.table_name].syncDB((err, result) => {
      if (err) {
        console.log('sync failed for keyspace and table', schema.table_name)
      }
    })
    if(!connection[config.name]){ // to avoid duplicate connection
      connectionCount++;
    }
    connection[config.name] = models
  })
})

function getConnections(keyspace) {
  return connection[keyspace]
}

function checkCassandraDBHealth(callback) {
  const client = new cassandraDriver.Client({ contactPoints: contactPoints })
  client.connect()
    .then(function () {
      client.shutdown()
      callback(null, true)
    })
    .catch(function (err) {
      console.log('cassandra err:', err)
      client.shutdown()
      callback(err, false)
    })
}

function getConsistencyLevel(consistency) {
  let consistencyValue = consistency && _.get(cassandra, `consistencies.${consistency}`)
    ? _.get(cassandra, `consistencies.${consistency}`) : cassandra.consistencies.one
  return consistencyValue
}

function getReplicationStrategy(replicationstrategy) {
  try {
    return JSON.parse(replicationstrategy)
  } catch (e) {
    console.log('err in getReplicationStrategy', e)
    return { 'class': 'SimpleStrategy', 'replication_factor': 1 }
  }
}
function closeCassandraConnection() {
  console.log("connection to be closed", connectionCount);
  if (!connectionCount) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    _.forIn(connection, (connection, keySpace) => {
      connection.close((err) => {
        if (err) {
          console.error('error while closing cassandra connection', err);
        }
        connectionCount--;
        console.log("closed connection for keySpace:", keySpace, connectionCount);
        if (!connectionCount) {
          resolve();
        }
      })
    });
  });

  return Promise.resolve();
}
module.exports = { getConnections, checkCassandraDBHealth, closeCassandraConnection }
