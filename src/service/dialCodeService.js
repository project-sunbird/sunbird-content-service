/**
 * @name : dialCodeService.js
 * @description :: Responsible for handle dial code service
 * @author      :: Anuj Gupta
 */

var async = require('async')
var _ = require('lodash')
var contentProvider = require('sb_content_provider_util')
var respUtil = require('response_util')
var logger = require('sb_logger_util_v2')
var configUtil = require('sb-config-util')

var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var BatchImageService = require('./dialCode/batchImageService')
var dialCodeServiceHelper = require('./dialCode/dialCodeServiceHelper')
var ImageService = require('./dialCode/imageService.js')
var dialCodeMessage = messageUtils.DIALCODE
var responseCode = messageUtils.RESPONSE_CODE
const SERVICE_PREFIX = 'DLC'

function getBatchImageInstance (req) {
  let defaultConfig = {
    'errorCorrectionLevel': 'H',
    'pixelsPerBlock': 2,
    'qrCodeMargin': 3,
    'textFontName': 'Verdana',
    'textFontSize': 11,
    'textCharacterSpacing': 0.1,
    'imageFormat': 'png',
    'colourModel': 'Grayscale',
    'imageBorderSize': 1
  }
  let config = _.merge(defaultConfig, req.qrCodeSpec)
  let batchImageService = new BatchImageService(config)
  return batchImageService
}

function prepareQRCodeRequestData (dialcodes, config, channel, publisher, contentId, cb) {
  let imageService = new ImageService(config)
  // get dialcodes data from DB
  let tasks = {}
  let data = {}
  let dialCodesMap = []
  if (_.isArray(dialcodes)) {
    for (let index = 0; index < dialcodes.length; index++) {
      const element = dialcodes[index]
      tasks[element] = function (callback) {
        imageService.insertImg(element, channel, publisher, element, callback)
      }
    }
  } else {
    _.forIn(dialcodes, function (index, dialcode) {
      tasks[dialcode] = function (callback) {
        var fileName = index + '_' + dialcode
        imageService.insertImg(dialcode, channel, publisher, fileName, callback)
      }
    })
  }

  async.parallelLimit(tasks, 100, function (err, results) {
    if (err) {
      cb(err)
    } else {
      _.forIn(results, function (fileName, key) {
        let dialData = {
          'data': process.env.sunbird_dial_code_registry_url + key,
          'text': key,
          'id': fileName
        }
        dialCodesMap.push(dialData)
      })
      data['dialcodes'] = dialCodesMap
      data['objectId'] = contentId || channel
      data['config'] = config
      data['storage'] = {
        'container': 'dial'
      }
      data['storage']['path'] = publisher ? (channel + '/' + publisher + '/') : (channel + '/')

      // if content id present then we will send zip file name
      if (contentId) {
        var qs = {
          mode: 'edit',
          fields: 'medium,subject,gradeLevel'
        }
        contentProvider.getContentUsingQuery(contentId, qs, {},
          function (err, res) {
            if (err || res.responseCode !== responseCode.SUCCESS) {
              logger.error({ msg: 'Error while getting content', err, additionalInfo: { contentId, qs } })
              cb(null, data)
            } else {
              let medium = _.get(res, 'result.content.medium')
              let subject = _.get(res, 'result.content.subject')
              let gradeLevel = _.get(res, 'result.content.gradeLevel')
              let fileNameArray = [contentId, medium]
              fileNameArray = _.concat(fileNameArray, gradeLevel)
              fileNameArray.push(subject)
              fileNameArray.push(Date.now())
              fileNameArray = _.compact(fileNameArray)

              let fileName = _.join(fileNameArray, '_')
              fileName = _.lowerCase(fileName)
              fileName = fileName.split(' ').join('_')
              data['storage']['fileName'] = fileName
              cb(null, data)
            }
          })
      } else {
        logger.warn({ msg: 'contentId not present', additionalInfo: { data } })
        cb(null, data)
      }
    }
  })
}
/**
 * This function helps to generate dialcode
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function generateDialCodeAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.dialcodes) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.GENERATE.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.GENERATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required dialcodes missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-generate', rspObj, 'Error due to required dialcodes missing')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (!_.get(data, 'request.dialcodes.count') || !_.isSafeInteger(data.request.dialcodes.count)) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.GENERATE.MISSING_ERR_COUNT}`
    rspObj.errMsg = dialCodeMessage.GENERATE.MISSING_COUNT_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to error in dialcodes count',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-generate', rspObj, 'Error due to required dialcodes missing')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Transform request for Content provider
  var reqData = {
    request: data.request
  }
  var requestedCount = _.clone(_.get(data, 'request.dialcodes.count'))
  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to generate the dial code',
        additionalInfo: {
          body: reqData
        }
      }, req)
      utilsService.logDebugInfo('dialcode-generate', rspObj, 'Request to generate the dial code')
      dialCodeServiceHelper.generateDialcodes(reqData, req.headers, function (err, res) {
        if (err || _.indexOf([responseCode.SUCCESS, responseCode.PARTIAL_SUCCESS], res.responseCode) === -1) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.GENERATE.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.GENERATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error while generating dial code',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { data: reqData }
          }, req)
          utilsService.logErrorInfo('dialcode-generate', rspObj, err)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    }, function (res, CBW) {
      var requestObj = data && data.request && data.request.dialcodes ? data.request.dialcodes : {}
      if (requestObj.qrCodeSpec && !_.isEmpty(requestObj.qrCodeSpec) && res.result.dialcodes &&
        res.result.dialcodes.length) {
        var channel = req.get('x-channel-id')
        var batchImageService = getBatchImageInstance(requestObj)
        prepareQRCodeRequestData(res.result.dialcodes, batchImageService.config,
          channel, requestObj.publisher, null, function (error, data) {
            if (error) {
              res.responseCode = responseCode.PARTIAL_SUCCESS
              logger.error({
                msg: 'Error while preparing QR code Request',
                err: {
                  error,
                  responseCode: res.responseCode
                },
                additionalInfo: { dialCodes: res.result.dialcodes, publisher: requestObj.publisher, channel }
              }, req)
              utilsService.logErrorInfo('dialcode-generate', rspObj, error)
              return response.status(207).send(respUtil.successResponse(res))
            } else {
              batchImageService.createRequest(data, channel, requestObj.publisher, rspObj,
                function (err, processId) {
                  if (err) {
                    res.responseCode = responseCode.PARTIAL_SUCCESS
                    rspObj.errMsg = 'Error while creating QR code request'
                    logger.error({
                      msg: rspObj.errMsg,
                      err: {
                        err,
                        responseCode: res.responseCode
                      },
                      additionalInfo: { data, channel, requestObj, publisher: requestObj.publisher }
                    }, req)
                    utilsService.logErrorInfo('dialcode-generate', rspObj, err)
                    return response.status(207).send(respUtil.successResponse(res))
                  } else {
                    res.result.processId = processId
                    CBW(null, res)
                  }
                })
            }
          })
      } else {
        CBW(null, res)
      }
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'generateDialCodeAPI Result', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-generate', rspObj, 'generateDialCodeAPI Result')
      if (requestedCount > configUtil.getConfig('DIALCODE_GENERATE_MAX_COUNT')) {
        rspObj.responseCode = responseCode.PARTIAL_SUCCESS
        rspObj.errMsg = 'Requested count is more than Max limit of DIAL code generation'
        logger.error({
          msg: rspObj.errMsg,
          err: {
            responseCode: rspObj.responseCode
          },
          additionalInfo:
           { requestedCount, dialCodeGenerateMaxCount: configUtil.getConfig('DIALCODE_GENERATE_MAX_COUNT') }
        }, req)
        utilsService.logErrorInfo('dialcode-generate', rspObj, rspObj.errMsg)
        return response.status(207).send(respUtil.successResponse(rspObj))
      }
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to get list of dialcodes
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function dialCodeListAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  var qrCodeFlag = !!(data && data.request && data.request.search && data.request.search.qrCodeSpec &&
    !_.isEmpty(data.request.search.qrCodeSpec))
  if (qrCodeFlag) {
    var requestObj = data.request.search
    logger.debug({ msg: 'request to get list of dialcodes', additionalInfo: { data: data.request.search } }, req)
    utilsService.logDebugInfo('dialcode-list', rspObj, 'request to get list of dialcodes')
  }

  if (!data.request || !data.request.search) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.LIST.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.LIST.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to missing request || request.search || request.search.publisher'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-list', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (data.request && data.request.search) {
    data.request.search = _.omit(data.request.search, ['qrCodeSpec'])
  }
  // Transform request for Content provider
  var reqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      contentProvider.dialCodeList(reqData, req.headers, function (err, res) {
        if (err || _.indexOf([responseCode.SUCCESS, responseCode.PARTIAL_SUCCESS], res.responseCode) === -1) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.LIST.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.LIST.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error while fetching dial code list',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { reqData }
          }, req)
          utilsService.logErrorInfo('dialcode-list', rspObj, err)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    }, function (res, CBW) {
      if (qrCodeFlag && res.result.dialcodes && res.result.dialcodes.length) {
        var batchImageService = getBatchImageInstance(requestObj)
        var channel = _.clone(req.get('x-channel-id'))
        var dialcodes = _.map(res.result.dialcodes, 'identifier')
        prepareQRCodeRequestData(dialcodes, batchImageService.config,
          channel, requestObj.publisher, null, function (error, data) {
            if (error) {
              res.responseCode = responseCode.PARTIAL_SUCCESS
              rspObj.errMsg = 'Error while preparing QRCode request obj'
              logger.error({
                msg: rspObj.errMsg,
                err: {
                  err: error,
                  responseCode: res.responseCode
                },
                additionalInfo: { channel, dialcodes, publisher: requestObj.publisher }
              }, req)
              utilsService.logErrorInfo('dialcode-list', rspObj, error)
              return response.status(207).send(respUtil.successResponse(res))
            } else {
              batchImageService.createRequest(data, channel, requestObj.publisher, rspObj,
                function (err, processId) {
                  if (err) {
                    res.responseCode = responseCode.PARTIAL_SUCCESS
                    rspObj.errMsg = 'Error while creating image batch request'
                    logger.error({
                      msg: rspObj.errMsg,
                      err: {
                        err,
                        responseCode: res.responseCode
                      }
                    }, req)
                    utilsService.logErrorInfo('dialcode-list', rspObj, err)
                    return response.status(207).send(respUtil.successResponse(res))
                  } else {
                    res.result.processId = processId
                    CBW(null, res)
                  }
                })
            }
          })
      } else {
        CBW(null, res)
      }
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'dialCodeListAPI Results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-list', rspObj, 'dialCodeListAPI Results')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to update dialcode
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function updateDialCodeAPI (req, response) {
  var data = req.body
  data.dialCodeId = req.params.dialCodeId
  var rspObj = req.rspObj
  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.dialCodeId, 'dialcode', '', {})
  }

  if (!data.request || !data.request.dialcode || !data.dialCodeId) {
    rspObj.errCode = dialCodeMessage.UPDATE.MISSING_CODE
    rspObj.errMsg = dialCodeMessage.UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing dialcode',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-update', rspObj, 'Error due to missing dialcode')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Transform request for Ek step
  var reqData = {
    request: data.request
  }
  const objectInfo = {id: _.get(data, 'dialCodeId'), 'type': 'Dialcode'}

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'request to update the dial code', additionalInfo: { body: reqData } }, req)
      utilsService.logDebugInfo('dialcode-update', rspObj, 'request to update the dial code', objectInfo)
      contentProvider.updateDialCode(reqData, data.dialCodeId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : dialCodeMessage.UPDATE.FAILED_CODE
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content Provider while updating the dial code',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { dialCodeId: data.dialCodeId, reqData }
          }, req)
          utilsService.logErrorInfo('dialcode-update', rspObj, err, objectInfo)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'updateDialCodeAPI results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-update', rspObj, 'updateDialCodeAPI results', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to get dialcode meta
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function getDialCodeAPI (req, response) {
  var data = {}
  data.body = req.body
  data.dialCodeId = _.get(req, 'body.request.dialcode.identifier')
  var rspObj = req.rspObj
  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.dialCodeId, 'dialcode', '', {})
  }

  if (!data.dialCodeId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.GET.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.GET.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing dialCode Id',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-read', rspObj, 'Error due to missing dialCode Id')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to get dialcode meta data',
        additionalInfo: {
          dialCodeId: data.dialCodeId,
          qs: data.queryParams
        }
      }, req)
      const objectInfo = {id: _.get(data, 'dialCodeId'), 'type': 'Dialcode'}
      utilsService.logDebugInfo('dialcode-read', rspObj, 'Request to get dialcode meta data', objectInfo)
      contentProvider.getDialCode(data.dialCodeId, req.headers, function (err, res) {
        // After check response, we perform other operation
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.GET.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.GET.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider while fetching dialcode',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { dialCodeId: data.dialCodeId }
          }, req)
          utilsService.logErrorInfo('dialcode-read', rspObj, err, objectInfo)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      const objectInfo = {id: _.get(data, 'dialCodeId'), 'type': 'Dialcode'}
      logger.debug({ msg: 'getDialCodeAPI results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-update', rspObj, 'getDialCodeAPI results', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to check content link api request data
 * @param {type} data
 * @returns {boolean} return response boolean value true or false
 */
function checkContentLinkRequest (data) {
  if (!data.request || !data.request.content || !data.request.content.identifier || !data.request.content.dialcode) {
    return false
  }
  var dialcodesLength = data.request.content.dialcode.length
  var identifiersLength = data.request.content.identifier.length
  if (dialcodesLength < 1 || identifiersLength < 1 || (dialcodesLength > 1 && identifiersLength > 1)) {
    return false
  } else {
    return true
  }
}

/**
 * This function helps to link the content with dialcode
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function contentLinkDialCodeAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!checkContentLinkRequest(data)) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.CONTENT_LINK.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.CONTENT_LINK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'checkContentLinkRequest failed',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-content-link', rspObj, 'checkContentLinkRequest failed')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  // Transform request for content provider
  var reqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to link the content', additionalInfo: { body: reqData } }, req)
      utilsService.logDebugInfo('dialcode-content-link', rspObj, 'Request to link the content')
      contentProvider.contentLinkDialCode(reqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.CONTENT_LINK.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.CONTENT_LINK.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider while linking content with dialCode',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { reqData }
          }, req)
          utilsService.logErrorInfo('dialcode-content-link', rspObj, err)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'contentLinkDialCodeAPI result', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-content-link', rspObj, 'contentLinkDialCodeAPI results')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function used to get the status of the batch dialcodes creation status with process id
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function getProcessIdStatusAPI (req, response) {
  var data = {}
  data.body = req.body
  data.processId = req.params.processId
  var rspObj = req.rspObj
  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.processId, 'dialcode', '', {})
  }

  if (!data.processId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.PROCESS.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.PROCESS.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to required process id missing'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-process-status', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  var batchImageService = new BatchImageService()
  const objectInfo = {id: _.get(data, 'processId'), 'type': 'Dialcode'}
  batchImageService.getStatus(rspObj, req.params.processId).then(process => {
    logger.debug({ msg: 'getProcessIdStatusAPI results',
      additionalInfo: { processID: req.params.processId, data: process.data } }, req)
    utilsService.logDebugInfo('dialcode-process-status', rspObj, 'getProcessIdStatusAPI results', objectInfo)
    return response.status(process.code).send(process.data)
  })
    .catch(err => {
      rspObj.errMsg = 'batchImageService error while getting status'
      logger.error({ msg: rspObj.errMsg, err }, req)
      utilsService.logErrorInfo('dialcode-process-status', rspObj, err, objectInfo)
      var error = JSON.parse(err.message)
      return response.status(error.code).send(error.data)
    })
}

/**
 * This function helps to search dialcode
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function searchDialCodeAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.search) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.SEARCH.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.SEARCH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to required request || request.search is missing'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-search', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Transform request for Content provider
  var reqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'request to search dialCode', additionalInfo: { body: reqData } }, req)
      utilsService.logDebugInfo('dialcode-search', rspObj, 'request to search dialCode')
      contentProvider.searchDialCode(reqData, req.headers, function (err, res) {
        if (err || _.indexOf([responseCode.SUCCESS, responseCode.PARTIAL_SUCCESS], res.responseCode) === -1) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.SEARCH.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.SEARCH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider while searching for a dial code',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { reqData }
          }, req)
          utilsService.logErrorInfo('dialcode-search', rspObj, err)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'searchDialCodeAPI results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-search', rspObj, 'searchDialCodeAPI results')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to publish dialcode
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function publishDialCodeAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  data.dialCodeId = req.params.dialCodeId
  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.dialCodeId, 'dialcode', '', {})
  }

  if (!data.request || !data.dialCodeId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.PUBLISH.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.PUBLISH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing dialCodeId',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-publish', rspObj, 'Error due to missing dialCodeId')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Transform request for Content provider
  var reqData = {
    request: data.request
  }
  const objectInfo = {id: _.get(data, 'dialCodeId'), 'type': 'Dialcode'}

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to publish the dial code', additionalInfo: { body: reqData } }, req)
      utilsService.logDebugInfo('dialcode-publish', rspObj, 'Request to publish the dial code', objectInfo)
      contentProvider.publishDialCode(reqData, data.dialCodeId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.PUBLISH.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.PUBLISH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider while publishing dial code',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { dialCodeId: data.dialCodeId, reqData }
          }, req)
          utilsService.logErrorInfo('dialcode-publish', rspObj, err, objectInfo)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'publishDialCodeAPI results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-publish', rspObj, 'publishDialCodeAPI results', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to create publisher
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function createPublisherAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.publisher || !data.request.publisher.identifier || !data.request.publisher.name) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.CREATE_PUBLISHER.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.CREATE_PUBLISHER.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing publisher info',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-create-publisher', rspObj, 'Error due to missing publisher info')
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Transform request for Content provider
  var reqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to create a publisher ', additionalInfo: { body: reqData } }, req)
      utilsService.logDebugInfo('dialcode-create-publisher', rspObj, 'Request to create a publisher')
      contentProvider.createPublisher(reqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.CREATE_PUBLISHER.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.CREATE_PUBLISHER.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider while creating a publisher',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { reqData }
          }, req)
          utilsService.logErrorInfo('dialcode-create-publisher', rspObj, err)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      // Adding objectData in telemetryData object
      if (rspObj.telemetryData) {
        rspObj.telemetryData.object = utilsService.getObjectData(data.dialCodeId, 'dialcode', '', {})
      }

      logger.debug({ msg: 'createPublisherAPi result', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-create-publisher', rspObj, 'createPublisherAPi result')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to update publisher
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function updatePublisherAPI (req, response) {
  var data = req.body
  data.publisherId = req.params.publisherId
  var rspObj = req.rspObj

  if (!data.request || !data.request.publisher || !data.publisherId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.UPDATE_PUBLISHER.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.UPDATE_PUBLISHER.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to missing publisher details in request'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-update-publisher', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Transform request for Content Provider
  var reqData = {
    request: data.request
  }
  const objectInfo = {id: _.get(data, 'publisherId'), 'type': 'Dialcode'}

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'request to update the publisher', additionalInfo: { body: reqData } }, req)
      utilsService.logDebugInfo('dialcode-update-publisher', rspObj, 'request to update the publisher', objectInfo)
      contentProvider.updatePublisher(reqData, data.publisherId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.UPDATE_PUBLISHER.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.UPDATE_PUBLISHER.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider while updating publisher',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { reqData, publisherId: data.publisherId }
          }, req)
          utilsService.logErrorInfo('dialcode-update-publisher', rspObj, err, objectInfo)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'updatePublisherAPI results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-update-publisher', rspObj, 'updatePublisherAPI results', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This function helps to get publisher metadata
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with http status
 */
function getPublisherAPI (req, response) {
  var data = {}
  data.publisherId = req.params.publisherId
  var rspObj = req.rspObj

  if (!data.publisherId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${dialCodeMessage.GET_PUBLISHER.MISSING_ERR_CODE}`
    rspObj.errMsg = dialCodeMessage.GET_PUBLISHER.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to missing publisher Id'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('dialcode-read-publisher', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      const errorMessage = 'Request to get publisher meta data'
      logger.debug({ msg: errorMessage, additionalInfo: { publisherId: data.publisherId } }, req)
      const objectInfo = {id: _.get(data, 'publisherId'), 'type': 'Dialcode'}
      utilsService.logDebugInfo('dialcode-read-publisher', rspObj, errorMessage, objectInfo)
      contentProvider.getPublisher(data.publisherId, req.headers, function (err, res) {
        // After check response, we perform other operation
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.GET_PUBLISHER.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.GET_PUBLISHER.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider fetching publisher details',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { publisherId: data.publisherId }
          }, req)
          utilsService.logErrorInfo('dialcode-read-publisher', rspObj, err, objectInfo)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'getPublisherAPI results', additionalInfo: { result: rspObj.result } }, req)
      const objectInfo = {id: _.get(data, 'publisherId'), 'type': 'Dialcode'}
      utilsService.logDebugInfo('dialcode-read-publisher', rspObj, 'getPublisherAPI results', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function reserveDialCode (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  const objectInfo = {id: _.get(req.params, 'contentId'), 'type': 'Dialcode'}

  async.waterfall([

    function (CBW) {
      contentProvider.reserveDialcode(req.params.contentId, data, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.RESERVE.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.RESERVE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.CLIENT_ERROR
          logger.error({
            msg: 'Error from content provider fetching while reserving dialCode',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: req.params.contentId, data }
          }, req)
          utilsService.logErrorInfo('dialcode-reserve', rspObj, err, objectInfo)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          if (res && res.result) rspObj.result = res.result
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    }, function (res, CBW) {
      var requestObj = data && data.request && data.request.dialcodes ? data.request.dialcodes : {}
      if (requestObj.qrCodeSpec && !_.isEmpty(requestObj.qrCodeSpec) && res.result.reservedDialcodes &&
        !_.isEmpty(res.result.reservedDialcodes)) {
        var batchImageService = getBatchImageInstance(requestObj)
        var channel = _.clone(req.get('x-channel-id'))
        prepareQRCodeRequestData(res.result.reservedDialcodes, batchImageService.config, channel,
          requestObj.publisher, req.params.contentId, function (error, data) {
            if (error) {
              res.responseCode = responseCode.PARTIAL_SUCCESS
              rspObj.errMsg = 'Error while preparing QRCode request in reserveDialCodeAPI'
              logger.error({
                msg: rspObj.errMsg,
                err: {
                  err: error,
                  responseCode: res.responseCode
                },
                additionalInfo: { reservedDialCode: res.result.reservedDialcodes }
              }, req)
              utilsService.logErrorInfo('dialcode-reserve', rspObj, error, objectInfo)
              return response.status(207).send(respUtil.successResponse(res))
            } else {
              batchImageService.createRequest(data, channel, requestObj.publisher, rspObj,
                function (err, processId) {
                  if (err) {
                    res.responseCode = responseCode.PARTIAL_SUCCESS
                    rspObj.errMsg = 'Error while creating image batch request in reserveDialCodeAPI'
                    logger.error({
                      msg: 'Error while creating image batch request in reserveDialCodeAPI',
                      err: {
                        err,
                        responseCode: res.responseCode
                      },
                      additionalInfo: { data, channel, publisher: requestObj.publisher }
                    }, req)
                    utilsService.logErrorInfo('dialcode-reserve', rspObj, err, objectInfo)
                    return response.status(207).send(respUtil.successResponse(res))
                  } else {
                    res.result.processId = processId
                    CBW(null, res)
                  }
                })
            }
          })
      } else {
        CBW(null, res)
      }
    },
    function (res, CBW) {
      if (_.get(res, 'result.processId') && _.get(res, 'result.versionKey')) {
        var ekStepReqData = {
          'request': {
            'content': {
              'versionKey': _.get(res, 'result.versionKey'),
              'qrCodeProcessId': _.get(res, 'result.processId')
            }
          }
        }
        contentProvider.updateContent(ekStepReqData, req.params.contentId, req.headers, function (err, updateResponse) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = updateResponse && updateResponse.params ? updateResponse.params.err
              : `${SERVICE_PREFIX}_${dialCodeMessage.RESERVE.FAILED_ERR_CODE}`
            rspObj.errMsg = updateResponse && updateResponse.params ? updateResponse.params.errmsg
              : dialCodeMessage.RESERVE.FAILED_MESSAGE
            rspObj.responseCode = updateResponse && updateResponse.responseCode ? updateResponse.responseCode
              : responseCode.SERVER_ERROR
            logger.error({
              msg: 'Error from content provider fetching while updating content',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { contentId: req.params.contentId, ekStepReqData }
            }, req)
            utilsService.logErrorInfo('dialcode-reserve', rspObj, err, objectInfo)
            var httpStatus = updateResponse && updateResponse.statusCode >= 100 &&
             updateResponse.statusCode < 600 ? updateResponse.statusCode : 500
            rspObj.result = res && res.result ? res.result : {}
            rspObj = utilsService.getErrorResponse(rspObj, updateResponse)
            return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
          } else {
            if (_.get(updateResponse, 'result.versionKey')) {
              res['result']['versionKey'] = _.get(updateResponse, 'result.versionKey')
            }
            CBW(null, res)
          }
        })
      } else {
        CBW(null, res)
      }
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'reserveDialCode results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-reserve', rspObj, 'reserveDialCode results', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function releaseDialCode (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  const objectInfo = {id: _.get(req.params, 'contentId'), 'type': 'Dialcode'}

  async.waterfall([

    function (CBW) {
      contentProvider.releaseDialcode(req.params.contentId, data, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err
            : `${SERVICE_PREFIX}_${dialCodeMessage.RELEASE.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : dialCodeMessage.RELEASE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.CLIENT_ERROR
          logger.error({
            msg: 'Error from content provider fetching while releasing dial code',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: req.params.contentId, data }
          }, req)
          utilsService.logErrorInfo('dialcode-release', rspObj, err, objectInfo)
          rspObj.result = res && res.result ? res.result : {}
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'releaseDialCodeAPI results', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('dialcode-release', rspObj, 'releaseDialCodeAPI results', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

module.exports.generateDialCodeAPI = generateDialCodeAPI
module.exports.dialCodeListAPI = dialCodeListAPI
module.exports.updateDialCodeAPI = updateDialCodeAPI
module.exports.getDialCodeAPI = getDialCodeAPI
module.exports.contentLinkDialCodeAPI = contentLinkDialCodeAPI
module.exports.getProcessIdStatusAPI = getProcessIdStatusAPI
module.exports.searchDialCodeAPI = searchDialCodeAPI
module.exports.publishDialCodeAPI = publishDialCodeAPI
module.exports.createPublisherAPI = createPublisherAPI
module.exports.createPublisherAPI = createPublisherAPI
module.exports.getPublisherAPI = getPublisherAPI
module.exports.updatePublisherAPI = updatePublisherAPI
module.exports.reserveDialCode = reserveDialCode
module.exports.releaseDialCode = releaseDialCode
