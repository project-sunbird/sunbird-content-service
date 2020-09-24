var express = require('express')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var http = require('http')
var path = require('path')
// var cp = require('child_process')
var TelemetryUtil = require('sb_telemetry_util')
var telemetry = new TelemetryUtil()
var fs = require('fs')
var configUtil = require('sb-config-util')
var _ = require('lodash')
var logger = require('sb_logger_util_v2')
const gracefulShutdown = require('http-graceful-shutdown');

const contentProvider = require('sb_content_provider_util')
var contentMetaProvider = require('./contentMetaFilter')
// TODO below configuration should to be refactored in a seperate file
var logFilePath = path.join(__dirname, './logs/microservice.log')
const contentProviderConfigPath = path.join(__dirname, '/config/contentProviderApiConfig.json')
var contentProviderApiConfig = JSON.parse(fs.readFileSync(contentProviderConfigPath))
const telemtryEventConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/telemetryEventConfig.json')))

var reqDataLimitOfContentUpload = '50mb'

const port = process.env.sunbird_content_service_port ? process.env.sunbird_content_service_port : 5000
const defaultChannel = process.env.sunbird_default_channel || 'sunbird'
const telemetryBaseUrl = process.env.sunbird_telemetry_service_local_url ? process.env.sunbird_telemetry_service_local_url : 'http://telemetry-service:9001/'
globalEkstepProxyBaseUrl = process.env.sunbird_content_plugin_base_url ? process.env.sunbird_content_plugin_base_url : 'https://qa.ekstep.in'

const contentRepoBaseUrl = process.env.sunbird_content_repo_api_base_url || 'https://qa.ekstep.in/api'
const contentRepoApiKey = process.env.sunbird_content_repo_api_key

const contentServiceBaseUrl = process.env.sunbird_contnet_service_base_url || 'http://content-service:9000'
const contentServiceAuthToken = process.env.sunbird_content_service_auth_token

const assessmentServiceBaseUrl = process.env.sunbird_assessment_service_base_url || 'http://assessment-service:9000'

const learnerServiceLocalBaseUrl = process.env.sunbird_learner_service_local_base_url
  ? process.env.sunbird_learner_service_local_base_url
  : 'http://learner-service:9000'

const searchServiceBaseUrl = process.env.sunbird_search_service_api_base_url || 'https://qa.ekstep.in/api/search'
const dialRepoBaseUrl = process.env.sunbird_dial_repo_api_base_url || 'https://qa.ekstep.in/api'
const pluginRepoBaseUrl = process.env.sunbird_plugin_repo_api_base_url || 'https://qa.ekstep.in/api'
const dataServiceBaseUrl = process.env.sunbird_data_service_api_base_url || 'https://qa.ekstep.in/api'
const languageServiceBaseUrl = process.env.sunbird_language_service_api_base_url || 'https://qa.ekstep.in/api/language'

const searchServiceApiKey = process.env.sunbird_search_service_api_key
const dialRepoApiKey = process.env.sunbird_dial_repo_api_key
const pluginRepoApiKey = process.env.sunbird_plugin_repo_api_key
const dataServiceApiKey = process.env.sunbird_data_service_api_key
const logLevel = process.env.sunbird_content_service_log_level || 'info'
const languageServiceApiKey = process.env.sunbird_language_service_api_key

const producerId = process.env.sunbird_environment + '.' + process.env.sunbird_instance + '.content-service'
const sunbirdPortalBaseUrl = process.env.sunbird_portal_base_url || 'https://staging.open-sunbird.org'
const lockExpiryTime = process.env.sunbird_lock_expiry_time || 3600
const isHealthCheckEnabled = process.env.sunbird_health_check_enable || 'true'
const contentServiceLocalBaseUrl = process.env.sunbird_content_service_local_base_url ? process.env.sunbird_content_service_local_base_url : 'http://knowledge-mw-service:5000'
const sunbirdGzipEnable = process.env.sunbird_gzip_enable || 'true'

configUtil.setContentProviderApi(contentProviderApiConfig.API)
configUtil.setConfig('CONTENT_SERVICE_BASE_URL', contentServiceBaseUrl)
configUtil.setConfig('CONTENT_SERVICE_AUTH_TOKEN', contentServiceAuthToken)
configUtil.setConfig('ASSESSMENT_SERVICE_BASE_URL', assessmentServiceBaseUrl)
configUtil.setConfig('CONTENT_REPO_BASE_URL', contentRepoBaseUrl)
configUtil.setConfig('TELEMETRY_BASE_URL', telemetryBaseUrl)
configUtil.setConfig('CONTENT_REPO_AUTHORIZATION_TOKEN', 'Bearer ' + contentRepoApiKey)
configUtil.setConfig('LEARNER_SERVICE_LOCAL_BASE_URL', learnerServiceLocalBaseUrl)
configUtil.setConfig('DIALCODE_GENERATE_MAX_COUNT', 20000)
configUtil.setConfig('CONTENT_UPLOAD_REQ_LIMIT', reqDataLimitOfContentUpload)
configUtil.setConfig('SEARCH_SERVICE_BASE_URL', searchServiceBaseUrl)
configUtil.setConfig('DIAL_REPO_BASE_URL', dialRepoBaseUrl)
configUtil.setConfig('PLUGIN_REPO_BASE_URL', pluginRepoBaseUrl)
configUtil.setConfig('DATA_SERVICE_BASE_URL', dataServiceBaseUrl)
configUtil.setConfig('SEARCH_SERVICE_AUTHORIZATION_TOKEN', 'Bearer ' + searchServiceApiKey)
configUtil.setConfig('DIAL_REPO_AUTHORIZATION_TOKEN', 'Bearer ' + dialRepoApiKey)
configUtil.setConfig('PLUGIN_REPO_AUTHORIZATION_TOKEN', 'Bearer ' + pluginRepoApiKey)
configUtil.setConfig('DATA_SERVICE_AUTHORIZATION_TOKEN', 'Bearer ' + dataServiceApiKey)
configUtil.setConfig('LANGUAGE_SERVICE_BASE_URL', languageServiceBaseUrl)
configUtil.setConfig('LANGUAGE_SERVICE_AUTHORIZATION_TOKEN', 'Bearer ' + languageServiceApiKey)
configUtil.setConfig('SUNBIRD_PORTAL_BASE_URL', sunbirdPortalBaseUrl)
configUtil.setConfig('LOCK_EXPIRY_TIME', lockExpiryTime)
configUtil.setConfig('CONTENT_SERVICE_HEALTH_CHECK_ENABLED', isHealthCheckEnabled)
configUtil.setConfig('LEARNER_SERVICE_HEALTH_STATUS', 'true')
configUtil.setConfig('CASSANDRA_DB_HEALTH_STATUS', 'true')
configUtil.setConfig('EKSTEP_HEALTH_STATUS', 'true')
configUtil.setConfig('CONTENT_SERVICE_LOCAL_BASE_URL', contentServiceLocalBaseUrl)
configUtil.setConfig('ENABLE_GZIP', sunbirdGzipEnable)

process.env.sunbird_cassandra_urls = process.env.sunbird_cassandra_urls || '127.0.0.1'
process.env.dial_code_image_temp_folder = 'temp'

logger.init({
  path: logFilePath,
  logLevel
})

logger.debug({ msg: `logger initialized with LEVEL= ${logLevel}` })

logger.debug({
  msg: 'environment variables',
  env: {
    port,
    defaultChannel,
    telemetryBaseUrl,
    globalEkstepProxyBaseUrl,
    contentRepoBaseUrl,
    learnerServiceLocalBaseUrl,
    searchServiceBaseUrl,
    dialRepoBaseUrl,
    pluginRepoBaseUrl,
    dataServiceBaseUrl,
    languageServiceBaseUrl,
    logLevel,
    logFilePath,
    producerId,
    sunbirdPortalBaseUrl,
    lockExpiryTime,
    isHealthCheckEnabled,
    contentServiceLocalBaseUrl,
    dialCodeImageTempFolder: process.env.dial_code_image_temp_folder
  }
})
var app = express()
const isEkStepProxyRequest = function (req) {
  let url = req.url
  const uploadAPI = configUtil.getConfig('UPLOAD_CONTENT_URI')
  const uploadUrlAPI = configUtil.getConfig('CONTENT_UPLOAD_URL_URI')
  return url && ((url.indexOf(uploadAPI) > -1 && !(url.indexOf(uploadUrlAPI) > -1)) || url.indexOf('/telemetry') > -1)
}

const bodyParserJsonMiddleware = function () {
  return function (req, res, next) {
    if (isEkStepProxyRequest(req)) {
      return next()
    } else {
      return bodyParser.json({
        limit: reqDataLimitOfContentUpload
      })(req, res, next)
    }
  }
}

app.use(bodyParserJsonMiddleware())

app.use(methodOverride())

// Cache-Control, X-Requested-With these two headers required for upload file through fine-upload library
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization,' +
    'cid, user-id, x-auth, Cache-Control, X-Requested-With, *')

  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

require('./routes/healthCheckRoutes')(app)
require('./routes/courseRoutes')(app)
require('./routes/contentRoutes')(app)
require('./routes/conceptRoutes')(app)
require('./routes/searchRoutes')(app)
require('./routes/dialCodeRoutes')(app)
require('./routes/channelRoutes')(app)
require('./routes/frameworkRoutes')(app)
require('./routes/frameworkTermRoutes')(app)
require('./routes/frameworkCategoryInstanceRoutes')(app)
require('./routes/dataExhaustRoutes')(app)
require('./routes/formRoutes')(app)
require('./routes/externalUrlMetaRoute')(app)
require('./routes/pluginsRoutes')(app)
require('./routes/collaborationRoutes')(app)
require('./routes/lockRoutes')(app)
// this middleware route add after all the routes
require('./middlewares/proxy.middleware')(app)

function startServer () {
  this.server = http.createServer(app).listen(port, function () {
    logger.info({ msg: `server running at PORT ${port}` })
    logger.debug({ msg: `server started at ${new Date()}` })
    handleShutDowns();
    if (!process.env.sunbird_environment || !process.env.sunbird_instance) {
      logger.fatal({
        msg: `please set environment variable sunbird_environment, sunbird_instance' +
          'start service Eg: sunbird_environment = dev, sunbird_instance = sunbird`})
      process.exit(1)
    }
    contentMetaProvider.getMetaFilterConfig().then((configStr) => {
      configUtil.setConfig('META_FILTER_REQUEST_JSON', configStr)
    }).catch((err) => {
      logger.fatal({ msg: 'error in getting meta filters', err })
      process.exit(1)
    })
  })
  this.server.keepAliveTimeout = 30000 * 5
}
function handleShutDowns(){
  const cleanup = signal => new Promise(async (resolve, reject) => { // close db connections
    await require('./utils/cassandraUtil').closeCassandraConnection();
    console.log(`Closed db connection after ${signal} signal.`);
    resolve();
  });

  gracefulShutdown(this.server, {
    signals: 'SIGINT SIGTERM',
    timeout: 60 * 1000, // forcefully shutdown if not closed gracefully after 1 min
    onShutdown: cleanup,
    finally: () => console.log('Server gracefully shut down.'),
    development: process.env.sunbird_environment === 'local' ? true : false, // in dev mode skip graceful shutdown 
  });
}
// Create server
configUtil.setConfig('DEFAULT_CHANNEL', 'sunbird')
if (defaultChannel) {
  contentProvider.getChannel(defaultChannel, (err, res) => {
    var defaultHashTagId = _.get(res, 'result.response.content[0].hashTagId')
    if (defaultHashTagId) {
      configUtil.setConfig('DEFAULT_CHANNEL', defaultHashTagId)
    }
    logger.error({ msg: 'Error fetching default channel', err })
    logger.info({ msg: `DEFAULT_CHANNEL ${configUtil.getConfig('DEFAULT_CHANNEL')}` })
    startServer()
  })
} else {
  startServer()
}

// Close server, when we start for test cases
exports.close = function () {
  logger.debug({ msg: `server stopped at ${new Date()}` })
  this.server.close()
}

// Telemetry initialization
const telemetryBatchSize = parseInt(process.env.sunbird_telemetry_sync_batch_size, 10) || 20
telemtryEventConfig.pdata.id = producerId
const telemetryConfig = {
  pdata: telemtryEventConfig.pdata,
  method: 'POST',
  batchsize: telemetryBatchSize,
  endpoint: configUtil.getConfig('TELEMETRY'),
  host: configUtil.getConfig('TELEMETRY_BASE_URL'),
  authtoken: configUtil.getConfig('CONTENT_REPO_AUTHORIZATION_TOKEN')
}

logger.debug({ msg: 'Telemetry is initialized.' })
telemetry.init(telemetryConfig)
process.on('unhandledRejection', (reason, p) => { 
  console.log("Kp-mw Unhandled Rejection", p, reason);
  logger.error({msg:"Kp-mw Unhandled Rejection",  p, reason})
});
process.on('uncaughtException', (err) => {
  console.log("Kp-mw Uncaught Exception", err);
  logger.error({msg:"Kp-mw Uncaught Exception",  err})
  process.exit(1);
});