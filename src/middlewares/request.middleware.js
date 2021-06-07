var async = require('async')
var uuidV1 = require('uuid/v1')
var respUtil = require('response_util')
var messageUtil = require('../service/messageUtil')
var logger = require('sb_logger_util_v2')
var utilsService = require('../service/utilsService')
var contentProvider = require('sb_content_provider_util')
var ApiInterceptor = require('sb_api_interceptor')
var _ = require('underscore')
var reqMsg = messageUtil.REQUEST
var responseCode = messageUtil.RESPONSE_CODE
var apiVersions = messageUtil.API_VERSION
var jwt = require('jsonwebtoken')
var lodash = require('lodash')
var configUtil = require('sb-config-util')
var compression = require('compression')

var keyCloakConfig = {
  'authServerUrl': process.env.sunbird_keycloak_auth_server_url ? process.env.sunbird_keycloak_auth_server_url : 'https://staging.open-sunbird.org/auth',
  'realm': process.env.sunbird_keycloak_realm ? process.env.sunbird_keycloak_realm : 'sunbird',
  'clientId': process.env.sunbird_keycloak_client_id ? process.env.sunbird_keycloak_client_id : 'portal',
  'public': process.env.sunbird_keycloak_public ? process.env.sunbird_keycloak_public : true,
  'realmPublicKey': process.env.sunbird_keycloak_public_key
}
logger.info({ msg: 'keyCloakConfig', keyCloakConfig })

var cacheConfig = {
  store: process.env.sunbird_cache_store ? process.env.sunbird_cache_store : 'memory',
  ttl: process.env.sunbird_cache_ttl ? process.env.sunbird_cache_ttl : 1800
}

var apiInterceptor = new ApiInterceptor(keyCloakConfig, cacheConfig)

/**
 * This function helps to validate the request body and create response body
 * this function works as a middleware which called before each api
 * @param {type} req
 * @param {type} res
 * @param {type} next
 * @returns {unresolved}
 */
function createAndValidateRequestBody (req, res, next) {
  logger.debug({ msg: 'createAndValidateRequestBody() called' }, req)
  req.body.ts = new Date()
  req.body.url = req.url
  req.body.path = req.route.path
  req.body.params = req.body.params ? req.body.params : {}
  req.body.params.msgid = req.get('x-msgid') || req.body.params.msgid || uuidV1()
  req.id = req.body.params.msgid
  var rspObj = {
    apiId: utilsService.getAppIDForRESP(req.body.path),
    path: req.body.path,
    apiVersion: apiVersions.V1,
    msgid: req.body.params.msgid,
    result: {},
    startTime: new Date(),
    method: req.originalMethod,
    did: req.get('x-device-id')
  }

  if (req.get('x-request-id')) {
    rspObj['requestid'] = req.get('x-request-id')
  }

  rspObj.telemetryData = {
    params: utilsService.getParamsDataForLogEvent(rspObj),
    context: utilsService.getTelemetryContextData(req),
    actor: utilsService.getTelemetryActorData(req)
  }
  req.headers.telemetryData = rspObj.telemetryData

  var removedHeaders = ['host', 'origin', 'accept', 'referer', 'content-length', 'user-agent',
    'accept-language', 'accept-charset', 'cookie', 'dnt', 'postman-token', 'cache-control', 'connection']

  removedHeaders.forEach(function (e) {
    delete req.headers[e]
  })

  var requestedData = {
    body: req.body,
    params: req.params,
    query: req.query,
    headers: lodash.omit(req.headers, ['Authorization', 'x-authenticated-user-token'])
  }

  logger.debug({ msg: 'new request', requestData: requestedData }, req)

  req.rspObj = rspObj
  next()
}

/**
 * [validateToken - Used to validate the token and add userid into headers]
 * @param  {[type]}   req
 * @param  {[type]}   res
 * @param  {Function} next
 */
function validateToken (req, res, next) {
  logger.debug({ msg: 'validateToken() called, offline token validation enabled' }, req)
  var token = req.get('x-authenticated-user-token')
  var rspObj = req.rspObj
  if (!token) {
    rspObj.errCode = reqMsg.TOKEN.MISSING_CODE
    rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE
    rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS

    logger.error({
      msg: 'API failed due to missing token',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)

    return res.status(401).send(respUtil.errorResponse(rspObj))
  }

  apiInterceptor.validateToken(token, function (err, tokenData) {
    if (err) {
      rspObj.errCode = reqMsg.TOKEN.INVALID_CODE
      rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE
      rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS
      logger.error({
        msg: 'validateToken token failed, Invalid token',
        err: {
          err: _.get(err, 'message') || err,
          errCode: rspObj.errCode,
          errMsg: rspObj.errMsg,
          responseCode: rspObj.responseCode
        }
      }, req)
      return res.status(401).send(respUtil.errorResponse(rspObj))
    } else {
      var payload = jwt.decode(tokenData.token)
      delete req.headers['x-authenticated-userid']
      var url = req.path
      if (!url.includes('/content/v3/review') &&
        !url.includes('/v1/content/review') &&
        !url.includes('/v1/course/review')) {
        delete req.headers['x-authenticated-user-token']
      }
      req.rspObj.userId = tokenData.userId
      logger.debug({ msg: ` x-authenticated-userid  :- ${tokenData.userId}` })
      rspObj.telemetryData.actor = utilsService.getTelemetryActorData(req)
      var userId = tokenData.userId.split(':')
      req.headers['x-authenticated-userid'] = userId[userId.length - 1]
      req.rspObj.userName = payload.name
      req.rspObj = rspObj
      next()
    }
  })
}

function gzipCompression (req, res, next) {
  return function (req, res, next) {
    if (configUtil.getConfig('ENABLE_GZIP') === 'true') {
      var comMidleware = compression()
      comMidleware(req, res, next)
    } else {
      next()
    }
  }
}
/**
 * [validateUserToken - to validate x-authenticated-user-token]
 * @param  {[type]}   req
 * @param  {[type]}   res
 * @param  {Function} next
 */
function validateUserToken (req, res, next) {
  var token = req.get('x-authenticated-user-token')
  var rspObj = req.rspObj || {}

  if (!token) {
    rspObj.errCode = reqMsg.TOKEN.MISSING_CODE
    rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE
    rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS
    logger.error({
      msg: 'x-authenticated-user-token not present',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)
    return res.status(401).send(respUtil.errorResponse(rspObj))
  }

  apiInterceptor.validateToken(token, function (err, tokenData) {
    if (err) {
      rspObj.errCode = reqMsg.TOKEN.INVALID_CODE
      rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE
      rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS
      logger.error({
        msg: 'validateUserToken token failed, Invalid token',
        err: {
          err,
          errCode: rspObj.errCode,
          errMsg: rspObj.errMsg,
          responseCode: rspObj.responseCode
        },
        additionalInfo: { token }
      }, req)
      return res.status(401).send(respUtil.errorResponse(rspObj))
    } else {
      delete req.headers['x-authenticated-user-token']
      next()
    }
  })
}

/**
 * [apiAccessForCreatorUser - Check api access for creator user]
 * @param  {[type]}   req
 * @param  {[type]}   response
 * @param  {Function} next
 */
function apiAccessForCreatorUser (req, response, next) {
  logger.debug({ msg: 'apiAccessForCreatorUser() called' }, req)
  var userId = req.get('x-authenticated-userid')
  var data = {}
  var rspObj = req.rspObj
  var qs = {
    fields: 'createdBy,collaborators',
    mode: 'edit'
  }
  var contentMessage = messageUtil.CONTENT

  data.contentId = req.params.contentId

  async.waterfall([

    function (CBW) {
      contentProvider.getContentUsingQuery(data.contentId, qs, req.headers,
        function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = res && res.params ? res.params.err : contentMessage.GET.FAILED_CODE
            rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            logger.error({
              msg: 'Getting error from content provider',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              res
            }, req)
            var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
            return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
          } else {
            CBW(null, res)
          }
        })
    },
    function (res) {
      let createdBy = res.result.content.createdBy.split(':')
      if (createdBy[createdBy.length - 1] !== userId && !lodash.includes(res.result.content.collaborators, userId)) {
        rspObj.errCode = reqMsg.TOKEN.INVALID_CODE
        rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE
        rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS
        logger.error({
          msg: 'Content createdBy and userId not matched',
          additionalInfo: { createdBy: res.result.content.createdBy, userId: userId },
          err: {
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          }
        }, req)
        return response.status(401).send(respUtil.errorResponse(rspObj))
      } else {
        next()
      }
    }
  ])
}

/**
 * [apiAccessForReviewerUser - check api access for reviewer user]
 * @param  {[type]}   req
 * @param  {[type]}   response
 * @param  {Function} next
 */
function apiAccessForReviewerUser (req, response, next) {
  logger.debug({ msg: 'apiAccessForReviewerUser() called' }, req)
  var userId = req.get('x-authenticated-userid')
  var data = {}
  var rspObj = req.rspObj
  var qs = {
    fields: 'createdBy,collaborators',
    mode: 'edit'
  }
  var contentMessage = messageUtil.CONTENT

  data.contentId = req.params.contentId

  async.waterfall([

    function (CBW) {
      contentProvider.getContentUsingQuery(data.contentId, qs, req.headers,
        function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = res && res.params ? res.params.err : contentMessage.GET.FAILED_CODE
            rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            logger.error({
              msg: 'getting error from content provider',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { qs }
            }, req)
            var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
            return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
          } else {
            CBW(null, res)
          }
        })
    },
    function (res) {
      if (res.result.content.createdBy === userId || lodash.includes(res.result.content.collaborators, userId)) {
        rspObj.errCode = reqMsg.TOKEN.INVALID_CODE
        rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE
        rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS
        logger.error({
          msg: 'Unauthorized access',
          err: {
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          }
        }, req)
        return response.status(401).send(respUtil.errorResponse(rspObj))
      } else {
        next()
      }
    }
  ])
}

/**
 * [hierarchyUpdateApiAccess - Check api access for hierarchy update
 * @param  {[type]}   req
 * @param  {[type]}   response
 * @param  {Function} next
 */
function hierarchyUpdateApiAccess (req, response, next) {
  logger.debug({ msg: 'hierarchyUpdateApiAccess() called' }, req)
  var userId = req.get('x-authenticated-userid')
  var data = req.body
  var rspObj = req.rspObj
  var qs = {
    fields: 'createdBy,collaborators',
    mode: 'edit'
  }
  var contentMessage = messageUtil.CONTENT

  if (!data.request || !data.request.data || !data.request.data.hierarchy) {
    rspObj.errCode = contentMessage.HIERARCHY_UPDATE.MISSING_CODE
    rspObj.errMsg = contentMessage.HIERARCHY_UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required params are missing',
      additionalInfo: data.request,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var hierarchy = !_.isEmpty(data.request.data.hierarchy)
    ? data.request.data.hierarchy : data.request.data.nodesModified
  data.contentId = _.findKey(hierarchy, function (item) {
    if (item.root === true) return item
  })

  async.waterfall([
    function (CBW) {
      contentProvider.getContentUsingQuery(data.contentId, qs, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : contentMessage.GET.FAILED_CODE
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { qs }
          }, req)

          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      if (res.result.content.createdBy !== userId && !lodash.includes(res.result.content.collaborators, userId)) {
        rspObj.errCode = reqMsg.TOKEN.INVALID_CODE
        rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE
        rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS
        logger.error({
          msg: 'Content createdBy and userId not matched',
          additionalInfo: { createBy: res.result.content.createdBy, userId: userId },
          err: {
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          }
        }, req)
        return response.status(401).send(respUtil.errorResponse(rspObj))
      } else {
        next()
      }
    }
  ])
}

/**
 * [validateChannel - Used to check channel id in request headers.
 * @param  {[type]}   req
 * @param  {[type]}   res
 * @param  {Function} next
 */
function checkChannelID (req, res, next) {
  logger.debug({ msg: 'checkChannelID() called' }, req)
  var channelID = req.get('x-channel-id')
  var rspObj = req.rspObj
  if (!channelID) {
    rspObj.errCode = reqMsg.PARAMS.MISSING_CHANNELID_CODE
    rspObj.errMsg = reqMsg.PARAMS.MISSING_CHANNELID_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'API failed due to missing channelID',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)
    return res.status(400).send(respUtil.errorResponse(rspObj))
  }
  logger.debug({ msg: `channel id = ${channelID}` })
  next()
}

function seteTextbook (req, res, next) {
  if (!_.isEmpty(req.body.request) && !_.isEmpty(req.body.request.content)) {
    req.body.request.content['contentType'] = 'eTextBook'
  }
  console.log('After Set e-Textbook: ' + JSON.stringify(req.body))
  next()
}

// Exports required function
module.exports.validateToken = validateToken
module.exports.createAndValidateRequestBody = createAndValidateRequestBody
module.exports.apiAccessForReviewerUser = apiAccessForReviewerUser
module.exports.apiAccessForCreatorUser = apiAccessForCreatorUser
module.exports.hierarchyUpdateApiAccess = hierarchyUpdateApiAccess
module.exports.checkChannelID = checkChannelID
module.exports.validateUserToken = validateUserToken
module.exports.gzipCompression = gzipCompression
module.exports.seteTextbook = seteTextbook
