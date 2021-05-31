/**
 * @name : lockService.js
 * @description :: Service responsible for locking mechanism
 * @author      :: Sourav Dey
 */

var async = require('async')
var respUtil = require('response_util')
var logger = require('sb_logger_util_v2')
var configUtil = require('sb-config-util')
var request = require('request')

var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var lodash = require('lodash')
var dbModel = require('./../utils/cassandraUtil').getConnections('lock_db')
var Joi = require('joi')

var contentMessage = messageUtils.CONTENT
var responseCode = messageUtils.RESPONSE_CODE
var defaultLockExpiryTime = parseInt(configUtil.getConfig('LOCK_EXPIRY_TIME'))
var contentProvider = require('sb_content_provider_util')

function createLock (req, response) {
  var lockId = dbModel.uuid()
  var newDateObj = createExpiryTime()
  var data = req.body
  var rspObj = req.rspObj
  var contentBody = ''
  var versionKey = ''
  utilsService.logDebugInfo('createLock', rspObj, 'lockService.createLock() called', req)
  if (!req.get('x-device-id')) {
    rspObj.errCode = contentMessage.CREATE_LOCK.FAILED_CODE
    rspObj.errMsg = contentMessage.CREATE_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('createLock', rspObj, 'x-device-id missing')

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (req.get('x-authenticated-userid') !== data.request.createdBy) {
    rspObj.errCode = contentMessage.CREATE_LOCK.FAILED_CODE
    rspObj.errMsg = contentMessage.CREATE_LOCK.UNAUTHORIZED
    rspObj.responseCode = responseCode.CLIENT_ERROR
    let objectInfo = { userId: req.get('x-authenticated-userid'),
      createdBy: data.request.createdBy }
    utilsService.logErrorInfo('createLock', rspObj, 'Unauthorized access', objectInfo)

    return response.status(403).send(respUtil.errorResponse(rspObj))
  }

  if (!data.request) {
    rspObj.errCode = contentMessage.CREATE_LOCK.MISSING_CODE
    rspObj.errMsg = contentMessage.CREATE_LOCK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    let objectInfo = { data }
    utilsService.logErrorInfo('createLock',
      rspObj,
      'Error due to required request is missing',
      objectInfo)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var result = validateCreateLockRequestBody(data.request)
  if (result.error) {
    rspObj.errCode = contentMessage.CREATE_LOCK.MISSING_CODE
    rspObj.errMsg = result.error.details[0].message
    rspObj.responseCode = responseCode.CLIENT_ERROR
    let objectInfo = { requestObj: data.request }
    utilsService.logErrorInfo('createLock',
      rspObj,
      result.error,
      objectInfo)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.request.resourceId, 'contentLock', '', {})
  }
  req.body.request.apiName = 'createLock'

  async.waterfall([
    function (cbw) {
      checkResourceTypeValidation(req, function (res, body) {
        if (!res) {
          rspObj.errCode = contentMessage.CREATE_LOCK.FAILED_CODE
          rspObj.errMsg = body.message
          rspObj.responseCode = responseCode.CLIENT_ERROR
          utilsService.logErrorInfo('createLock', rspObj, 'Error as resource type validation failed')

          return response.status(412).send(respUtil.errorResponse(rspObj))
        }
        contentBody = body
        versionKey = contentBody.contentdata.versionKey
        cbw()
      })
    },
    function (cbw) {
      dbModel.instance.lock.findOne({
        resourceId: data.request.resourceId,
        resourceType: data.request.resourceType
      }, function (error, result) {
        if (error) {
          rspObj.errCode = contentMessage.CREATE_LOCK.FAILED_CODE
          rspObj.errMsg = contentMessage.CREATE_LOCK.FAILED_MESSAGE
          rspObj.responseCode = responseCode.SERVER_ERROR
          let objectInfo = {
            resourceId: data.request.resourceId,
            resourceType: data.request.resourceType
          }
          utilsService.logErrorInfo('createLock',
            rspObj,
            error,
            objectInfo)

          return response.status(500).send(respUtil.errorResponse(rspObj))
        } else if (result) {
          if (req.get('x-authenticated-userid') === result.createdBy &&
            req.get('x-device-id') === result.deviceId &&
            data.request.resourceType === result.resourceType) {
            rspObj.result.lockKey = result.lockId
            rspObj.result.expiresAt = result.expiresAt
            rspObj.result.expiresIn = defaultLockExpiryTime / 60
            rspObj.result.versionKey = versionKey
            return response.status(200).send(respUtil.successResponse(rspObj))
          } else if (req.get('x-authenticated-userid') === result.createdBy) {
            rspObj.errCode = contentMessage.CREATE_LOCK.SELF_LOCKED_CODE
            rspObj.errMsg = contentMessage.CREATE_LOCK.SAME_USER_ERR_MSG
            let objectInfo = { userId: req.get('x-authenticated-userid'), createdBy: result.createdBy }
            utilsService.logErrorInfo('createLock',
              rspObj,
              'Error due to self lock , Resource already locked by user',
              objectInfo)

            var statusCode = 400
          } else {
            rspObj.errCode = contentMessage.CREATE_LOCK.LOCKED_CODE
            statusCode = 423
            try { var user = JSON.parse(result.creatorInfo).name } catch (e) {
              user = 'another user'
            }
            rspObj.errMsg = contentMessage.CREATE_LOCK.ALREADY_LOCKED.replace(/{{Name}}/g,
              user)
            utilsService.logErrorInfo('createLock',
              rspObj,
              `The resource is already locked by ${{ user }}`)
          }
          rspObj.responseCode = responseCode.CLIENT_ERROR
          return response.status(statusCode).send(respUtil.errorResponse(rspObj))
        } else {
          // Below line added for ignore eslint camel case issue.
          /* eslint new-cap: ["error", { "newIsCap": false }] */
          var lockObject = new dbModel.instance.lock({
            lockId: lockId,
            resourceId: data.request.resourceId,
            resourceType: data.request.resourceType,
            resourceInfo: data.request.resourceInfo,
            createdBy: data.request.createdBy,
            creatorInfo: data.request.creatorInfo,
            deviceId: req.get('x-device-id'),
            createdOn: new Date(),
            expiresAt: newDateObj
          })

          lockObject.save({ ttl: defaultLockExpiryTime }, function (err, resp) {
            if (err) {
              rspObj.errCode = contentMessage.CREATE_LOCK.FAILED_CODE
              rspObj.errMsg = contentMessage.CREATE_LOCK.FAILED_MESSAGE
              rspObj.responseCode = responseCode.SERVER_ERROR
              let objectInfo = { lockObject }
              utilsService.logErrorInfo('createLock', rspObj, err, objectInfo)

              return response.status(500).send(respUtil.errorResponse(rspObj))
            } else {
              logger.info({ msg: 'lock successfully saved in db' }, req)
              cbw()
            }
          })
        }
      })
    },
    function (cbw) {
      var ekStepReqData = {
        'request': {
          'content': {
            'lockKey': lockId,
            'versionKey': versionKey
          }
        }
      }
      contentProvider.updateContent(ekStepReqData, data.request.resourceId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.result = res && res.result ? res.result : {}
          let objectInfo = { resourceId: data.request.resourceId, ekStepReqData }
          utilsService.logErrorInfo('updateContent', rspObj, err, objectInfo)
          // Sending success cbw as content is already locked in db and ignoring content update error
          cbw(null, res)
        } else {
          versionKey = lodash.get(res.result.versionKey)
          cbw(null, res)
        }
      })
    },
    function () {
      rspObj.result.lockKey = lockId
      rspObj.result.expiresAt = newDateObj
      rspObj.result.expiresIn = defaultLockExpiryTime / 60
      rspObj.result.versionKey = versionKey
      logger.info({
        msg: 'create lock successful',
        additionalInfo: {
          lockKey: rspObj.result.lockKey,
          expiresAt: rspObj.result.expiresAt,
          expiresIn: rspObj.result.expiresIn,
          versionKey: rspObj.result.versionKey
        }
      }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function refreshLock (req, response) {
  var lockId = ''
  var contentBody = ''
  var newDateObj = createExpiryTime()
  var data = req.body
  var rspObj = req.rspObj
  utilsService.logDebugInfo('refreshLock', rspObj, 'lockService.refreshLock() called', req)

  if (!req.get('x-device-id')) {
    rspObj.errCode = contentMessage.REFRESH_LOCK.FAILED_CODE
    rspObj.errMsg = contentMessage.REFRESH_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('refreshLock',
      rspObj,
      'x-device-id missing')

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (!data.request) {
    rspObj.errCode = contentMessage.REFRESH_LOCK.MISSING_CODE
    rspObj.errMsg = contentMessage.REFRESH_LOCK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    let objectInfo = { data }
    utilsService.logErrorInfo('refreshLock',
      rspObj,
      'Error due to required request are missing',
      objectInfo)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var result = validateRefreshLockRequestBody(data.request)
  if (result.error) {
    rspObj.errCode = contentMessage.REFRESH_LOCK.MISSING_CODE
    rspObj.errMsg = result.error.details[0].message
    rspObj.responseCode = responseCode.CLIENT_ERROR
    let objectInfo = { requestObj: data.request }
    utilsService.logErrorInfo('refreshLock', rspObj, result.error, objectInfo)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.request.resourceId, 'refreshLock', '', {})
  }
  req.body.request.apiName = 'refreshLock'

  async.waterfall([
    function (cbw) {
      checkResourceTypeValidation(req, function (res, body) {
        if (!res) {
          rspObj.errCode = contentMessage.REFRESH_LOCK.FAILED_CODE
          rspObj.errMsg = body.message
          rspObj.responseCode = responseCode.CLIENT_ERROR
          utilsService.logErrorInfo('refreshLock',
            rspObj,
            'Error as resource type validation failed')

          return response.status(412).send(respUtil.errorResponse(rspObj))
        }
        contentBody = body
        cbw()
      })
    },
    function (cbw) {
      if (data.request.lockId !== contentBody.contentdata.lockKey) {
        rspObj.errCode = contentMessage.REFRESH_LOCK.FAILED_CODE
        rspObj.errMsg = contentMessage.REFRESH_LOCK.INVALID_LOCK_KEY
        rspObj.responseCode = responseCode.CLIENT_ERROR
        utilsService.logErrorInfo('refreshLock',
          rspObj,
          'Lock key and request lock key does not match')

        return response.status(422).send(respUtil.errorResponse(rspObj))
      }
      dbModel.instance.lock.findOne({
        resourceId: data.request.resourceId,
        resourceType: data.request.resourceType
      }, function (error, result) {
        if (error) {
          rspObj.errCode = contentMessage.REFRESH_LOCK.FAILED_CODE
          rspObj.errMsg = contentMessage.REFRESH_LOCK.FAILED_MESSAGE
          rspObj.responseCode = responseCode.SERVER_ERROR
          let objectInfo = {
            resourceId: data.request.resourceId,
            resourceType: data.request.resourceType
          }
          utilsService.logErrorInfo('refreshLock', rspObj, error, objectInfo)
          return response.status(500).send(respUtil.errorResponse(rspObj))
        } else if (result) {
          lockId = result.lockId
          if (result.createdBy !== req.get('x-authenticated-userid')) {
            rspObj.errCode = contentMessage.REFRESH_LOCK.FAILED_CODE
            rspObj.errMsg = contentMessage.REFRESH_LOCK.UNAUTHORIZED
            rspObj.responseCode = responseCode.CLIENT_ERROR
            let objectInfo = {
              createdBy: lodash.get(result, 'createdBy'),
              requestedBy: req.get('x-authenticated-userid'),
              result: lodash.toString(result)
            }
            utilsService.logErrorInfo('refreshLock',
              rspObj,
              'Unauthorized to refresh this lock',
              objectInfo)

            return response.status(403).send(respUtil.errorResponse(rspObj))
          }
          var options = { ttl: defaultLockExpiryTime, if_exists: true }
          dbModel.instance.lock.update(
            { resourceId: data.request.resourceId, resourceType: data.request.resourceType },
            {
              lockId: result.lockId,
              resourceInfo: result.resourceInfo,
              createdBy: result.createdBy,
              creatorInfo: result.creatorInfo,
              deviceId: result.deviceId,
              createdOn: result.createdOn,
              expiresAt: newDateObj
            }, options, function (err) {
              if (err) {
                rspObj.errCode = contentMessage.REFRESH_LOCK.FAILED_CODE
                rspObj.errMsg = contentMessage.REFRESH_LOCK.FAILED_MESSAGE
                rspObj.responseCode = responseCode.SERVER_ERROR
                let objectInfo = {
                  resourceInfo: { resourceId: data.request.resourceId, resourceType: data.request.resourceType },
                  lockObject: {
                    lockId: result.lockId,
                    resourceInfo: result.resourceInfo,
                    createdBy: result.createdBy,
                    creatorInfo: result.creatorInfo,
                    deviceId: result.deviceId,
                    createdOn: result.createdOn,
                    expiresAt: newDateObj
                  }
                }
                utilsService.logErrorInfo('refreshLock',
                  rspObj,
                  err,
                  objectInfo)

                return response.status(500).send(respUtil.errorResponse(rspObj))
              }
              cbw()
            })
        } else {
          var requestBody = req.body
          requestBody.request.resourceInfo = JSON.stringify(contentBody.contentdata)
          requestBody.request.createdBy = req.get('x-authenticated-userid')
          requestBody.request.creatorInfo = JSON.stringify({
            'name': req.rspObj.userName,
            'id': req.get('x-authenticated-userid')
          })
          if (contentBody.contentdata.lockKey === data.request.lockId) {
            delete requestBody.request.lockId
            createLock(req, response)
          } else {
            rspObj.errCode = contentMessage.REFRESH_LOCK.FAILED_CODE
            rspObj.errMsg = contentMessage.REFRESH_LOCK.NOT_FOUND_FAILED_MESSAGE
            rspObj.responseCode = responseCode.CLIENT_ERROR
            let objectInfo = { contentLockKey: contentBody.contentdata.lockKey,
              requestLockKey: data.request.lockId,
              resourceInfo: requestBody.request.resourceInfo }
            utilsService.logErrorInfo('createLock',
              rspObj,
              'no data found from db for refreshing lock',
              objectInfo)
            return response.status(400).send(respUtil.errorResponse(rspObj))
          }
        }
      })
    },

    function () {
      rspObj.result.lockKey = lockId
      rspObj.result.expiresAt = newDateObj
      rspObj.result.expiresIn = defaultLockExpiryTime / 60
      logger.info({
        msg: 'refresh lock successful',
        additionalInfo: {
          lockKey: rspObj.result.lockKey,
          expiresAt: rspObj.result.expiresAt,
          expiresIn: rspObj.result.expiresIn
        }
      }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function retireLock (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  utilsService.logDebugInfo('retireLock', rspObj, 'lockService.retireLock() called', req)

  if (!req.get('x-device-id')) {
    rspObj.errCode = contentMessage.RETIRE_LOCK.FAILED_CODE
    rspObj.errMsg = contentMessage.RETIRE_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('retireLock',
      rspObj,
      'x-device-id missing')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (!data.request) {
    rspObj.errCode = contentMessage.RETIRE_LOCK.MISSING_CODE
    rspObj.errMsg = contentMessage.RETIRE_LOCK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    let objectInfo = { data }
    utilsService.logErrorInfo('retireLock',
      rspObj,
      'Error due to required request body are missing',
      objectInfo)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var result = validateCommonRequestBody(data.request)
  if (result.error) {
    rspObj.errCode = contentMessage.RETIRE_LOCK.MISSING_CODE
    rspObj.errMsg = result.error.details[0].message
    rspObj.responseCode = responseCode.CLIENT_ERROR
    let objectInfo = { requestObj: data.request }
    utilsService.logErrorInfo('retireLock',
      rspObj,
      result.error,
      objectInfo)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.request.resourceId, 'retireLock', '', {})
  }
  req.body.request.apiName = 'retireLock'

  async.waterfall([
    function (cbw) {
      checkResourceTypeValidation(req, function (res, body) {
        if (!res) {
          rspObj.errCode = contentMessage.RETIRE_LOCK.FAILED_CODE
          rspObj.errMsg = body.message
          rspObj.responseCode = responseCode.CLIENT_ERROR
          utilsService.logErrorInfo('retireLock',
            rspObj,
            'Error as resource type validation failed',
            req)
          return response.status(412).send(respUtil.errorResponse(rspObj))
        }
        cbw()
      })
    },
    function (cbw) {
      dbModel.instance.lock.findOne({ resourceId: data.request.resourceId },
        { resourceType: data.request.resourceType }, function (error, result) {
          if (error) {
            rspObj.errCode = contentMessage.RETIRE_LOCK.FAILED_CODE
            rspObj.errMsg = contentMessage.RETIRE_LOCK.FAILED_MESSAGE
            rspObj.responseCode = responseCode.SERVER_ERROR
            let objectInfo = { resourceId: data.request.resourceId,
              resourceType: data.request.resourceType }
            utilsService.logErrorInfo('retireLock',
              rspObj,
              error,
              objectInfo)
            return response.status(500).send(respUtil.errorResponse(rspObj))
          } else if (result) {
            if (result.createdBy !== req.get('x-authenticated-userid')) {
              rspObj.errCode = contentMessage.RETIRE_LOCK.FAILED_CODE
              rspObj.errMsg = contentMessage.RETIRE_LOCK.UNAUTHORIZED
              rspObj.responseCode = responseCode.CLIENT_ERROR
              let objectInfo = {
                createdBy: lodash.get(result, 'createdBy'),
                requestedBy: req.get('x-authenticated-userid')
              }
              utilsService.logErrorInfo('retireLock',
                rspObj,
                'Unauthorized to retire lock',
                objectInfo)
              return response.status(403).send(respUtil.errorResponse(rspObj))
            }
            dbModel.instance.lock.delete({ resourceId: data.request.resourceId },
              { resourceType: data.request.resourceType }, function (err) {
                if (err) {
                  rspObj.errCode = contentMessage.RETIRE_LOCK.FAILED_CODE
                  rspObj.errMsg = contentMessage.RETIRE_LOCK.FAILED_MESSAGE
                  rspObj.responseCode = responseCode.SERVER_ERROR
                  let objectInfo = { resourceId: data.request.resourceId, resourceType: data.request.resourceType }
                  utilsService.logErrorInfo('retireLock',
                    rspObj,
                    err,
                    objectInfo)

                  return response.status(500).send(respUtil.errorResponse(rspObj))
                } else cbw()
              })
          } else {
            rspObj.errCode = contentMessage.RETIRE_LOCK.FAILED_CODE
            rspObj.errMsg = contentMessage.RETIRE_LOCK.NOT_FOUND_FAILED_MESSAGE
            rspObj.responseCode = responseCode.CLIENT_ERROR
            let objectInfo = { resourceId: data.request.resourceId,
              resourceType: data.request.resourceType }
            utilsService.logErrorInfo('retireLock',
              rspObj,
              'no data found from db for retiring lock',
              objectInfo)

            return response.status(400).send(respUtil.errorResponse(rspObj))
          }
        })
    },

    function () {
      logger.info({
        msg: 'retire lock successful', additionalInfo: { resourceId: lodash.get(data.request, 'resourceId') }
      }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function listLock (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  utilsService.logDebugInfo('listLock', rspObj, 'lockService.listLock() called', req)

  if (!req.get('x-device-id')) {
    rspObj.errCode = contentMessage.LIST_LOCK.FAILED_CODE
    rspObj.errMsg = contentMessage.LIST_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('listLock',
      rspObj,
      'x-device-id missing',
      req)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData('', 'ListLockAPI', '', {})
  }

  var query = {}
  if (lodash.get(data, 'request.filters.resourceId')) {
    if (typeof data.request.filters === 'string') {
      query = { resourceId: { '$in': [data.request.filters.resourceId] } }
    } else {
      query = { resourceId: { '$in': data.request.filters.resourceId } }
    }
  }

  dbModel.instance.lock.find(query, function (error, result) {
    if (error) {
      rspObj.errCode = contentMessage.LIST_LOCK.FAILED_CODE
      rspObj.errMsg = contentMessage.LIST_LOCK.FAILED_MESSAGE
      rspObj.responseCode = responseCode.SERVER_ERROR
      let objectInfo = { query }
      utilsService.logErrorInfo('listLock',
        rspObj,
        error,
        objectInfo)

      return response.status(500).send(respUtil.errorResponse(rspObj))
    } else {
      rspObj.result.count = result.length
      rspObj.result.data = result
      let objectInfo = { result: rspObj.result }
      utilsService.logDebugInfo('listLock', rspObj, 'list locks API result', objectInfo)

      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  })
}

function validateCreateLockRequestBody (request) {
  var body = lodash.pick(request, ['resourceId', 'resourceType', 'resourceInfo', 'createdBy', 'creatorInfo'])
  var schema = Joi.object().keys({
    resourceId: Joi.string().required(),
    resourceType: Joi.string().required(),
    resourceInfo: Joi.string().required(),
    createdBy: Joi.string().required(),
    creatorInfo: Joi.string().required()
  })
  return Joi.validate(body, schema)
}

function validateRefreshLockRequestBody (request) {
  var body = lodash.pick(request, ['lockId', 'resourceId', 'resourceType'])
  var schema = Joi.object().keys({
    lockId: Joi.string().required(),
    resourceId: Joi.string().required(),
    resourceType: Joi.string().required()
  })
  return Joi.validate(body, schema)
}

function validateCommonRequestBody (request) {
  var body = lodash.pick(request, ['resourceId', 'resourceType'])
  var schema = Joi.object().keys({
    resourceId: Joi.string().required(),
    resourceType: Joi.string().required()
  })
  return Joi.validate(body, schema)
}

function createExpiryTime () {
  var dateObj = new Date()
  dateObj.setTime(new Date().getTime() + (defaultLockExpiryTime * 1000))
  return dateObj
}

function checkResourceTypeValidation (req, cbw) {
  utilsService.logDebugInfo('checkResourceTypeValidation',
    req.rspObj,
    'lockService.checkResourceTypeValidation() called', req)

  switch (lodash.lowerCase(req.body.request.resourceType)) {
  case 'content':
    var httpOptions = {
      url: configUtil.getConfig('CONTENT_SERVICE_LOCAL_BASE_URL') + '/v1/content/getContentLockValidation',
      headers: req.headers,
      method: 'POST',
      body: req.body,
      json: true
    }
    request(httpOptions, function (err, httpResponse, body) {
      if (err) {
        let objectInfo = { httpOpt: lodash.omit(httpOptions, 'headers') }
        utilsService.logErrorInfo('listLock',
          req.rspObj,
          err,
          objectInfo)
        cbw(false, err)
      } else if (lodash.get(body, 'result.message')) {
        cbw(body.result.validation, body.result)
      } else {
        cbw(false, body)
      }
    })
    break
  default:
    cbw(false, 'Resource type is not valid')
  }
}

module.exports = { createLock, refreshLock, retireLock, listLock }
