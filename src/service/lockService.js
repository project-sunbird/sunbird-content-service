/**
 * @name : lockService.js
 * @description :: Service responsible for locking mechanism
 * @author      :: Sourav Dey
 */

var async = require('async')
var path = require('path')
var respUtil = require('response_util')
var logger = require('sb_logger_util_v2')
var configUtil = require('sb-config-util')
var request = require('request')

var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var lodash = require('lodash')
var dbModel = require('./../utils/cassandraUtil').getConnections('lock_db')
var Joi = require('joi')

var filename = path.basename(__filename)
var contentMessage = messageUtils.CONTENT
var responseCode = messageUtils.RESPONSE_CODE
var defaultLockExpiryTime = parseInt(configUtil.getConfig('LOCK_EXPIRY_TIME'))
var contentProvider = require('sb_content_provider_util')
var configData = require('../config/constants.json')
const SERVICE_PREFIX = `${configData.serviceCode}_LOC`

function createLock (req, response) {
  var lockId = dbModel.uuid()
  var newDateObj = createExpiryTime()
  var data = req.body
  var rspObj = req.rspObj
  var contentBody = ''
  var versionKey = ''
  logger.debug({ msg: 'lockService.createLock() called', additionalInfo: { rspObj } }, req)

  if (!req.get('x-device-id')) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.FAILED_ERR_CODE}`
    rspObj.errMsg = contentMessage.CREATE_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'x-device-id missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (req.get('x-authenticated-userid') !== data.request.createdBy) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.FAILED_ERR_CODE}`
    rspObj.errMsg = contentMessage.CREATE_LOCK.UNAUTHORIZED
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Unauthorized access',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { userId: req.get('x-authenticated-userid'), createdBy: data.request.createdBy }
    }, req)
    return response.status(403).send(respUtil.errorResponse(rspObj))
  }

  if (!data.request) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.CREATE_LOCK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required request is missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var result = validateCreateLockRequestBody(data.request)
  if (result.error) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.MISSING_ERR_CODE}`
    rspObj.errMsg = result.error.details[0].message
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'create lock request body validation failed',
      err: {
        err: result.error,
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { requestObj: data.request }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.request.resourceId, 'contentLock', '', {})
  }
  req.body.request.apiName = 'createLock'

  async.waterfall([
    function (CBW) {
      checkResourceTypeValidation(req, function (res, body) {
        if (!res) {
          rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.FAILED_ERR_CODE}`
          rspObj.errMsg = body.message
          rspObj.responseCode = responseCode.CLIENT_ERROR
          logger.error({
            msg: 'Error as resource type validation failed',
            err: {
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
          }, req)
          return response.status(412).send(respUtil.errorResponse(rspObj))
        }
        contentBody = body
        versionKey = contentBody.contentdata.versionKey
        CBW()
      })
    },
    function (CBW) {
      dbModel.instance.lock.findOne({
        resourceId: data.request.resourceId,
        resourceType: data.request.resourceType
      }, function (error, result) {
        if (error) {
          rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.FAILED_ERR_CODE}`
          rspObj.errMsg = contentMessage.CREATE_LOCK.FAILED_MESSAGE
          rspObj.responseCode = responseCode.SERVER_ERROR
          logger.error({
            msg: 'error while getting data from db',
            err: {
              err: error,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {
              resourceId: data.request.resourceId,
              resourceType: data.request.resourceType
            }
          }, req)
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
            rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.SELF_LOCKED_ERR_CODE}`
            rspObj.errMsg = contentMessage.CREATE_LOCK.SAME_USER_ERR_MSG
            logger.error({
              msg: 'Error due to self lock , Resource already locked by user ',
              err: {
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg
              },
              additionalInfo: { userId: req.get('x-authenticated-userid'), createdBy: result.createdBy }
            }, req)
            var statusCode = 400
          } else {
            rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.LOCKED_ERR_CODE}`
            statusCode = 423
            try { var user = JSON.parse(result.creatorInfo).name } catch (e) {
              user = 'another user'
            }
            rspObj.errMsg = contentMessage.CREATE_LOCK.ALREADY_LOCKED.replace(/{{Name}}/g,
              user)

            logger.error({
              msg: `The resource is already locked by ${{ user }}`,
              err: {
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg
              }
            }, req)
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
              rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE_LOCK.FAILED_ERR_CODE}`
              rspObj.errMsg = contentMessage.CREATE_LOCK.FAILED_MESSAGE
              rspObj.responseCode = responseCode.SERVER_ERROR
              logger.error({
                msg: 'error while saving lock data from db',
                err: {
                  err,
                  errCode: rspObj.errCode,
                  errMsg: rspObj.errMsg,
                  responseCode: rspObj.responseCode
                },
                additionalInfo: { lockObject }
              }, req)
              return response.status(500).send(respUtil.errorResponse(rspObj))
            } else {
              logger.info({ msg: 'lock successfully saved in db' }, req)
              CBW()
            }
          })
        }
      })
    },
    function (CBW) {
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
          logger.error({ msg: 'Updating content failed with lock key', err, additionalInfo: { resourceId: data.request.resourceId, ekStepReqData } }, req)
          // Sending success CBW as content is already locked in db and ignoring content update error
          CBW(null, res)
        } else {
          versionKey = lodash.get(res.result.versionKey)
          CBW(null, res)
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
  logger.debug({ msg: 'lockService.refreshLock() called' }, req)
  var lockId = ''
  var contentBody = ''
  var newDateObj = createExpiryTime()
  var data = req.body
  var rspObj = req.rspObj

  if (!req.get('x-device-id')) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.FAILED_ERR_CODE}`
    rspObj.errMsg = contentMessage.REFRESH_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'x-device-id missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (!data.request) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.REFRESH_LOCK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required request are missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var result = validateRefreshLockRequestBody(data.request)
  if (result.error) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.MISSING_ERR_CODE}`
    rspObj.errMsg = result.error.details[0].message
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error while validating refresh lock request body',
      err: {
        err: result.error,
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { requestObj: data.request }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.request.resourceId, 'refreshLock', '', {})
  }
  req.body.request.apiName = 'refreshLock'

  async.waterfall([
    function (CBW) {
      checkResourceTypeValidation(req, function (res, body) {
        if (!res) {
          rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.FAILED_ERR_CODE}`
          rspObj.errMsg = body.message
          rspObj.responseCode = responseCode.CLIENT_ERROR
          logger.error({
            msg: 'Error as resource type validation failed',
            err: {
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
          }, req)
          return response.status(412).send(respUtil.errorResponse(rspObj))
        }
        contentBody = body
        CBW()
      })
    },
    function (CBW) {
      if (data.request.lockId !== contentBody.contentdata.lockKey) {
        rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.FAILED_ERR_CODE}`
        rspObj.errMsg = contentMessage.REFRESH_LOCK.INVALID_LOCK_KEY
        rspObj.responseCode = responseCode.CLIENT_ERROR
        logger.error({
          msg: 'Lock key and request lock key does not match',
          err: {
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          }
        }, req)
        return response.status(422).send(respUtil.errorResponse(rspObj))
      }
      dbModel.instance.lock.findOne({
        resourceId: data.request.resourceId,
        resourceType: data.request.resourceType
      }, function (error, result) {
        if (error) {
          rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.FAILED_ERR_CODE}`
          rspObj.errMsg = contentMessage.REFRESH_LOCK.FAILED_MESSAGE
          rspObj.responseCode = responseCode.SERVER_ERROR
          logger.error({
            msg: 'error while getting data from db for refreshing lock',
            err: {
              err: error,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {
              resourceId: data.request.resourceId,
              resourceType: data.request.resourceType
            }
          }, req)
          return response.status(500).send(respUtil.errorResponse(rspObj))
        } else if (result) {
          lockId = result.lockId
          if (result.createdBy !== req.get('x-authenticated-userid')) {
            rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.FAILED_ERR_CODE}`
            rspObj.errMsg = contentMessage.REFRESH_LOCK.UNAUTHORIZED
            rspObj.responseCode = responseCode.CLIENT_ERROR
            logger.error({
              msg: 'Unauthorized to refresh this lock',
              err: {
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: {
                createdBy: lodash.get(result, 'createdBy'),
                requestedBy: req.get('x-authenticated-userid'),
                result: lodash.toString(result)
              }
            }, req)
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
                rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.FAILED_ERR_CODE}`
                rspObj.errMsg = contentMessage.REFRESH_LOCK.FAILED_MESSAGE
                rspObj.responseCode = responseCode.SERVER_ERROR
                logger.error({
                  msg: 'error while updating lock data from db',
                  err: {
                    err,
                    errCode: rspObj.errCode,
                    errMsg: rspObj.errMsg,
                    responseCode: rspObj.responseCode
                  },
                  additionalInfo: {
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
                }, req)
                return response.status(500).send(respUtil.errorResponse(rspObj))
              }
              CBW()
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
            rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REFRESH_LOCK.FAILED_ERR_CODE}`
            rspObj.errMsg = contentMessage.REFRESH_LOCK.NOT_FOUND_FAILED_MESSAGE
            rspObj.responseCode = responseCode.CLIENT_ERROR
            logger.error({
              msg: 'no data found from db for refreshing lock',
              err: {
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { contentLockKey: contentBody.contentdata.lockKey, requestLockKey: data.request.lockId, resourceInfo: requestBody.request.resourceInfo }
            }, req)
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
  logger.debug({ msg: 'lockService.retireLock() called' }, req)
  var data = req.body
  var rspObj = req.rspObj

  if (!req.get('x-device-id')) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.FAILED_ERR_CODE}`
    rspObj.errMsg = contentMessage.RETIRE_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'x-device-id missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (!data.request) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.RETIRE_LOCK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required request body are missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var result = validateCommonRequestBody(data.request)
  if (result.error) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.MISSING_ERR_CODE}`
    rspObj.errMsg = result.error.details[0].message
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to lock retire fields are missing',
      err: {
        err: result.error,
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { requestObj: data.request }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.request.resourceId, 'retireLock', '', {})
  }
  req.body.request.apiName = 'retireLock'

  async.waterfall([
    function (CBW) {
      checkResourceTypeValidation(req, function (res, body) {
        if (!res) {
          rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.FAILED_ERR_CODE}`
          rspObj.errMsg = body.message
          rspObj.responseCode = responseCode.CLIENT_ERROR
          logger.error({
            msg: 'Error as resource type validation failed',
            err: {
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
          }, req)
          return response.status(412).send(respUtil.errorResponse(rspObj))
        }
        CBW()
      })
    },
    function (CBW) {
      dbModel.instance.lock.findOne({ resourceId: data.request.resourceId },
        { resourceType: data.request.resourceType }, function (error, result) {
          if (error) {
            rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.FAILED_ERR_CODE}`
            rspObj.errMsg = contentMessage.RETIRE_LOCK.FAILED_MESSAGE
            rspObj.responseCode = responseCode.SERVER_ERROR
            logger.error({
              msg: 'error while getting data from db for retiring lock',
              err: {
                err: error,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { resourceId: data.request.resourceId, resourceType: data.request.resourceType }
            }, req)
            return response.status(500).send(respUtil.errorResponse(rspObj))
          } else if (result) {
            if (result.createdBy !== req.get('x-authenticated-userid')) {
              rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.FAILED_ERR_CODE}`
              rspObj.errMsg = contentMessage.RETIRE_LOCK.UNAUTHORIZED
              rspObj.responseCode = responseCode.CLIENT_ERROR
              logger.error({
                msg: 'Unauthorized to retire lock',
                err: {
                  errCode: rspObj.errCode,
                  errMsg: rspObj.errMsg,
                  responseCode: rspObj.responseCode
                },
                additionalInfo: {
                  createdBy: lodash.get(result, 'createdBy'),
                  requestedBy: req.get('x-authenticated-userid')
                }
              }, req)
              return response.status(403).send(respUtil.errorResponse(rspObj))
            }
            dbModel.instance.lock.delete({ resourceId: data.request.resourceId },
              { resourceType: data.request.resourceType }, function (err) {
                if (err) {
                  rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.FAILED_ERR_CODE}`
                  rspObj.errMsg = contentMessage.RETIRE_LOCK.FAILED_MESSAGE
                  rspObj.responseCode = responseCode.SERVER_ERROR
                  logger.error({
                    msg: 'error while deleting lock data from db',
                    err: {
                      err,
                      errCode: rspObj.errCode,
                      errMsg: rspObj.errMsg,
                      responseCode: rspObj.responseCode
                    },
                    additionalInfo: { resourceId: data.request.resourceId, resourceType: data.request.resourceType }
                  }, req)
                  return response.status(500).send(respUtil.errorResponse(rspObj))
                } else CBW()
              })
          } else {
            rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE_LOCK.FAILED_ERR_CODE}`
            rspObj.errMsg = contentMessage.RETIRE_LOCK.NOT_FOUND_FAILED_MESSAGE
            rspObj.responseCode = responseCode.CLIENT_ERROR
            logger.error({
              msg: 'no data found from db for retiring lock',
              err: {
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { resourceId: data.request.resourceId, resourceType: data.request.resourceType }
            }, req)
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
  logger.debug({ msg: 'lockService.listLock() called' }, req)
  var data = req.body
  var rspObj = req.rspObj

  if (!req.get('x-device-id')) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.LIST_LOCK.FAILED_ERR_CODE}`
    rspObj.errMsg = contentMessage.LIST_LOCK.DEVICE_ID_MISSING
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'x-device-id missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      }
    }, req)
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
      rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.LIST_LOCK.FAILED_ERR_CODE}`
      rspObj.errMsg = contentMessage.LIST_LOCK.FAILED_MESSAGE
      rspObj.responseCode = responseCode.SERVER_ERROR
      logger.error({
        msg: 'error while fetching lock list data from db',
        err: {
          err: error,
          errCode: rspObj.errCode,
          errMsg: rspObj.errMsg,
          responseCode: rspObj.responseCode
        },
        additionalInfo: { query }
      }, req)
      return response.status(500).send(respUtil.errorResponse(rspObj))
    } else {
      rspObj.result.count = result.length
      rspObj.result.data = result
      logger.debug({ msg: 'list locks API result ', additionalInfo: { result: rspObj.result } }, req)
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

function checkResourceTypeValidation (req, CBW) {
  logger.debug({ msg: 'lockService.checkResourceTypeValidation() called' }, req)
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
        logger.error({ msg: 'error in lock service in checkResourceTypeValidation', additionalInfo: { httpOpt: lodash.omit(httpOptions, 'headers') }, err })
        CBW(false, err)
      } else if (lodash.get(body, 'result.message')) {
        CBW(body.result.validation, body.result)
      } else {
        CBW(false, body)
      }
    })
    break
  default:
    CBW(false, 'Resource type is not valid')
  }
}

module.exports = { createLock, refreshLock, retireLock, listLock }
