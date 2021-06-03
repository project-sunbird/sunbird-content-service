/**
 * To provide external url related helper methods
 */
const urlMetadata = require('url-metadata')
var messageUtils = require('./messageUtil')
var extUrlMessage = messageUtils.EXTERNAL_URL_META
var path = require('path')
var filename = path.basename(__filename)
var responseCode = messageUtils.RESPONSE_CODE
var respUtil = require('response_util')
var utilsService = require('../service/utilsService')
var logger = require('sb_logger_util_v2')
var configData = require('../config/constants.json')
const SERVICE_PREFIX = `${configData.serviceCode}_URL`

function fetchUrlMetaAPI (req, response) {
  return fetchUrlMeta(req, response)
}

function fetchUrlMeta (req, response) {
  var data = req.body.request
  var rspObj = {}
  if (!data['url']) {
    rspObj.errCode = `${SERVICE_PREFIX}_${extUrlMessage.FETCH.MISSING_ERR_CODE}`
    rspObj.errMsg = extUrlMessage.FETCH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing url property in request',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // using 'url-metadata'module fetch meta data of given web link and return response
  urlMetadata(data.url).then(
    function (metadata) {
      rspObj.result = metadata
      return response.status(200).send(respUtil.successResponse(rspObj))
    },
    function (error) {
      rspObj.errCode = error.code || `${SERVICE_PREFIX}_${extUrlMessage.FETCH.FAILED_ERR_CODE}`
      rspObj.errMsg = extUrlMessage.FETCH.FAILED_MESSAGE
      rspObj.responseCode = responseCode.INTERNAL_SERVER_ERROR
      logger.error({
        msg: 'Error while fetching meta data of the link',
        err: {
          error,
          errCode: rspObj.errCode,
          errMsg: rspObj.errMsg,
          responseCode: rspObj.responseCode
        },
        additionalInfo: {url: data.url}
      }, req)
      return response.status(500).send(respUtil.errorResponse(rspObj))
    })
}
module.exports.fetchUrlMetaAPI = fetchUrlMetaAPI
