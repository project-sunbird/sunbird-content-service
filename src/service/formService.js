/**
 * @file  : formService.js
 * @author: Harish Kumar Gangula
 * @desc  : controller file for handle  form service.
 */

var async = require('async')
var respUtil = require('response_util')
var contentProvider = require('sb_content_provider_util')
var logger = require('sb_logger_util_v2')
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')

var formMessages = messageUtils.FORM
var responseCode = messageUtils.RESPONSE_CODE
const SERVICE_PREFIX = 'FRM'

/**
 * This controller function helps to get form data
 * @param {object} req
 * @param {object} response
 */
function getForm (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.type || !data.request.subType || !data.request.action) {
    rspObj.errCode = `${SERVICE_PREFIX}_${formMessages.READ.MISSING_ERR_CODE}`
    rspObj.errMsg = formMessages.READ.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to missing request or request type or request subtype or request action'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('form-read', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to get Form data', additionalInfo: { data } }, req)
      utilsService.logDebugInfo('form-read', rspObj, 'Request to content provider to get Form data')
      var key = data.request.type.toLowerCase() + '.' + data.request.subType.toLowerCase() +
        '.' + data.request.action.toLowerCase()
      var requestData = {
        'request': {
          'rootOrgId': data.request.rootOrgId || '*',
          'keys': [key]
        }
      }
      contentProvider.learnerServiceGetForm(requestData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while fetching form data from learner service'
          logger.error({
            msg: rspObj.errMsg,
            err,
            additionalInfo: { requestData }
          }, req)
          utilsService.logErrorInfo('form-read', rspObj, err)
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res, formMessages.READ)
          return response.status(utilsService.getHttpStatus(res)).send(respUtil.errorResponse(rspObj))
        } else {
          var responseData = res
          try {
            var formData = JSON.parse(res.result.tenantPreference[0].data)
            responseData = {
              'result': {
                'form': data.request
              }
            }
            responseData.result.form.data = formData[data.request.framework] || formData['default']
          } catch (error) {
            rspObj.errMsg = 'Error while parsing response data'
            logger.error({ msg: rspObj.errMsg, error }, req)
            utilsService.logErrorInfo('form-read', rspObj, error)
          }

          CBW(null, responseData)
        }
      })
    },
    function (res) {
      rspObj.result = res.result
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * This controller function helps to update form data
 * @param {object} req
 * @param {object} response
 */
function updateForm (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request ||
    !data.request.type ||
    !data.request.subType ||
    !data.request.action ||
    !data.request.data) {
    rspObj.errCode = `${SERVICE_PREFIX}_${formMessages.UPDATE.MISSING_ERR_CODE}`
    rspObj.errMsg = formMessages.UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to missing request or request type or request subtype' +
    ' or request action or request data'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('form-update', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([
    function (CBW) {
      logger.debug({ msg: 'Request to content provider to update Form data', additionalInfo: { data } }, req)
      utilsService.logDebugInfo('form-update', rspObj, 'Request to content provider to update Form data')
      var key = data.request.type.toLowerCase() + '.' + data.request.subType.toLowerCase() +
        '.' + data.request.action.toLowerCase()
      var requestData = {
        'request': {
          'rootOrgId': data.request.rootOrgId || '*',
          'keys': [key]
        }
      }
      contentProvider.learnerServiceGetForm(requestData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while fetching form data from learner service'
          logger.error({
            msg: rspObj.errMsg,
            err,
            additionalInfo: { requestData }
          }, req)
          utilsService.logErrorInfo('form-update', rspObj, err)
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res, formMessages.READ)
          return response.status(utilsService.getHttpStatus(res)).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res.result.tenantPreference)
        }
      })
    },
    function (responseData, CBW) {
      var key = data.request.type.toLowerCase() + '.' + data.request.subType.toLowerCase() +
        '.' + data.request.action.toLowerCase()
      var requestData = {
        'request': {
          'rootOrgId': data.request.rootOrgId || '*',
          'tenantPreference': [
            {
              'key': key,
              'data': {}
            }
          ]
        }
      }
      var formData = {}
      try {
        formData = responseData[0]['data']
          ? JSON.parse(responseData[0]['data']) : {}
        var frameworkKey = data.request.framework || 'default'
        formData[frameworkKey] = data.request.data
      } catch (error) {
        rspObj.errCode = `${SERVICE_PREFIX}_${formMessages.UPDATE.FAILED_ERR_CODE}`
        rspObj.errMsg = formMessages.UPDATE.FAILED_MESSAGE
        rspObj.responseCode = responseCode.CLIENT_ERROR
        logger.error({
          msg: 'Error while parsing response data',
          err: {
            error,
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          }
        }, req)
        utilsService.logErrorInfo('form-update', rspObj, error)
        return response.status(400).send(respUtil.errorResponse(rspObj))
      }

      requestData.request.tenantPreference[0].data = JSON.stringify(formData)
      contentProvider.learnerServiceUpdateForm(requestData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while updating form in learner service'
          logger.error({
            msg: rspObj.errMsg,
            err,
            additionalInfo: { requestData }
          }, req)
          utilsService.logErrorInfo('form-update', rspObj, err)
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res, formMessages.UPDATE)
          return response.status(utilsService.getHttpStatus(res)).send(respUtil.errorResponse(rspObj))
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

/**
 * This controller function helps to create form data
 * @param {object} req
 * @param {object} response
 */
function createForm (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request ||
    !data.request.type ||
    !data.request.subType ||
    !data.request.action ||
    !data.request.data) {
    rspObj.errCode = `${SERVICE_PREFIX}_${formMessages.CREATE.MISSING_ERR_CODE}`
    rspObj.errMsg = formMessages.CREATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    const errorMessage = 'Error due to missing request or request type or ' +
    'request subtype or request action or request data'
    logger.error({
      msg: errorMessage,
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    utilsService.logErrorInfo('form-create', rspObj, errorMessage)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      var key = data.request.type.toLowerCase() + '.' + data.request.subType.toLowerCase() +
        '.' + data.request.action.toLowerCase()
      var requestData = {
        'request': {
          'rootOrgId': data.request.rootOrgId || '*',
          'tenantPreference': [
            {
              'key': key,
              'data': {}
            }
          ]
        }
      }
      var frameworkKey = data.request.framework || 'default'
      requestData.request.tenantPreference[0].data[frameworkKey] = data.request.data
      requestData.request.tenantPreference[0].data = JSON.stringify(requestData.request.tenantPreference[0].data)
      logger.debug({ msg: 'Request to content provider to create form', additionalInfo: { requestData } }, req)
      utilsService.logDebugInfo('form-create', rspObj, 'Request to content provider to create form')
      contentProvider.learnerServiceCreateForm(requestData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.result = res && res.result ? res.result : {}
          rspObj.errMsg = 'Error from content provider while creating form in learner service'
          logger.error({
            msg: rspObj.errMsg,
            err,
            additionalInfo: { requestData }
          }, req)
          utilsService.logErrorInfo('form-create', rspObj, err)
          rspObj = utilsService.getErrorResponse(rspObj, res, formMessages.CREATE)
          return response.status(utilsService.getHttpStatus(res)).send(respUtil.errorResponse(rspObj))
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

module.exports.getFormRequest = getForm
module.exports.updateFormRequest = updateForm
module.exports.createFormRequest = createForm
