/**
 * @file  : frameworkTermService.js
 * @author: Rajath V B
 * @desc  : controller file for handle domain and concepts.
 */

var async = require('async')
var respUtil = require('response_util')
var ekStepUtil = require('sb_content_provider_util')
var logger = require('sb_logger_util_v2')
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')

var responseCode = messageUtils.RESPONSE_CODE

/**
 * This function helps to get all domain from ekstep
 * @param {Object} req
 * @param {Object} response
 */

function getFrameworkTerm (req, response) {
  var data = {}
  var rspObj = req.rspObj

  data.body = req.body
  data.category = req.params.categoryID
  data.queryParams = req.query
  // Adding telemetry object data
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.category, 'frameworkTerm', '', {})
  }

  if (!data.queryParams) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to missing query Parameters'
    logger.error({
      msg: rspObj.errMsg,
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('framework-term-read', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to get Framework Terms', additionalInfo: { data } }, req)
      utilsService.logDebugInfo('framework-term-read', rspObj, 'Request to get Framework Terms')
      ekStepUtil.getFrameworkTerm(data.queryParams, data.category, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error while fetching framework terms from ekstep'
          logger.error({
            msg: rspObj.errMsg,
            err: {
              err,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data}
          }, req)
          utilsService.logErrorInfo('framework-term-read', rspObj, err)
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

function frameworkTermSearch (req, response) {
  var rspObj = req.rspObj
  var data = req.body
  data.queryParams = req.query
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to missing query Parameters or request body'
    logger.error({
      msg: rspObj.errMsg,
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('framework-term-search', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to search Framework Terms', additionalInfo: { data } }, req)
      utilsService.logDebugInfo('framework-term-search', rspObj, 'Request to search Framework Terms')
      ekStepUtil.frameworkTermSearch(ekStepReqData, data.queryParams, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error while searching framework terms from ekstep'
          logger.error({
            msg: rspObj.errMsg,
            err: {
              err,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data}
          }, req)
          utilsService.logErrorInfo('framework-term-search', rspObj, err)
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

function frameworkTermCreate (req, response) {
  var rspObj = req.rspObj
  var data = req.body
  data.queryParams = req.query
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to missing query Parameters or request body'
    logger.error({
      msg: rspObj.errMsg,
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('framework-term-create', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to create Framework Terms', additionalInfo: { data } }, req)
      utilsService.logDebugInfo('framework-term-create', rspObj, 'Request to create Framework Terms')
      ekStepUtil.frameworkTermCreate(ekStepReqData, data.queryParams, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error while creating framework terms from ekstep'
          logger.error({
            msg: rspObj.errMsg,
            err: {
              err,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data}
          }, req)
          utilsService.logErrorInfo('framework-term-create', rspObj, err)
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

function frameworkTermUpdate (req, response) {
  var rspObj = req.rspObj
  var data = req.body
  data.queryParams = req.query
  data.category = req.params.categoryID
  // Adding telemetry object data
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.category, 'frameworkTerm', '', {})
  }

  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Error due to missing query Parameters or request body'
    logger.error({
      msg: rspObj.errMsg,
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('framework-term-update', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to update Framework Terms', additionalInfo: { data } }, req)
      utilsService.logDebugInfo('framework-term-update', rspObj, 'Request to update Framework Terms')
      ekStepUtil.frameworkTermUpdate(ekStepReqData, data.queryParams, data.category, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error while updating framework terms from ekstep'
          logger.error({
            msg: rspObj.errMsg,
            err: {
              err,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data}
          }, req)
          utilsService.logErrorInfo('framework-term-update', rspObj, err)
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

module.exports.getFrameworkTerm = getFrameworkTerm
module.exports.frameworkTermSearch = frameworkTermSearch
module.exports.frameworkTermCreate = frameworkTermCreate
module.exports.frameworkTermUpdate = frameworkTermUpdate
