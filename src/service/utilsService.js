/**
 * @name : utilsService.js
 * @description :: Responsible for handle utility function
 * @author      :: Anuj Gupta
 */

var API_CONFIG = require('../config/telemetryEventConfig.json').API
var messageUtils = require('../service/messageUtil')
const jwt = require('jsonwebtoken')
var responseCode = messageUtils.RESPONSE_CODE
var _ = require('lodash')
var configUtil = require('sb-config-util')
var PDATA = require('../config/telemetryEventConfig.json').pdata
const uuidV1 = require('uuid/v1')
var logger = require('sb_logger_util_v2')
const LOG_PREFIX = 'KMW'

/**
 * this function helps to create apiId for error and success response
 * @param {String} path
 * @returns {getAppIDForRESP.appId|String}
 */
function getAppIDForRESP (path) {
  var arr = path.split(':')[0].split('/').filter(function (n) {
    return n !== ''
  })
  var appId
  if (arr.length === 1) {
    appId = 'api.' + arr[arr.length - 1]
  } else {
    appId = 'api.' + arr[arr.length - 2] + '.' + arr[arr.length - 1]
  }
  return appId
}

function getLoggerData (rspObj, level, file, method, message, data, stacktrace) {
  var newDataObj = {}
  if (data && data.headers && data.headers.telemetryData) {
    newDataObj = JSON.parse(JSON.stringify(data))
    delete newDataObj.headers['telemetryData']
  } else {
    newDataObj = data
  }
  var dataObj = {
    'eid': 'BE_LOG',
    'did': rspObj.did,
    'ets': Date.now(),
    'ver': '1.0',
    'mid': rspObj.msgid,
    'context': {
      'pdata': {
        'id': rspObj.apiId,
        'ver': rspObj.apiVersion
      }
    },
    'edata': {
      'eks': {
        'level': level,
        'class': file,
        'method': method,
        'message': message,
        'data': newDataObj,
        'stacktrace': stacktrace
      }
    }
  }

  return dataObj
}

function getPerfLoggerData (rspObj, level, file, method, message, data, stacktrace) {
  var dataObj = {
    'eid': 'PERF_LOG',
    'ets': Date.now(),
    'ver': '1.0',
    'mid': rspObj.msgid,
    'context': {
      'pdata': {
        'id': rspObj.apiId,
        'ver': rspObj.apiVersion
      }
    },
    'edata': {
      'eks': {
        'level': level,
        'class': file,
        'method': method,
        'message': message,
        'data': data,
        'stacktrace': stacktrace
      }
    }
  }

  return dataObj
}

/**
 * This function is used to params data for log event
 * @param {*} data
 */
function getParamsDataForLogEvent (data) {
  const url = getApiUrl(data.path)
  const params = [
    {'rid': data.msgid},
    {'title': API_CONFIG[url] && API_CONFIG[url].title},
    {'category': API_CONFIG[url] && API_CONFIG[url].category},
    {'url': url},
    {'method': data.method}
  ]
  return params
}

/**
 * This function is used to get route of a API
 * @param {String} url
 */
function getApiUrl (url) {
  if (!url) {
    return ''
  }
  const uriArray = url.split('/:')
  const uriArray1 = uriArray[0].split('/')
  const mainUrl = uriArray1.splice(2, uriArray1.length)
  return mainUrl.join('/')
}

/**
 * This function is used to get context data for telemetry
 * @param {Object} req
 */
function getTelemetryContextData (req) {
  const url = getApiUrl(req.body.path)
  var context = {
    channel: req.get('X-Channel-Id') || configUtil.getConfig('DEFAULT_CHANNEL'),
    env: API_CONFIG[url] && API_CONFIG[url].env,
    did: req.get('X-Device-ID') || ''
  }
  return context
}

/**
 * This function is used to update context data for telemetry
 * @param {Object} req
 */
function updateContextData (oldData, newData) {
  let contextData = {}
  contextData.channel = newData.channel || oldData.channel
  contextData.env = newData.env || oldData.env
  contextData.cdata = newData.cdata || oldData.cdata
  contextData.rollup = newData.rollup || oldData.rollup
  return JSON.parse(JSON.stringify(contextData))
}

/**
 * This function is used to get actor data for telemetry
 * @param {Object} req
 */
function getTelemetryActorData (req) {
  var actor = {}
  if (req.rspObj && req.rspObj.userId) {
    actor.id = _.toString(req.rspObj.userId)
    actor.type = 'user'
  } else if (req && req['headers'] && req['headers'] && req['headers']['x-authenticated-user-token']) {
    var payload = jwt.decode(req['headers']['x-authenticated-user-token'])
    var userId = payload['sub'].split(':')
    actor.id = userId[userId.length - 1]
    actor.type = 'user'
  } else {
    actor.id = _.toString(req.headers['x-consumer-id'])
    actor.type = req.headers['x-consumer-username']
  }
  if (!actor['id'] || actor['id'] === '') {
    actor.id = _.toString(process.pid)
    actor.type = 'service'
  }

  return actor
}

/**
 * Return object data for telemetry envelop
 */
function getObjectData (id, type, ver, rollup) {
  return {
    id: id,
    type: type,
    ver: ver,
    rollup: rollup
  }
}

/**
 * This function helps to get http status code for response
 * @param {object} res
 */
function getHttpStatus (res) {
  return res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
}

/**
 * This function helps to get error response code
 * @param {object} rspObj
 * @param {object} serverRsp
 * @param {object} msgObject
 */
function getErrorResponse (rspObj, serverRsp, msgObject) {
  rspObj.errCode = _.get(serverRsp, 'params.err') ? serverRsp.params.err
    : (msgObject && msgObject['FAILED_CODE'] ? msgObject['FAILED_CODE'] : null)
  rspObj.errMsg = _.get(serverRsp, 'params.errmsg') ? serverRsp.params.errmsg
    : (msgObject && msgObject['FAILED_MESSAGE'] ? msgObject['FAILED_MESSAGE'] : null)
  rspObj.responseCode = _.get(serverRsp, 'responseCode') ? serverRsp.responseCode : responseCode['SERVER_ERROR']
  return rspObj
}

/**
 * This function helps to log debug info
 * @param {String} api
 * @param {object} rspObj
 * @param {String} logMessage
 * @param {object} objectInfo
 */
function logDebugInfo (api, rspObj, logMessage, objectInfo) {
  var data = {
    'eid': 'LOG',
    'ets': Date.now(),
    'ver': '3.0',
    'mid': `LOG:${uuidV1()}`,
    'context': getContextInfo(),
    'action': {
      'id': api,
      'type': 'API'
    },
    'edata': {
      'type': 'system',
      'level': 'DEBUG',
      'message': logMessage
    }
  }

  if (!_.isEmpty(objectInfo)) {
    data.object = objectInfo
  }
  if (_.get(rspObj, 'telemetryData.params')) {
    data.edata.params = rspObj.telemetryData.params
  }
  if (rspObj.requestid || rspObj.msgid) {
    data.edata.requestid = rspObj.requestid || rspObj.msgid
  }
  logger.debug(data)
}

function logErrorInfo (api, rspObj, error, objectInfo) {
  var data = {
    'eid': 'ERROR',
    'ets': Date.now(),
    'ver': '3.0',
    'mid': `ERROR:${uuidV1()}`,
    'context': getContextInfo(),
    'action': {
      'id': api,
      'type': 'API'
    },
    'edata': {
      'err': `${LOG_PREFIX}_${rspObj.errCode}`,
      'errtype': rspObj.errMsg
    }
  }
  if (!_.isEmpty(objectInfo)) {
    data.object = objectInfo
  }
  if (!_.isEmpty(error)) {
    data.edata.stacktrace = error
  }
  if (rspObj.requestid || rspObj.msgid) {
    data.edata.requestid = rspObj.requestid || rspObj.msgid
  }
  logger.error(data)
}

function getContextInfo () {
  return {
    'channel': 'sunbird-content-service',
    'env': 'knowledge-mw-service',
    'pdata': PDATA
  }
}

module.exports.getLoggerData = getLoggerData
module.exports.getPerfLoggerData = getPerfLoggerData
module.exports.getAppIDForRESP = getAppIDForRESP
module.exports.getParamsDataForLogEvent = getParamsDataForLogEvent
module.exports.getTelemetryContextData = getTelemetryContextData
module.exports.getTelemetryActorData = getTelemetryActorData
module.exports.getObjectData = getObjectData
module.exports.updateContextData = updateContextData
module.exports.getHttpStatus = getHttpStatus
module.exports.getErrorResponse = getErrorResponse
module.exports.logDebugInfo = logDebugInfo
module.exports.logErrorInfo = logErrorInfo
