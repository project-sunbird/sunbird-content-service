/**
 * @file  : frameworkCategoryInstanceService.js
 * @author: Rajath V B
 * @desc  : controller file for handle domain and concepts.
 */

var async = require('async')
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

function getFrameworkCategoryInstance (req, response) {
  var data = {}
  var rspObj = req.rspObj
  data.body = req.body
  data.category = req.params.categoryID
  data.queryParams = req.query
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.category, 'category', '', {})
  }

  if (!data.queryParams) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('getFrameworkCategoryInstance',
      rspObj,
      'Error due to missing request body or query Parameters or categoryId')
    logger.error({
      msg: 'Error due to missing request body or query Parameters or categoryId',
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      utilsService.logDebugInfo('getFrameworkCategoryInstance', rspObj, 'Request to get Framework Category instance')
      logger.debug({ msg: 'Request to get Framework Category instance', additionalInfo: { data } }, req)
      ekStepUtil.getFrameworkCategoryInstance(data.queryParams, data.category, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error while fetching framework category instance from ekstep'
          utilsService.logErrorInfo('getFrameworkCategoryInstance', rspObj, err)
          logger.error({
            msg: 'Error while fetching framework category instance from ekstep',
            err: {
              err,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data}
          }, req)
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

function frameworkCategoryInstanceSearch (req, response) {
  var rspObj = req.rspObj
  var data = req.body
  data.queryParams = req.query
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('frameworkCategoryInstanceSearch',
      rspObj,
      'Error due to missing request body or query params')
    logger.error({
      msg: 'Error due to missing request body or query params',
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([
    function (CBW) {
      utilsService.logDebugInfo('frameworkCategoryInstanceSearch',
        rspObj,
        'Request to search Framework Category instance')
      logger.debug({ msg: 'Request to search Framework Category instance', additionalInfo: { data } }, req)
      ekStepUtil.frameworkCategoryInstanceSearch(ekStepReqData, data.queryParams, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error while searching framework category instance from ekstep'
          utilsService.logErrorInfo('frameworkCategoryInstanceSearch', rspObj, err)
          logger.error({
            msg: 'Error while searching framework category instance from ekstep',
            err: {
              err,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data}
          }, req)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
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

function frameworkCategoryInstanceCreate (req, response) {
  var rspObj = req.rspObj
  var data = req.body
  data.queryParams = req.query
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('frameworkCategoryInstanceCreate',
      rspObj,
      'Error due to missing request body or query params')
    logger.error({
      msg: 'Error due to missing request body or query params',
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([
    function (CBW) {
      utilsService.logDebugInfo('frameworkCategoryInstanceCreate',
        rspObj,
        'Request to create Framework Category instance')
      logger.debug({ msg: 'Request to create Framework Category instance', additionalInfo: { data } }, req)

      ekStepUtil.frameworkCategoryInstanceCreate(ekStepReqData, data.queryParams, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error while creating framework category instance from ekstep'
          utilsService.logErrorInfo('frameworkCategoryInstanceCreate', rspObj, err)
          logger.error({
            msg: 'Error while creating framework category instance from ekstep',
            err: {
              err,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data}
          }, req)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
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

function frameworkCategoryInstanceUpdate (req, response) {
  var rspObj = req.rspObj
  var data = req.body
  data.queryParams = req.query
  data.category = req.params.categoryID
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.category, 'category', '', {})
  }
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('frameworkCategoryInstanceUpdate',
      rspObj,
      'Error due to missing request body or query params or categoryId')
    logger.error({
      msg: 'Error due to missing request body or query params or categoryId',
      err: {responseCode: rspObj.responseCode},
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([
    function (CBW) {
      utilsService.logDebugInfo('frameworkCategoryInstanceUpdate',
        rspObj,
        'Request to update Framework Category instance')
      logger.debug({ msg: 'Request to update Framework Category instance', additionalInfo: { data } }, req)
      ekStepUtil.frameworkCategoryInstanceUpdate(ekStepReqData, data.queryParams, data.category, req.headers,
        function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            rspObj.errMsg = 'Error while updating framework category instance from ekstep'
            utilsService.logErrorInfo('frameworkCategoryInstanceUpdate', rspObj, err)
            logger.error({
              msg: 'Error while updating framework category instance from ekstep',
              err: {
                err,
                responseCode: rspObj.responseCode
              },
              additionalInfo: {data}
            }, req)
            var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
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

module.exports.getFrameworkCategoryInstance = getFrameworkCategoryInstance
module.exports.frameworkCategoryInstanceSearch = frameworkCategoryInstanceSearch
module.exports.frameworkCategoryInstanceCreate = frameworkCategoryInstanceCreate
module.exports.frameworkCategoryInstanceUpdate = frameworkCategoryInstanceUpdate
