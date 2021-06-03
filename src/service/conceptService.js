/**
 * @file  : domainService.js
 * @author: Anuj Gupta
 * @desc  : controller file for handle domain and concepts.
 */

var async = require('async')
var path = require('path')
var respUtil = require('response_util')
var contentProvider = require('sb_content_provider_util')
var logger = require('sb_logger_util_v2')
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')

var filename = path.basename(__filename)
var domainMessage = messageUtils.DOMAIN
var responseCode = messageUtils.RESPONSE_CODE
var configData = require('../config/constants.json')
const SERVICE_PREFIX = `${configData.serviceCode}_CNC`

/**
 * This function helps to get all domain from content provider
 * @param {Object} req
 * @param {Object} response
 */
function getDomainsAPI(req, response) {
  logger.debug({ msg: 'conceptService.getDomainAPI() called' }, req)
  var data = {}
  var rspObj = req.rspObj
  data.body = req.body

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to get all domains', additionalInfo: { data } }, req)
      contentProvider.getDomains(req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_DOMAINS.FAILED_ERR_CODE}`
          rspObj.errMsg = domainMessage.GET_DOMAINS.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error while getting domains from content provider',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
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

/**
 * This function helps to get domain from content provider by domainId
 * @param {Object} req
 * @param {Object} response
 */
function getDomainByIDAPI(req, response) {
  logger.debug({ msg: 'conceptService.getDomainByIDAPI() called' }, req)
  var data = {}
  var rspObj = req.rspObj

  data.domainId = req.params.domainId

  if (!data.domainId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_DOMAIN_BY_ID.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.GET_DOMAIN_BY_ID.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing domainId',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to get domain by Id', additionalInfo: { data } }, req)
      contentProvider.getDomainById(data.domainId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_DOMAIN_BY_ID.FAILED_ERR_CODE}`
          rspObj.errMsg = domainMessage.GET_DOMAIN_BY_ID.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error while getting domain By Id from content provider',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
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

/**
 * This function helps to get all object of a domain and object type
 * @param {Object} req
 * @param {Object} response
 */
function getObjectTypesAPI(req, response) {
  logger.debug({ msg: 'conceptService.getObjectTypesAPI() called' }, req)
  var data = {}
  var rspObj = req.rspObj
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType

  if (!data.domainId || !data.objectType) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_OBJECTS.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.GET_OBJECTS.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing domainId or objectType',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to get Object Types ', additionalInfo: { data } }, req)
      contentProvider.getObjects(data.domainId, data.objectType, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_OBJECTS.FAILED_ERR_CODE}`
          rspObj.errMsg = domainMessage.GET_OBJECTS.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error while getting Object Types from content provider',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
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

/**
 * This function helps to get object of a domain, object type and object id
 * @param {Object} req
 * @param {Object} response
 */
function getObjectTypeByIDAPI(req, response) {
  logger.debug({ msg: 'conceptService.getObjectTypeByIDAPI() called' }, req)
  var data = {}
  var rspObj = req.rspObj

  data.domainId = req.params.domainId
  data.objectType = req.params.objectType
  data.objectId = req.params.objectId

  if (!data.domainId || !data.objectType || !data.objectId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_OBJECT_BY_ID.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.GET_OBJECT_BY_ID.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing domainId or objectType or objectId',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to get Object Types by Id', additionalInfo: { data } }, req)
      contentProvider.getObjectById(data.domainId, data.objectType, data.objectId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_OBJECT_BY_ID.FAILED_ERR_CODE}`
          rspObj.errMsg = domainMessage.GET_OBJECT_BY_ID.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error while getting Object Types by Id from content provider',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
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

/**
 * This function helps to get concept object by concept id
 * @param {Object} req
 * @param {Object} response
 */
function getConceptByIdAPI(req, response) {
  logger.debug({ msg: 'conceptService.getConceptByIdAPI() called' }, req)
  var data = {}
  var rspObj = req.rspObj
  data.conceptId = req.params.conceptId

  if (!data.conceptId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_OBJECTS.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.GET_OBJECTS.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing conceptID',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to get concept', additionalInfo: { data } }, req)
      contentProvider.getConceptById(data.conceptId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.GET_CONCEPT_BY_ID.FAILED_ERR_CODE}`
          rspObj.errMsg = domainMessage.GET_CONCEPT_BY_ID.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error while getting concept from content provider',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
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

/**
 * This function helps to search object of a domain and object type
 * @param {Object} req
 * @param {Object} response
 */
function searchObjectTypeAPI(req, response) {
  logger.debug({ msg: 'conceptService.searchObjectTypeAPI() called' }, req)
  var rspObj = req.rspObj
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType

  if (!data.domainId || !data.objectType || !data.request || !data.request.search) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.SEARCH_OBJECT_TYPE.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.SEARCH_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing domainId or objectType or request or search property in request',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to search Object Types ', additionalInfo: { data } }, req)
      contentProvider.searchObjectsType(ekStepReqData, data.domainId,
        data.objectType, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.SEARCH_OBJECT_TYPE.FAILED_ERR_CODE}`
            rspObj.errMsg = domainMessage.SEARCH_OBJECT_TYPE.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            logger.error({
              msg: 'Error while searching objectTypes from content provider',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              }
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

/**
 * This function helps to create object of a domain and object type
 * @param {Object} req
 * @param {Object} response
 */
function createObjectTypeAPI(req, response) {
  var rspObj = req.rspObj
  logger.debug({ msg: 'conceptService.createObjectTypeAPI() called' }, req)
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType

  if (!data.domainId || !data.objectType || !data.request || !data.request.object) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.CREATE_OBJECT_TYPE.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.CREATE_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing domainId or objectType or request or object property in request',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to create Object Type ', additionalInfo: { data } }, req)
      contentProvider.createObjectType(ekStepReqData, data.domainId, data.objectType, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.CREATE_OBJECT_TYPE.FAILED_ERR_CODE}`
          rspObj.errMsg = domainMessage.CREATE_OBJECT_TYPE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Error from content provider while creating objectTypes ',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            }
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

/*
 * This function helps to update object of a domain and object type
 * @param {Object} req
 * @param {Object} response
 */
function updateObjectTypeAPI(req, response) {
  logger.debug({ msg: 'conceptService.updateObjectTypeAPI() called' }, req)
  var rspObj = req.rspObj
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType
  data.objectId = req.params.objectId

  if (!data.domainId || !data.objectType || !data.objectId || !data.request || !data.request.object) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.UPDATE_OBJECT_TYPE.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.UPDATE_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing domainId or objectType or ObjectId or request or object property in request',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to update Object Type ', additionalInfo: { data } }, req)
      contentProvider.updateObjectType(ekStepReqData, data.domainId,
        data.objectType, data.objectId, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.UPDATE_OBJECT_TYPE.FAILED_ERR_CODE}`
            rspObj.errMsg = domainMessage.UPDATE_OBJECT_TYPE.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            logger.error({
              msg: 'Error from content provider while updating objectTypes ',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              }
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

/*
 * This function helps to retire object of a domain and object type
 * @param {Object} req
 * @param {Object} response
 */
function retireObjectTypeAPI(req, response) {
  logger.debug({ msg: 'conceptService.retireObjectTypeAPI() called' }, req)
  var rspObj = req.rspObj
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType
  data.objectId = req.params.objectId

  if (!data.domainId || !data.objectType || !data.objectId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.RETIRE_OBJECT_TYPE.MISSING_ERR_CODE}`
    rspObj.errMsg = domainMessage.RETIRE_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing domainId or objectType or ObjectId',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {}

  async.waterfall([

    function (CBW) {
      logger.debug({ msg: 'Request to content provider to retire Object Type ', additionalInfo: { data } }, req)
      contentProvider.retireObjectType(ekStepReqData, data.domainId,
        data.objectType, data.objectId, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = `${SERVICE_PREFIX}_${domainMessage.RETIRE_OBJECT_TYPE.FAILED_ERR_CODE}`
            rspObj.errMsg = domainMessage.RETIRE_OBJECT_TYPE.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            logger.error({
              msg: 'Error from content provider while retiring objectTypes ',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              }
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

/**
 * API to get terms list
 * @param {Object} req
 * @param {Object} response
 */
function listTermsAPI(req, response) {
  logger.debug({ msg: 'conceptService.listTermsAPI() called' }, req)
  var rspObj = req.rspObj
  async.waterfall([
    function (CBW) {
      contentProvider.listTerms(req.headers, function (err, res) {
        if (err) {
          logger.error({msg: 'Error from content provider while listing Terms'}, req)
        }
        CBW(null, res)
      })
    },
    function (res) {
      rspObj.result = res.result
      var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
      rspObj = utilsService.getErrorResponse(rspObj, res)
      return response.status(httpStatus).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * API to get terms list
 * @param {Object} req
 * @param {Object} response
 */
function listResourceBundlesAPI(req, response) {
  logger.debug({ msg: 'conceptService.listResourceBundlesAPI() called' }, req)
  var rspObj = req.rspObj
  async.waterfall([
    function (CBW) {
      contentProvider.listResourceBundles(req.headers, function (err, res) {
        if (err) {
          logger.error({msg: 'Error from content provider while listing resourceBundles'}, req)
        }
        CBW(null, res)
      })
    },
    function (res) {
      rspObj.result = res.result
      var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
      rspObj = utilsService.getErrorResponse(rspObj, res)
      return response.status(httpStatus).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * API to get terms list
 * @param {Object} req
 * @param {Object} response
 */
function listOrdinalsAPI(req, response) {
  logger.debug({ msg: 'conceptService.listOrdinalsAPI() called' }, req)
  var rspObj = req.rspObj
  async.waterfall([
    function (CBW) {
      contentProvider.listOrdinals(req.headers, function (err, res) {
        if (err) {
          logger.error({msg: 'Error from content provider while listing ordinals'}, req)
        }
        CBW(null, res)
      })
    },
    function (res) {
      rspObj.result = res.result
      var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
      rspObj = utilsService.getErrorResponse(rspObj, res)
      return response.status(httpStatus).send(respUtil.successResponse(rspObj))
    }
  ])
}

module.exports.getDomainsAPI = getDomainsAPI
module.exports.getDomainByIDAPI = getDomainByIDAPI
module.exports.getObjectTypesAPI = getObjectTypesAPI
module.exports.getObjectTypeByIDAPI = getObjectTypeByIDAPI
module.exports.getConceptByIdAPI = getConceptByIdAPI
module.exports.searchObjectTypeAPI = searchObjectTypeAPI
module.exports.createObjectTypeAPI = createObjectTypeAPI
module.exports.updateObjectTypeAPI = updateObjectTypeAPI
module.exports.retireObjectTypeAPI = retireObjectTypeAPI
module.exports.listTermsAPI = listTermsAPI
module.exports.listResourceBundlesAPI = listResourceBundlesAPI
module.exports.listOrdinalsAPI = listOrdinalsAPI
