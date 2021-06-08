/**
 * @file  : frameworkService.js
 * @author: Rajath V B
 * @desc  : controller file for handle domain and concepts.
 */

var async = require('async')
var _ = require('lodash')
var respUtil = require('response_util')
var ekStepUtil = require('sb_content_provider_util')
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var logger = require('sb_logger_util_v2')
var responseCode = messageUtils.RESPONSE_CODE

/**
 * This function helps to get all domain from ekstep
 * @param {Object} req
 * @param {Object} response
 */

function getFrameworkById (req, response) {
  logger.debug({ msg: 'frameworkService.getFrameworkById() called' }, req)
  utilsService.logDebugInfo('framework-read', req.rspObj, 'frameworkService.getFrameworkById() called')
  var data = {}
  var rspObj = req.rspObj
  data.body = req.body
  data.frameworkId = req.params.frameworkId
  var queryString = ''
  if (!_.isEmpty(req.query)) {
    queryString = '?'
    _.forEach(req.query, function (values, key) {
      queryString = queryString + key + '=' + values
    })
  }
  // Adding telemetry object data
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.frameworkId, 'framework', '', {})
  }

  if (!data.frameworkId) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to required framework Id is missing'
    logger.error({ msg: rspObj.errMsg, additionalInfo: { data }, err: { responseCode: rspObj.responseCode } }, req)
    utilsService.logErrorInfo('framework-read', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      const errorMessage = 'Request to fetch framework'
      logger.debug({ msg: errorMessage, additionalInfo: { frameworkId: _.get(data, 'frameworkId') } }, req)
      const objectInfo = {id: _.get(data, 'frameworkId'), 'type': 'Framework'}
      utilsService.logDebugInfo('framework-read', rspObj, errorMessage, objectInfo)
      ekStepUtil.getFrameworkById(data.frameworkId, queryString, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Getting error from ekstep while fetching framework by id'
          const errorObject = { err, responseCode: rspObj.responseCode }
          const additionalInfo = { frameworkId: data.frameworkId, queryString }
          logger.error({ msg: rspObj.errMsg, additionalInfo: additionalInfo, err: errorObject }, req)
          utilsService.logErrorInfo('framework-read', rspObj, err, objectInfo)
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
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function frameworklList (req, response) {
  logger.debug({ msg: 'frameworkService.frameworklList() called' }, req)
  utilsService.logDebugInfo('framework-list', req.rspObj, 'frameworkService.frameworklList() called')
  var rspObj = req.rspObj
  var data = req.body
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to required request body is missing'
    logger.error({ msg: rspObj.errMsg, additionalInfo: { data }, err: { responseCode: rspObj.responseCode } }, req)
    utilsService.logErrorInfo('framework-list', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'request to get framework List' }, req)
      utilsService.logDebugInfo('framework-list', rspObj, 'request to get framework List')
      ekStepUtil.frameworklList(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Getting error from ekstep while fetching frameworkList'
          const errorObject = { err, responseCode: rspObj.responseCode }
          logger.error({ msg: rspObj.errMsg, additionalInfo: { ekStepReqData }, err: errorObject }, req)
          utilsService.logErrorInfo('framework-list', rspObj, err)
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
      logger.debug({ msg: 'framework List', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('framework-list', rspObj, 'framework List')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function frameworkCreate (req, response) {
  const errorMessage = 'frameworkService.frameworkCreate() called'
  logger.debug({ msg: errorMessage }, req)
  utilsService.logDebugInfo('framework-create', req.rspObj, errorMessage)
  var rspObj = req.rspObj
  var data = req.body
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to required request body is missing'
    logger.error({ msg: rspObj.errMsg, additionalInfo: { data }, err: { responseCode: rspObj.responseCode } }, req)
    utilsService.logErrorInfo('framework-create', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'request for new framework creation' }, req)
      utilsService.logDebugInfo('framework-create', rspObj, 'request for new framework creation')
      ekStepUtil.frameworkCreate(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Getting error from ekstep while framework creation'
          const errorObject = { err, responseCode: rspObj.responseCode }
          logger.error({ msg: rspObj.errMsg, additionalInfo: { ekStepReqData }, err: errorObject }, req)
          utilsService.logErrorInfo('framework-create', rspObj, err)
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
      logger.debug({ msg: 'framework created', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('framework-create', rspObj, 'framework created')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function frameworkUpdate (req, response) {
  logger.debug({ msg: 'frameworkService.frameworkUpdate() called' }, req)
  utilsService.logDebugInfo('framework-update', req.rspObj, 'frameworkService.frameworkUpdate() called')
  var rspObj = req.rspObj
  var data = req.body
  data.frameworkId = req.params.frameworkId
  // Adding telemetry object data
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.frameworkId, 'framework', '', {})
  }
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to required request body is missing'
    logger.error({ msg: rspObj.errMsg, additionalInfo: { data }, err: { responseCode: rspObj.responseCode } }, req)
    utilsService.logErrorInfo('framework-update', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      const errorMessage = 'request to update framework'
      logger.debug({ msg: errorMessage, additionalInfo: { frameworkId: _.get(data, 'frameworkId') } }, req)
      const objectInfo = {id: _.get(data, 'frameworkId'), 'type': 'Framework'}
      utilsService.logDebugInfo('framework-update', rspObj, errorMessage, objectInfo)
      ekStepUtil.frameworkUpdate(ekStepReqData, data.frameworkId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Getting error from ekstep while framework update'
          const errorObject = { err, responseCode: rspObj.responseCode }
          const additionalInfo = { frameworkId: data.frameworkId, ekStepReqData }
          logger.error({ msg: rspObj.errMsg, additionalInfo: additionalInfo, err: errorObject }, req)
          utilsService.logErrorInfo('framework-update', rspObj, err, objectInfo)
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
      const objectInfo = {id: _.get(data, 'frameworkId'), 'type': 'Framework'}
      logger.debug({ msg: 'framework updated', additionalInfo: { result: rspObj.result } }, req)
      utilsService.logDebugInfo('framework-update', rspObj, 'framework updated', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function frameworkCopy (req, response) {
  logger.debug({ msg: 'frameworkService.frameworkCopy() called' }, req)
  utilsService.logDebugInfo('framework-copy', req.rspObj, 'frameworkService.frameworkCopy() called')
  var rspObj = req.rspObj
  var data = req.body
  data.frameworkId = req.params.frameworkId
  // Adding telemetry object data
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.frameworkId, 'framework', '', {})
  }
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to required request body is missing'
    logger.error({ msg: rspObj.errMsg, additionalInfo: { data }, err: { responseCode: rspObj.responseCode } }, req)
    utilsService.logErrorInfo('framework-copy', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      const errorMessage = 'request to copy framework'
      logger.debug({ msg: errorMessage, additionalInfo: { frameworkId: _.get(data, 'frameworkId') } }, req)
      const objectInfo = {id: _.get(data, 'frameworkId'), 'type': 'Framework'}
      utilsService.logDebugInfo('framework-copy', rspObj, errorMessage, objectInfo)
      ekStepUtil.frameworkCopy(ekStepReqData, data.frameworkId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Getting error from ekstep while framework copy'
          const additionalInfo = { frameworkId: data.frameworkId, ekStepReqData }
          const errorObject = { err, responseCode: rspObj.responseCode }
          logger.error({ msg: rspObj.errMsg, additionalInfo: additionalInfo, err: errorObject }, req)
          utilsService.logErrorInfo('framework-copy', rspObj, err, objectInfo)
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
      logger.debug({ msg: 'framework copied', additionalInfo: { result: rspObj.result } }, req)
      const objectInfo = {id: _.get(data, 'frameworkId'), 'type': 'Framework'}
      utilsService.logDebugInfo('framework-copy', rspObj, 'framework copied', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function frameworkPublish (req, response) {
  logger.debug({ msg: 'frameworkService.frameworkPublish() called' }, req)
  utilsService.logDebugInfo('framework-publish', req.rspObj, 'frameworkService.frameworkPublish() called')
  var rspObj = req.rspObj
  var data = req.body
  data.frameworkId = req.params.frameworkId
  // Adding telemetry object data
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.frameworkId, 'framework', '', {})
  }
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to required request body is missing'
    logger.error({ msg: rspObj.errMsg, additionalInfo: { data }, err: { responseCode: rspObj.responseCode } }, req)
    utilsService.logErrorInfo('framework-publish', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      const errorMessage = 'request to publish framework'
      logger.debug({ msg: errorMessage, additionalInfo: { frameworkId: _.get(data, 'frameworkId') } }, req)
      const objectInfo = {id: _.get(data, 'frameworkId'), 'type': 'Framework'}
      utilsService.logDebugInfo('framework-publish', rspObj, errorMessage, objectInfo)
      ekStepUtil.frameworkPublish(ekStepReqData, data.frameworkId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Getting error from ekstep while framework publish'
          const errorObject = { err, responseCode: rspObj.responseCode }
          const additionalInfo = { ekStepReqData, frameworkId: data.frameworkId }
          logger.error({ msg: rspObj.errMsg, additionalInfo: additionalInfo, err: errorObject }, req)
          utilsService.logErrorInfo('framework-publish', rspObj, err, objectInfo)
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
      logger.debug({ msg: 'framework published', additionalInfo: { result: rspObj.result } }, req)
      const objectInfo = {id: _.get(data, 'frameworkId'), 'type': 'Framework'}
      utilsService.logDebugInfo('framework-publish', rspObj, 'framework published', objectInfo)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

module.exports.getFrameworkById = getFrameworkById
module.exports.frameworklList = frameworklList
module.exports.frameworkCreate = frameworkCreate
module.exports.frameworkUpdate = frameworkUpdate
module.exports.frameworkCopy = frameworkCopy
module.exports.frameworkPublish = frameworkPublish
