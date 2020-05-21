/**
 * @file  : channelService.js
 * @author: Rajath V B
 * @desc  : controller file for handle domain and concepts.
 */

var async = require('async')
var path = require('path')
var respUtil = require('response_util')
var ekStepUtil = require('sb_content_provider_util')
var logger = require('sb_logger_util_v2')
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var _ = require('lodash')
var filename = path.basename(__filename)
var responseCode = messageUtils.RESPONSE_CODE

/**
 * This function helps to get all domain from ekstep
 * @param {Object} req
 * @param {Object} response
 */

function getChannelValuesById (req, response) {
  logger.debug({ msg: 'channelService.getChannelValuesById() called' }, req)
  var data = {}
  var rspObj = req.rspObj
  data.body = req.body
  data.channelId = req.params.channelId
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.channelId, 'channel', '', {})
  }

  if (!data.channelId) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required channel Id is missing',
      additionalInfo: { data },
      err: { responseCode: rspObj.responseCode }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to get channel details by id ', additionalInfo: { channelId: _.get(data, 'channelId') } }, req)
      ekStepUtil.getChannelValuesById(data.channelId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({ msg: 'Getting error from ekstep while fetching channel by id ', additionalInfo: { channelId: data.channelId }, err: { err, responseCode: rspObj.responseCode } }, req)
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
      logger.debug({ msg: 'channel details', additionalInfo: { result: rspObj.result } }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function ChannelCreate (req, response) {
  logger.debug({ msg: 'channelService.ChannelCreate() called' }, req)
  var rspObj = req.rspObj
  var data = req.body
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required request body is missing',
      additionalInfo: { data },
      err: { responseCode: rspObj.responseCode }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to create channel', additionalInfo: { ekStepReqData } }, req)
      ekStepUtil.ChannelCreate(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({ msg: 'Getting error from ekstep while creating channel', additionalInfo: { ekStepReqData }, err: { err, responseCode: rspObj.responseCode } }, req)
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
      logger.debug({ msg: 'channel created', additionalInfo: { result: rspObj.result } }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function ChannelUpdate (req, response) {
  logger.debug({ msg: 'channelService.ChannelUpdate() called' }, req)
  var rspObj = req.rspObj
  var data = req.body
  data.channelId = req.params.channelId
  // Adding telemetry object data
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.channelId, 'channel', '', {})
  }
  if (!data) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required request body is missing',
      additionalInfo: { data },
      err: { responseCode: rspObj.responseCode }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to update channel', additionalInfo: { channelId: _.get(data, 'channelId'), ekStepReqData } }, req)
      ekStepUtil.ChannelUpdate(ekStepReqData, data.channelId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({ msg: 'Getting error from ekstep while updating channel', additionalInfo: { ekStepReqData }, err: { err, responseCode: rspObj.responseCode } }, req)
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
      logger.debug({ msg: 'channel updated', additionalInfo: { result: rspObj.result } }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

module.exports.getChannelValuesById = getChannelValuesById
module.exports.ChannelCreate = ChannelCreate
module.exports.ChannelUpdate = ChannelUpdate
