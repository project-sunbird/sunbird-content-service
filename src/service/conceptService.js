/**
 * @file  : domainService.js
 * @author: Anuj Gupta
 * @desc  : controller file for handle domain and concepts.
 */

var async = require('async')
var respUtil = require('response_util')
var contentProvider = require('sb_content_provider_util')
var logger = require('sb_logger_util_v2')
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var domainMessage = messageUtils.DOMAIN
var responseCode = messageUtils.RESPONSE_CODE

/**
 * This function helps to get all domain from content provider
 * @param {Object} req
 * @param {Object} response
 */
function getDomainsAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('getDomains', rspObj, 'contentService.search() called')
  logger.debug({ msg: 'conceptService.getDomainAPI() called' }, req)
  var data = {}
  data.body = req.body

  async.waterfall([

    function (CBW) {
      utilsService.logDebugInfo('getDomains', rspObj, 'Request to content provider to get all domains')
      logger.debug({ msg: 'Request to content provider to get all domains', additionalInfo: { data } }, req)
      contentProvider.getDomains(req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = domainMessage.GET_DOMAINS.FAILED_CODE
          rspObj.errMsg = domainMessage.GET_DOMAINS.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('getDomains', rspObj, err)
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
function getDomainByIDAPI (req, response) {
  logger.debug({ msg: 'conceptService.getDomainByIDAPI() called' }, req)
  var data = {}
  var rspObj = req.rspObj

  data.domainId = req.params.domainId

  if (!data.domainId) {
    rspObj.errCode = domainMessage.GET_DOMAIN_BY_ID.MISSING_CODE
    rspObj.errMsg = domainMessage.GET_DOMAIN_BY_ID.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('getDomains', rspObj, 'Error due to missing domainId')
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
          rspObj.errCode = domainMessage.GET_DOMAIN_BY_ID.FAILED_CODE
          rspObj.errMsg = domainMessage.GET_DOMAIN_BY_ID.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('getDomains', rspObj, err)
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
function getObjectTypesAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('getObjectTypes', rspObj, 'conceptService.getObjectTypesAPI() called')
  logger.debug({ msg: 'conceptService.getObjectTypesAPI() called' }, req)
  var data = {}
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType

  if (!data.domainId || !data.objectType) {
    rspObj.errCode = domainMessage.GET_OBJECTS.MISSING_CODE
    rspObj.errMsg = domainMessage.GET_OBJECTS.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('getObjectTypes', rspObj, 'Error due to missing domainId or objectType')
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
      utilsService.logDebugInfo('getObjectTypes',
        rspObj,
        'Request to content provider to get Object Types')
      logger.debug({ msg: 'Request to content provider to get Object Types', additionalInfo: { data } }, req)
      contentProvider.getObjects(data.domainId, data.objectType, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = domainMessage.GET_OBJECTS.FAILED_CODE
          rspObj.errMsg = domainMessage.GET_OBJECTS.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('getObjectTypes', rspObj, err)
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
function getObjectTypeByIDAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('getObjectTypes',
    rspObj,
    'conceptService.getObjectTypeByIDAPI() called')
  logger.debug({ msg: 'conceptService.getObjectTypeByIDAPI() called' }, req)
  var data = {}
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType
  data.objectId = req.params.objectId

  if (!data.domainId || !data.objectType || !data.objectId) {
    rspObj.errCode = domainMessage.GET_OBJECT_BY_ID.MISSING_CODE
    rspObj.errMsg = domainMessage.GET_OBJECT_BY_ID.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('getObjectTypes',
      rspObj,
      'Error due to missing domainId or objectType or objectId')
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
      utilsService.logDebugInfo('getObjectTypes',
        rspObj,
        'Request to content provider to get Object Types by Id')
      logger.debug({ msg: 'Request to content provider to get Object Types by Id', additionalInfo: { data } }, req)
      contentProvider.getObjectById(data.domainId, data.objectType, data.objectId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = domainMessage.GET_OBJECT_BY_ID.FAILED_CODE
          rspObj.errMsg = domainMessage.GET_OBJECT_BY_ID.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('getObjectTypes',
            rspObj,
            'Error while getting Object Types by Id from content provider')
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
function getConceptByIdAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('getConcept',
    rspObj,
    'conceptService.getConceptByIdAPI() called')
  logger.debug({ msg: 'conceptService.getConceptByIdAPI() called' }, req)
  var data = {}
  data.conceptId = req.params.conceptId

  if (!data.conceptId) {
    rspObj.errCode = domainMessage.GET_OBJECTS.MISSING_CODE
    rspObj.errMsg = domainMessage.GET_OBJECTS.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('getConcept',
      rspObj,
      'Error due to missing conceptID')
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
      utilsService.logDebugInfo('getConcept',
        rspObj,
        'Request to content provider to get concept')
      logger.debug({ msg: 'Request to content provider to get concept', additionalInfo: { data } }, req)
      contentProvider.getConceptById(data.conceptId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = domainMessage.GET_CONCEPT_BY_ID.FAILED_CODE
          rspObj.errMsg = domainMessage.GET_CONCEPT_BY_ID.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('getConcept', rspObj, err)
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
function searchObjectTypeAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('searchObjectType',
    rspObj,
    'conceptService.searchObjectTypeAPI() called')
  logger.debug({ msg: 'conceptService.searchObjectTypeAPI() called' }, req)
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType

  if (!data.domainId || !data.objectType || !data.request || !data.request.search) {
    rspObj.errCode = domainMessage.SEARCH_OBJECT_TYPE.MISSING_CODE
    rspObj.errMsg = domainMessage.SEARCH_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('searchObjectType',
      rspObj,
      'Error due to missing domainId or objectType or request or search property in request')
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
      utilsService.logDebugInfo('searchObjectType',
        rspObj,
        'Request to content provider to search Object Types')
      logger.debug({ msg: 'Request to content provider to search Object Types', additionalInfo: { data } }, req)
      contentProvider.searchObjectsType(ekStepReqData, data.domainId,
        data.objectType, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = domainMessage.SEARCH_OBJECT_TYPE.FAILED_CODE
            rspObj.errMsg = domainMessage.SEARCH_OBJECT_TYPE.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            utilsService.logErrorInfo('searchObjectType', rspObj, err)
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
function createObjectTypeAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('createObjectType',
    rspObj,
    'conceptService.createObjectTypeAPI() called')
  logger.debug({ msg: 'conceptService.createObjectTypeAPI() called' }, req)
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType

  if (!data.domainId || !data.objectType || !data.request || !data.request.object) {
    rspObj.errCode = domainMessage.CREATE_OBJECT_TYPE.MISSING_CODE
    rspObj.errMsg = domainMessage.CREATE_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('createObjectType',
      rspObj,
      'Error due to missing domainId or objectType or request or object property in request')
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
      utilsService.logDebugInfo('createObjectType',
        rspObj,
        'Request to content provider to create Object Type')
      logger.debug({ msg: 'Request to content provider to create Object Type ', additionalInfo: { data } }, req)
      contentProvider.createObjectType(ekStepReqData, data.domainId, data.objectType, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = domainMessage.CREATE_OBJECT_TYPE.FAILED_CODE
          rspObj.errMsg = domainMessage.CREATE_OBJECT_TYPE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('createObjectType', rspObj, err)
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
function updateObjectTypeAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('updateObjectType',
    rspObj,
    'conceptService.updateObjectTypeAPI() called')
  logger.debug({ msg: 'conceptService.updateObjectTypeAPI() called' }, req)
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType
  data.objectId = req.params.objectId

  if (!data.domainId || !data.objectType || !data.objectId || !data.request || !data.request.object) {
    rspObj.errCode = domainMessage.UPDATE_OBJECT_TYPE.MISSING_CODE
    rspObj.errMsg = domainMessage.UPDATE_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('updateObjectType',
      rspObj,
      'Error due to missing domainId or objectType or ObjectId or request or object property in request')
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
      utilsService.logDebugInfo('updateObjectType',
        rspObj,
        'Request to content provider to update Object Type')
      logger.debug({ msg: 'Request to content provider to update Object Type ', additionalInfo: { data } }, req)
      contentProvider.updateObjectType(ekStepReqData, data.domainId,
        data.objectType, data.objectId, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = domainMessage.UPDATE_OBJECT_TYPE.FAILED_CODE
            rspObj.errMsg = domainMessage.UPDATE_OBJECT_TYPE.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            utilsService.logErrorInfo('updateObjectType', rspObj, err)
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
function retireObjectTypeAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('retireObjectType',
    rspObj,
    'conceptService.retireObjectTypeAPI() called')
  logger.debug({ msg: 'conceptService.retireObjectTypeAPI() called' }, req)
  var data = req.body
  data.domainId = req.params.domainId
  data.objectType = req.params.objectType
  data.objectId = req.params.objectId

  if (!data.domainId || !data.objectType || !data.objectId) {
    rspObj.errCode = domainMessage.RETIRE_OBJECT_TYPE.MISSING_CODE
    rspObj.errMsg = domainMessage.RETIRE_OBJECT_TYPE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('retireObjectType',
      rspObj,
      'Error due to missing domainId or objectType or ObjectId')
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
      utilsService.logDebugInfo('retireObjectType',
        rspObj,
        'Request to content provider to retire Object Type')
      logger.debug({ msg: 'Request to content provider to retire Object Type ', additionalInfo: { data } }, req)
      contentProvider.retireObjectType(ekStepReqData, data.domainId,
        data.objectType, data.objectId, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = domainMessage.RETIRE_OBJECT_TYPE.FAILED_CODE
            rspObj.errMsg = domainMessage.RETIRE_OBJECT_TYPE.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            utilsService.logErrorInfo('retireObjectType', rspObj, err)
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
function listTermsAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('listTerms',
    rspObj,
    'conceptService.listTermsAPI() called')
  logger.debug({ msg: 'conceptService.listTermsAPI() called' }, req)
  async.waterfall([
    function (CBW) {
      contentProvider.listTerms(req.headers, function (err, res) {
        if (err) {
          utilsService.logErrorInfo('listTerms', rspObj, err)
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
function listResourceBundlesAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('listResource',
    rspObj,
    'conceptService.listResourceBundlesAPI() called')
  logger.debug({ msg: 'conceptService.listResourceBundlesAPI() called' }, req)
  async.waterfall([
    function (CBW) {
      contentProvider.listResourceBundles(req.headers, function (err, res) {
        if (err) {
          utilsService.logErrorInfo('listResource', rspObj, err)
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
function listOrdinalsAPI (req, response) {
  var rspObj = req.rspObj
  utilsService.logDebugInfo('listOrdinals',
    rspObj,
    'conceptService.listOrdinalsAPI() called')
  logger.debug({ msg: 'conceptService.listOrdinalsAPI() called' }, req)
  async.waterfall([
    function (CBW) {
      contentProvider.listOrdinals(req.headers, function (err, res) {
        if (err) {
          utilsService.logErrorInfo('listOrdinals', rspObj, err)
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
