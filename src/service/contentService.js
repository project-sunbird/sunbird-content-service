/**
 * @name : contentService.js
 * @description :: Responsible for handle content service
 * @author      :: Anuj Gupta
 */

var async = require('async')
var multiparty = require('multiparty')
var fs = require('fs')
var randomString = require('randomstring')
var contentProvider = require('sb_content_provider_util')
var respUtil = require('response_util')
var logger = require('sb_logger_util_v2')
var validatorUtil = require('sb_req_validator_util')
var _ = require('underscore')
var lodash = require('lodash')

var contentModel = require('../models/contentModel').CONTENT
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var emailService = require('./emailService')
var orgHelper = require('../helpers/orgHelper')
var licenseHelper = require('../helpers/licenseHelper')
var configData = require('../config/constants.json')
var CacheManager = require('sb_cache_manager')
var cacheManager = new CacheManager({})

var contentMessage = messageUtils.CONTENT
var compositeMessage = messageUtils.COMPOSITE
var responseCode = messageUtils.RESPONSE_CODE
var reqMsg = messageUtils.REQUEST
const SERVICE_PREFIX = `${configData.serviceCode}_CNT`;

/**
 * This function helps to generate code for create course
 * @returns {String}
 */
function getCode () {
  return contentMessage.PREFIX_CODE + randomString.generate(6)
}

/**
 * This function return the mimeType for create course
 * @returns {String}
 */
// function getMimeTypeForContent () {
//   return contentMessage.MIME_TYPE
// }

/**
 * This function return the contentType for create course
 * @returns {String}
 */
function getContentTypeForContent () {
  return contentMessage.CONTENT_TYPE
}

function searchAPI (req, response) {
  return search(compositeMessage.CONTENT_TYPE, req, response)
}

function searchContentAPI (req, response) {
  return search(getContentTypeForContent(), req, response, ['Content', 'QuestionSet'])
}

function search (defaultContentTypes, req, response, objectType) {
  var data = req.body
  var rspObj = req.rspObj

  logger.debug({
    msg: 'contentService.search() called', additionalInfo: { rspObj }
  }, req)

  if (!data.request || !data.request.filters) {
    rspObj.errCode = `${configData.serviceCode}_${contentMessage.SEARCH.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.SEARCH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR

    logger.error({
      msg: 'Error due to required request || request.filters are missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  if (!data.request.filters) {
    data.request.filters.contentType = defaultContentTypes
  }

  // if fields exists it has to be sent as array to lp
  if (req.query.fields) {
    data.request.fields = req.query.fields.split(',')
  }
  if (objectType) {
    data.request.filters.objectType = objectType
  }
  //    if(!data.request.filters.mimeType) {
  //        data.request.filters.mimeType = getMimeTypeForContent();
  //    }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to search the content',
        additionalInfo: {
          body: ekStepReqData
        }
      }, req)

      contentProvider.compositeSearch(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${configData.serviceCode}_${contentMessage.SEARCH.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.SEARCH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider composite search',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { ekStepReqData }
          }, req)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          if (req.query.framework && req.query.framework !== 'null') {
            getFrameworkDetails(req, function (err, data) {
              if (err || res.responseCode !== responseCode.SUCCESS) {
                logger.error({ msg: `Framework API failed with framework - ${req.query.framework}`, err }, req)
                rspObj.result = res.result
                return response.status(200).send(respUtil.successResponse(rspObj))
              } else {
                var language = req.query.lang ? req.query.lang : 'en'
                if (lodash.get(res, 'result.facets') &&
                  lodash.get(data, 'result.framework.categories')) {
                  modifyFacetsData(res.result.facets, data.result.framework.categories, language)
                }
                orgHelper.includeOrgDetails(req, res, CBW)
              }
            })
          } else {
            orgHelper.includeOrgDetails(req, res, CBW)
          }
        }
      })
    },
    function (res, CBW) {
      licenseHelper.includeLicenseDetails(req, res, CBW)
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({
        msg: `Content searched successfully with ${lodash.get(rspObj.result, 'count')}`,
        additionalInfo: {
          contentCount: lodash.get(rspObj.result, 'count')
        }
      }, req)

      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function getFrameworkDetails (req, CBW) {
  cacheManager.get(req.query.framework, function (err, data) {
    if (err || !data) {
      contentProvider.getFrameworkById(req.query.framework, '', req.headers, function (err, result) {
        if (err || result.responseCode !== responseCode.SUCCESS) {
          logger.error({ msg: `Fetching framework data failed ${lodash.get(req.query, 'framework')}`, err }, req)
          CBW(new Error('Fetching framework data failed'), null)
        } else {
          logger.debug({ msg: `Fetching framework data success ${lodash.get(req.query, 'framework')}` }, req)
          cacheManager.set({ key: req.query.framework, value: result },
            function (err, data) {
              if (err) {
                logger.error({
                  msg: `Setting framework cache data failed ${lodash.get(req.query, 'framework')}`, err
                }, req)
              } else {
                logger.debug({ msg: `Setting framework cache data success ${lodash.get(req.query, 'framework')}` }, req)
              }
            })
          CBW(null, result)
        }
      })
    } else {
      CBW(null, data)
    }
  })
}

function modifyFacetsData (searchData, frameworkData, language) {
  lodash.forEach(searchData, (facets) => {
    lodash.forEach(frameworkData, (categories) => {
      if (categories.code === facets.name) {
        lodash.forEach(facets.values, (values) => {
          lodash.forEach(categories.terms, (terms) => {
            if (values.name.toLowerCase() === terms.name.toLowerCase()) {
              terms = lodash.pick(terms, ['name', 'translations', 'description',
                'index', 'count'])
              Object.assign(values, terms)
              values.translations = parseTranslationData(terms.translations, language)
            }
          })
        })
        facets.values = lodash.orderBy(facets.values, ['index'], ['asc'])
      }
    })
  })
}

function parseTranslationData (data, language) {
  try {
    return lodash.get(JSON.parse(data), language) || null
  } catch (e) {
    logger.warn({ msg: 'warning from parseTranslationData()', warningMessage: e })
    return null
  }
}

/**
 * This function helps to create content and create course in ekStep course
 * @param {type} req
 * @param {type} response
 * @returns {object} return response object with htpp status
 */
function createContentAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.content || !validatorUtil.validate(data.request.content, contentModel.CREATE)) {
    // prepare
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.CREATE.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.CREATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR

    logger.error({
      msg: 'Error due to missing request || request.content',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Transform request for Ek step
  data.request.content.code = getCode()
  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to create content',
        additionalInfo: { body: ekStepReqData }
      }, req)
      contentProvider.createContent(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.CREATE.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.CREATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while creating content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { ekStepReqData }
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
      rspObj.result.content_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      logger.debug({ msg: 'Sending response back to user', res: rspObj.result }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }

  ])
}

/**
 * This function helps to update content and update course in ekStep course
 * @param {type} req
 * @param {type} response
 * @returns {unresolved}
 */
function updateContentAPI (req, response) {
  var data = req.body
  data.contentId = req.params.contentId

  var rspObj = req.rspObj
  logger.debug({
    msg: 'contentService.updateContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)
  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.request || !data.request.content || !validatorUtil.validate(data.request.content, contentModel.UPDATE)) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.UPDATE.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request || request.content',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      var qs = {
        mode: 'edit',
        fields: 'versionKey'
      }
      logger.debug({
        msg: 'Request to content provider to get the latest version key',
        additionalInfo: {
          contentId: data.contentId,
          query: qs
        }
      }, req)
      contentProvider.getContentUsingQuery(data.contentId, qs, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.UPDATE.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while getting content using jquery',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, qs }
          }, req)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          data.request.content.versionKey = res.result.content.versionKey
          CBW()
        }
      })
    },
    function (CBW) {
      var ekStepReqData = {
        request: data.request
      }

      logger.debug({
        msg: 'Request to content provider to update the content',
        additionalInfo: {
          body: ekStepReqData
        }
      }, req)
      contentProvider.updateContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : contentMessage.UPDATE.FAILED_CODE
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while updating content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { ekStepReqData, contentId: data.contentId }
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
      rspObj.result.content_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function uploadContentAPI (req, response) {
  var data = req.body
  data.contentId = req.params.contentId
  data.queryParams = req.query
  var rspObj = req.rspObj

  logger.debug({
    msg: 'contentService.uploadContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.queryParams.fileUrl) {
    var form = new multiparty.Form()

    form.parse(req, function (err, fields, files) {
      if (err || (files && Object.keys(files).length === 0)) {
        rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.UPLOAD.MISSING_ERR_CODE}`
        rspObj.errMsg = contentMessage.UPLOAD.MISSING_MESSAGE
        rspObj.responseCode = responseCode.CLIENT_ERROR
        logger.error({
          msg: 'Error due to upload files are missing',
          additionalInfo: {
            contentId: data.contentId,
            files: files
          },
          err: {
            err,
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          }
        }, req)
        return response.status(400).send(respUtil.errorResponse(rspObj))
      }
    })

    form.on('file', function (name, file) {
      var formData = {
        file: {
          value: fs.createReadStream(file.path),
          options: {
            filename: file.originalFilename
          }
        }
      }
      async.waterfall([

        function (CBW) {
          logger.debug({
            msg: 'Request to content provider to upload the content',
            additionalInfo: {
              contentId: data.contentId
            }
          }, req)

          delete req.headers['content-type']
          contentProvider.uploadContent(formData, data.contentId, req.headers, function (err, res) {
            if (err || res.responseCode !== responseCode.SUCCESS) {
              rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.UPLOAD.FAILED_ERR_CODE}`
              rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UPLOAD.FAILED_MESSAGE
              rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
              logger.error({
                msg: 'Getting error from content provider while uploading content',
                err: {
                  err,
                  errCode: rspObj.errCode,
                  errMsg: rspObj.errMsg,
                  responseCode: rspObj.responseCode
                },
                additionalInfo: { formData, contentId: data.contentId }
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
          logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
          var modifyRsp = respUtil.successResponse(rspObj)
          modifyRsp.success = true
          return response.status(200).send(modifyRsp)
        }
      ])
    })
  } else {
    var queryString = { fileUrl: data.queryParams.fileUrl }
    async.waterfall([

      function (CBW) {
        logger.debug({
          msg: 'Request to content provider to upload the content',
          additionalInfo: {
            contentId: data.contentId
          }
        }, req)

        delete req.headers['content-type']
        contentProvider.uploadContentWithFileUrl(data.contentId, queryString, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.UPLOAD.FAILED_ERR_CODE}`
            rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UPLOAD.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR

            logger.error({
              msg: 'Getting error from content provider while uploading content with file url',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { contentId: data.contentId, queryString }
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
        logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
        var modifyRsp = respUtil.successResponse(rspObj)
        modifyRsp.success = true
        return response.status(200).send(modifyRsp)
      }
    ])
  }
}

function reviewContentAPI (req, response) {
  logger.debug({ msg: 'Request for review came' }, req)
  var data = {
    body: req.body
  }
  data.contentId = req.params.contentId
  var ekStepReqData = {
    request: data.request
  }

  var rspObj = req.rspObj

  logger.debug({
    msg: 'contentService.reviewContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)
  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to review the content',
        additionalInfo: {
          req: ekStepReqData,
          contentId: data.contentId
        }
      }, req)
      contentProvider.reviewContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
        // After check response, we perform other operation
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.REVIEW.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.REVIEW.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while reviewing content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, ekStepReqData }
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
      rspObj.result.content_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      emailService.reviewContentEmail(req, function () { })
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function publishContentAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  data.contentId = req.params.contentId
  var ekStepReqData = {
    request: data.request
  }

  logger.debug({
    msg: 'contentService.publishContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.request || !data.request.content || !data.request.content.lastPublishedBy) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.PUBLISH.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.PUBLISH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request || request.content || request.content.lastPublishedBy',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to publish the content',
        additionalInfo: {
          contentId: data.contentId,
          reqData: ekStepReqData

        }
      }, req)

      contentProvider.publishContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
        // After check response, we perform other operation
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.PUBLISH.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.PUBLISH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while publishing content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, ekStepReqData }
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
      rspObj.result.content_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      rspObj.result.publishStatus = res.result.publishStatus
      emailService.publishedContentEmail(req, function () { })

      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)

      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function getContentAPI (req, response) {
  var data = {}
  data.body = req.body
  data.contentId = req.params.contentId
  data.queryParams = req.query
  var rspObj = req.rspObj

  logger.debug({
    msg: 'contentService.getContentAPI() called', additionalInfo: { rspObj }
  }, req)

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.contentId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.GET.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.GET.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required content id is missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {
        data
      }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to get the content meta data',
        additionalInfo: {
          contentId: data.contentId,
          qs: data.queryParams
        }
      }, req)
      contentProvider.getContentUsingQuery(data.contentId, data.queryParams, req.headers, function (err, res) {
        // After check response, we perform other operation
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.GET.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while getting content using jquery',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, queryParams: data.queryParams }
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
    function (res, CBW) {
      orgHelper.includeOrgDetails(req, res, CBW)
    },
    function (res, CBW) {
      licenseHelper.includeLicenseDetails(req, res, CBW)
    },
    function (resp, CBW) {
      if (lodash.get(resp, 'result.content.assets')) {
        var ekStepReqData = {
          request: {
            filters: {
              identifier: resp.result.content.assets,
              status: 'Live'
            },
            fields: ['streamingUrl', 'artifactUrl']
          }
        }
        logger.debug({
          msg: 'Request to content provider to search for assets',
          additionalInfo: {
            body: ekStepReqData
          }
        }, req)
        contentProvider.compositeSearch(ekStepReqData, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.GET_MY.FAILED_ERR_CODE}`
            rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET_MY.FAILED_MESSAGE
            rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            logger.error({
              msg: 'Getting error from content provider during composite search for assets',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { ekStepReqData }
            }, req)
            var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
            rspObj.result = res && res.result ? res.result : {}
            rspObj = utilsService.getErrorResponse(rspObj, res)
            return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
          } else {
            if (lodash.get(res, 'result.content')) {
              resp.result.content.assetsMap = res.result.content
            }
            CBW(null, resp)
          }
        })
      } else {
        CBW(null, resp)
      }
    },
    function (res) {
      rspObj.result = res.result
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function getMyContentAPI (req, response) {
  var request = {
    'filters': {
      // "createdBy": req.userId
      'createdBy': req.params.createdBy,
      'contentType': getContentTypeForContent()
    }

  }
  req.body.request = request
  var ekStepReqData = {
    request: request
  }
  var rspObj = req.rspObj

  logger.debug({
    msg: 'contentService.getMyContentAPI() called', additionalInfo: { request, rspObj }
  }, req)

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to get user content',
        additionalInfo: {
          body: ekStepReqData
        }
      }, req)
      contentProvider.compositeSearch(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.GET_MY.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET_MY.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider during composite search',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { ekStepReqData }
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
      logger.debug({
        msg: 'My Content searched successfully',
        additionalInfo: {
          count: lodash.get(rspObj.result, 'count')
        }
      }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function retireContentAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  var failedContent = []
  var userId = req.headers['x-authenticated-userid']
  var errCode, errMsg, respCode, httpStatus

  logger.debug({
    msg: 'contentService.retireContentAPI() called', additionalInfo: { rspObj }
  }, req)

  if (!data.request || !data.request.contentIds) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.RETIRE.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.RETIRE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required request ||  request.contentIds are missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([

    function (CBW) {
      var ekStepReqData = {
        request: {
          filters: {
            identifier: data.request.contentIds,
            status: []
          }
        }
      }
      contentProvider.compositeSearch(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.SEARCH.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.SEARCH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider composite search',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { ekStepReqData }
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

    function (res, CBW) {
      var createdByOfContents = _.uniq(_.pluck(res.result.content, 'createdBy'))
      if (createdByOfContents.length === 1 && createdByOfContents[0] === userId) {
        CBW()
      } else {
        rspObj.errCode = `${SERVICE_PREFIX}_${reqMsg.TOKEN.INVALID_ERR_CODE}`
        rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE
        rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS
        return response.status(401).send(respUtil.errorResponse(rspObj))
      }
    },

    function (CBW) {
      async.each(data.request.contentIds, function (contentId, CBE) {
        logger.debug({
          msg: 'Request to content provider to retire content',
          additionalInfo: {
            contentId: contentId
          }
        }, req)

        // Adding objectData in telemetry
        if (rspObj.telemetryData) {
          rspObj.telemetryData.object = utilsService.getObjectData(contentId, 'content', '', {})
        }
        contentProvider.retireContent(contentId, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.GET_MY.FAILED_ERR_CODE}`
            errMsg = res && res.params ? res.params.errmsg : contentMessage.GET_MY.FAILED_MESSAGE
            respCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
            logger.error({
              msg: 'Getting error from content provider while retiring content',
              err: {
                err,
                errCode: rspObj.errCode,
                errMsg: rspObj.errMsg,
                responseCode: rspObj.responseCode
              },
              additionalInfo: { contentId }
            }, req)
            httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
            rspObj.result = res && res.result ? res.result : {}
            failedContent.push({ contentId: contentId, errCode: errCode, errMsg: errMsg })
          }
          CBE(null, null)
        })
      }, function () {
        if (failedContent.length > 0) {
          rspObj.errCode = errCode
          rspObj.errMsg = errMsg
          rspObj.responseCode = respCode
          rspObj.result = failedContent
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW()
        }
      })
    },
    function () {
      rspObj.result = failedContent
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)

      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function rejectContentAPI (req, response) {
  var data = {
    body: req.body
  }
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  logger.debug({
    msg: 'contentService.rejectContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)
  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.contentId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REJECT.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.REJECT.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required content ID is missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  var ekStepReqData = {
    request: data.body.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to reject content',
        additionalInfo: {
          contentId: data.contentId
        }
      }, req)
      contentProvider.rejectContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.REJECT.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.REJECT.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while rejecting content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, ekStepReqData }
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
      emailService.rejectContentEmail(req, function () { })
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function flagContentAPI (req, response) {
  // var data = req.body
  // data.contentId = req.params.contentId
  // var rspObj = req.rspObj
  // // Adding objectData in telemetry
  // if (rspObj.telemetryData) {
  //   rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  // }

  // if (!data.contentId || !data.request || !data.request.flaggedBy || !data.request.versionKey) {
  //   LOG.error(utilsService.getLoggerData(rspObj, 'ERROR', filename, 'flagContentAPI',
  //     'Error due to required params are missing', {
  //       contentId: data.contentId
  //     }))
  //   rspObj.errCode = contentMessage.FLAG.MISSING_CODE
  //   rspObj.errMsg = contentMessage.FLAG.MISSING_MESSAGE
  //   rspObj.responseCode = responseCode.CLIENT_ERROR
  //   return response.status(400).send(respUtil.errorResponse(rspObj))
  // }
  // var ekStepReqData = {
  //   request: data.request
  // }

  // async.waterfall([

  //   function (CBW) {
  //     LOG.info(utilsService.getLoggerData(rspObj, 'INFO', filename, 'flagContentAPI',
  //       'Request to content provider to flag the content', {
  //         contentId: data.contentId,
  //         body: ekStepReqData,
  //         headers: req.headers
  //       }))
  //     contentProvider.flagContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
  //       if (err || res.responseCode !== responseCode.SUCCESS) {
  //         LOG.error(utilsService.getLoggerData(rspObj, 'ERROR', filename, 'flagContentAPI',
  //           'Getting error from content provider', res))
  //         rspObj.errCode = res && res.params ? res.params.err : contentMessage.FLAG.FAILED_CODE
  //         rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.FLAG.FAILED_MESSAGE
  //         rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
  //         var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
  //         rspObj = utilsService.getErrorResponse(rspObj, res)
  //         return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
  //       } else {
  //         CBW(null, res)
  //       }
  //     })
  //   },
  //   function (res) {
  //     rspObj.result = res.result
  //     emailService.createFlagContentEmail(req, function () { })
  //     LOG.info(utilsService.getLoggerData(rspObj, 'INFO', filename, 'flagContentAPI',
  //       'Sending response back to user'))
  //     return response.status(200).send(respUtil.successResponse(rspObj))
  //   }
  // ])
  return response.status(200).send(respUtil.successResponse({}))
}

function acceptFlagContentAPI (req, response) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj

  logger.debug({
    msg: 'contentService.acceptFlagContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)
  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.contentId || !data.request) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.ACCEPT_FLAG.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.ACCEPT_FLAG.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing content ID ||  request body ',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to accept flag',
        additionalInfo: {
          contentId: data.contentId,
          body: ekStepReqData
        }
      }, req)

      contentProvider.acceptFlagContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.ACCEPT_FLAG.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.ACCEPT_FLAG.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while accepting flag content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, ekStepReqData }
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
      emailService.acceptFlagContentEmail(req, function () { })
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function rejectFlagContentAPI (req, response) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  logger.debug({
    msg: 'contentService.rejectFlagContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)
  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.contentId || !data.request) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REJECT_FLAG.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.REJECT_FLAG.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing content ID || request ',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to reject flag',
        additionalInfo: {
          contentId: data.contentId,
          body: ekStepReqData
        }
      }, req)

      contentProvider.rejectFlagContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.REJECT_FLAG.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.REJECT_FLAG.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while rejecting flag Content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, ekStepReqData }
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
      emailService.rejectFlagContentEmail(req, function () { })
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function uploadContentUrlAPI (req, response) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  logger.debug({
    msg: 'contentService.uploadContentUrlAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)
  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data.contentId || !data.request || !data.request.content || !data.request.content.fileName) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.UPLOAD_URL.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.UPLOAD_URL.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing contentId || request || request.content || request.content.fileName',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider get upload content url',
        additionalInfo: {
          contentId: data.contentId,
          body: ekStepReqData
        }
      }, req)
      contentProvider.uploadContentUrl(ekStepReqData, data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.UPLOAD_URL.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UPLOAD_URL.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while uploading content Url',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, ekStepReqData }
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
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      var modifyRsp = respUtil.successResponse(rspObj)
      modifyRsp.success = true
      return response.status(200).send(modifyRsp)
    }
  ])
}

function unlistedPublishContentAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  data.contentId = req.params.contentId
  logger.debug({
    msg: 'contentService.unlistedPublishContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)
  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  var ekStepReqData = {
    request: data.request
  }

  if (!data.request || !data.request.content || !data.request.content.lastPublishedBy) {
    rspObj.errCode = contentMessage.UNLISTED_PUBLISH.MISSING_CODE
    rspObj.errMsg = contentMessage.UNLISTED_PUBLISH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request || request.content || request.content.lastPublishedBy',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to unlisted published content',
        additionalInfo: {
          contentId: data.contentId,
          reqData: ekStepReqData
        }
      }, req)
      contentProvider.unlistedPublishContent(ekStepReqData, data.contentId, req.headers, function (err, res) {
        // After check response, we perform other operation
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : contentMessage.UNLISTED_PUBLISH.FAILED_CODE
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UNLISTED_PUBLISH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while fetching unlisted published content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, ekStepReqData }
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
      rspObj.result.content_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      rspObj.result.publishStatus = res.result.publishStatus
      emailService.unlistedPublishContentEmail(req, function () { })
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function assignBadge (req, response) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  logger.debug({
    msg: 'contentService.assignBadge() called', additionalInfo: { contentId: req.params.contentId, rspObj }
  }, req)
  if (!data.request || !data.request.content || !data.request.content.badgeAssertion) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.ASSIGN_BADGE.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.ASSIGN_BADGE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request || request.content || request.content.badgeAssertion',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  async.waterfall([function (CBW) {
    logger.debug({
      msg: 'Request to content provider to  get the content meta data',
      additionalInfo: {
        contentId: data.contentId,
        qs: data.queryParams
      }
    }, req)
    contentProvider.getContent(data.contentId, req.headers, function (err, res) {
      if (err || res.responseCode !== responseCode.SUCCESS) {
        rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.GET.FAILED_ERR_CODE}`
        rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET.FAILED_MESSAGE
        rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
        logger.error({
          msg: 'Getting error from content provider while getting content',
          err: {
            err,
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          },
          additionalInfo: { contentId: data.contentId }
        }, req)
        var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
        rspObj.result = res && res.result ? res.result : {}
        rspObj = utilsService.getErrorResponse(rspObj, res)
        return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
      } else {
        CBW(null, res)
      }
    })
  }, function (content, CBW) {
    var badgeAssertions = content.result.content.badgeAssertions
    var badges = badgeAssertions || []
    var newBadge = data.request.content.badgeAssertion
    var isBadgeExists = false

    lodash.forEach(badges, function (badge) {
      if (badge.assertionId === newBadge.assertionId &&
        badge.badgeId === newBadge.badgeId &&
        badge.issuerId === newBadge.issuerId) {
        isBadgeExists = true
      }
    })
    if (isBadgeExists === true) {
      rspObj.result = rspObj.result || {}
      rspObj.result.content = rspObj.result.content || {}
      rspObj.result.content.message = 'badge already exist'
      rspObj.responseCode = 'CONFLICT'
      logger.error({ msg: 'badge already exists', additionalInfo: { result: rspObj.result } }, req)
      return response.status(409).send(respUtil.successResponse(rspObj))
    } else {
      badges.push(newBadge)
      var requestBody = {
        'request': {
          'content': {
            'badgeAssertions': badges
          }
        }
      }
      contentProvider.systemUpdateContent(requestBody, data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.UPDATE.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while updating system content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, requestBody }
          }, req)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    }
  }, function (res) {
    rspObj.result = res.result
    logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
    return response.status(200).send(respUtil.successResponse(rspObj))
  }])
}

function revokeBadge (req, response) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  logger.debug({
    msg: 'contentService.revokeBadge() called', additionalInfo: { contentId: req.params.contentId, rspObj }
  }, req)
  if (!data.request || !data.request.content || !data.request.content.badgeAssertion) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.REVOKE_BADGE.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.REVOKE_BADGE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request || request.content || request.content.badgeAssertion',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  async.waterfall([function (CBW) {
    logger.debug({
      msg: 'Request to content provider to  get the content meta data',
      additionalInfo: {
        contentId: data.contentId,
        qs: data.queryParams
      }
    }, req)

    contentProvider.getContent(data.contentId, req.headers, function (err, res) {
      if (err || res.responseCode !== responseCode.SUCCESS) {
        rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.GET.FAILED_ERR_CODE}`
        rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.GET.FAILED_MESSAGE
        rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
        logger.error({
          msg: 'Getting error from content provider while getting content',
          err: {
            err,
            errCode: rspObj.errCode,
            errMsg: rspObj.errMsg,
            responseCode: rspObj.responseCode
          },
          additionalInfo: { contentId: data.contentId }
        }, req)
        var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
        rspObj.result = res && res.result ? res.result : {}
        rspObj = utilsService.getErrorResponse(rspObj, res)
        return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
      } else {
        CBW(null, res)
      }
    })
  }, function (content, CBW) {
    var badgeAssertions = content.result.content.badgeAssertions
    var badges = badgeAssertions || []
    var revokeBadge = lodash.cloneDeep(data.request.content.badgeAssertion)
    delete data.request.content.badgeAssertion
    var isbadgeExists = false

    lodash.remove(badges, function (badge) {
      if (badge.assertionId === revokeBadge.assertionId) {
        isbadgeExists = true
        return true
      }
    })
    if (isbadgeExists === false) {
      rspObj.result = rspObj.result || {}
      rspObj.result.content = rspObj.result.content || {}
      rspObj.result.content.message = 'badge not exist'
      logger.error({ msg: 'batch does not exists ', additionalInfo: { result: rspObj.result } }, req)
      return response.status(404).send(respUtil.successResponse(rspObj))
    } else {
      var requestBody = {
        'request': {
          'content': {
            'badgeAssertions': badges
          }
        }
      }
      contentProvider.systemUpdateContent(requestBody, data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.UPDATE.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while updating system content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { contentId: data.contentId, requestBody }
          }, req)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          CBW(null, res)
        }
      })
    }
  }, function (res) {
    rspObj.result = res.result
    logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
    return response.status(200).send(respUtil.successResponse(rspObj))
  }])
}

/**
 * This function helps to copy content
 * @param {type} req
 * @param {type} response
 * @returns {unresolved}
 */
function copyContentAPI (req, response) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  var query = {}
  if (req.query){
    query = req.query;
  }

  logger.debug({
    msg: 'contentService.copyContentAPI() called',
    additionalInfo: {
      contentId: req.params.contentId,
      rspObj
    }
  }, req)

  // Adding objectData in telemetry
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.contentId, 'content', '', {})
  }

  if (!data['contentId']) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.COPY.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.COPY.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to required contentId  missing',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to  to copy content',
        additionalInfo: {
          body: ekStepReqData
        }
      }, req)
      contentProvider.copyContentWithQuery(ekStepReqData, query, data['contentId'], req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.COPY.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.COPY.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider while copying content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { ekStepReqData, contentId: data['contentId'] }
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
      logger.debug({ msg: 'Sending response back to user', res: rspObj }, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }

  ])
}

function searchPluginsAPI (req, response, objectType) {
  var data = req.body
  var rspObj = req.rspObj

  logger.debug({
    msg: 'contentService.searchPluginsAPI() called', additionalInfo: { rspObj }
  }, req)

  if (!data.request || !data.request.filters) {
    rspObj.errCode = `${SERVICE_PREFIX}_${contentMessage.SEARCH_PLUGINS.MISSING_ERR_CODE}`
    rspObj.errMsg = contentMessage.SEARCH_PLUGINS.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request || request.filters',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  data.request.filters.objectType = ['content']
  data.request.filters.contentType = ['plugin']

  var requestData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      logger.debug({
        msg: 'Request to content provider to search the plugins',
        additionalInfo: {
          body: requestData
        }
      }, req)
      contentProvider.pluginsSearch(requestData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = res && res.params ? res.params.err : `${SERVICE_PREFIX}_${contentMessage.SEARCH_PLUGINS.FAILED_ERR_CODE}`
          rspObj.errMsg = res && res.params ? res.params.errmsg : contentMessage.SEARCH_PLUGINS.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          logger.error({
            msg: 'Getting error from content provider during plugins search',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: { requestData }
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
      logger.debug({
        msg: 'Content searched successfully',
        additionalInfo: { count: lodash.get(rspObj.result, 'count')
        }}, req)
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function validateContentLock (req, response) {
  var rspObj = req.rspObj
  var userId = req.get('x-authenticated-userid')
  var isRootOrgAdmin = lodash.has(req.body.request, "isRootOrgAdmin") ? req.body.request.isRootOrgAdmin : false
  logger.debug({ msg: 'contentService.validateContentLock() called', additionalInfo: { rspObj } }, req)
  var qs = {
    mode: 'edit'
  }
  contentProvider.getContentUsingQuery(req.body.request.resourceId, qs, req.headers, function (err, res) {
    if (err) {
      rspObj.result.validation = false
      rspObj.result.message = 'Unable to fetch content details'
      logger.error({ msg: 'Getting content details failed', err: { err, errMsg: rspObj.result.message } }, req)
      return response.status(500).send(respUtil.errorResponse(rspObj))
    } else if (res && res.responseCode !== responseCode.SUCCESS) {
      rspObj.result.validation = false
      rspObj.result.message = res.params.errmsg
      logger.error({ msg: 'Getting content details failed', err: { errMsg: rspObj.result.message }, res }, req)
      return response.status(500).send(respUtil.errorResponse(rspObj))
    } else {
      logger.debug({ msg: 'Getting content details success', res }, req)
      if (res.result.content.status !== 'Draft' && req.body.request.apiName !== 'retireLock' && !isRootOrgAdmin) {
        rspObj.result.validation = false
        rspObj.result.message = 'The operation cannot be completed as content is not in draft state'
        logger.warn({ msg: 'The operation cannot be completed as content is not in draft state' }, req)
        return response.status(200).send(respUtil.successResponse(rspObj))
      } else if (res.result.content.createdBy !== userId &&
        !lodash.includes(res.result.content.collaborators, userId)) {
        rspObj.result.validation = false
        rspObj.result.message = 'You are not authorized'
        logger.error({
          msg: 'You are not authorized',
          additionalInfo: { userId, createdBy: res.result.content.createdBy },
          err: { errMsg: rspObj.result.message }
        }, req)
        return response.status(200).send(respUtil.successResponse(rspObj))
      } else {
        rspObj.result.validation = true
        rspObj.result.message = 'Content successfully validated'
        rspObj.result.contentdata = res.result.content
        logger.debug({ msg: 'Content successfully validated' }, req)
        return response.status(200).send(respUtil.successResponse(rspObj))
      }
    }
  })
}

module.exports.searchAPI = searchAPI
module.exports.searchContentAPI = searchContentAPI
module.exports.createContentAPI = createContentAPI
module.exports.updateContentAPI = updateContentAPI
module.exports.uploadContentAPI = uploadContentAPI
module.exports.reviewContentAPI = reviewContentAPI
module.exports.publishContentAPI = publishContentAPI
module.exports.getContentAPI = getContentAPI
module.exports.getMyContentAPI = getMyContentAPI
module.exports.retireContentAPI = retireContentAPI
module.exports.rejectContentAPI = rejectContentAPI
module.exports.flagContentAPI = flagContentAPI
module.exports.acceptFlagContentAPI = acceptFlagContentAPI
module.exports.rejectFlagContentAPI = rejectFlagContentAPI
module.exports.uploadContentUrlAPI = uploadContentUrlAPI
module.exports.unlistedPublishContentAPI = unlistedPublishContentAPI
module.exports.assignBadgeAPI = assignBadge
module.exports.revokeBadgeAPI = revokeBadge
module.exports.copyContentAPI = copyContentAPI
module.exports.searchPluginsAPI = searchPluginsAPI
module.exports.validateContentLock = validateContentLock
