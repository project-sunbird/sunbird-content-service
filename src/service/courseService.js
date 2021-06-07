/**
 * @name : courseService.js
 * @description :: Responsible for handle course service
 * @author      :: Anuj Gupta
 */

var async = require('async')
var randomString = require('randomstring')
var contentProvider = require('sb_content_provider_util')
var respUtil = require('response_util')
var validatorUtil = require('sb_req_validator_util')
var logger = require('sb_logger_util_v2')
var _ = require('underscore')
var lodash = require('lodash')

var courseModel = require('../models/courseModel').COURSE
var messageUtils = require('./messageUtil')
var utilsService = require('../service/utilsService')
var orgHelper = require('../helpers/orgHelper')
var licenseHelper = require('../helpers/licenseHelper')
var CacheManager = require('sb_cache_manager')
var cacheManager = new CacheManager({})

var courseMessage = messageUtils.COURSE
var responseCode = messageUtils.RESPONSE_CODE
const SERVICE_PREFIX = 'COU'

/**
 * This function help to transform the object body with oldKey and newKey
 * @param {Object} body
 * @param {String} oldKey
 * @param {String} newKey
 * @returns {nm$_courseService.transformReqBody.ekStepReqData}
 */
function transformReqBody (body, oldKey, newKey) {
  var ekStepReqData = {
    request: {}
  }
  for (var key in body) {
    if (key === oldKey) {
      ekStepReqData.request[newKey] = body[oldKey]
      return ekStepReqData
    }
  }
}

/**
 * This function help to transform the object body with oldKey and newKey
 * @param {Object} body
 * @param {String} oldKey
 * @param {String} newKey
 * @returns {nm$_courseService.transformReqBody.ekStepReqData}
 */
function transformResBody (body, oldKey, newKey) {
  var ekStepReqData = body || {}
  for (var key in body) {
    if (key === oldKey) {
      ekStepReqData[newKey] = body[oldKey]
      delete ekStepReqData[oldKey]
      return ekStepReqData
    }
  }
}

/**
 * This function helps to generate code for create content
 * @returns {String}
 */
function getCode () {
  return courseMessage.PREFIX_CODE + randomString.generate(6)
}

/**
 * This function return the mimeType for create course
 * @returns {String}
 */
function getMimeTypeForCourse () {
  return courseMessage.MIME_TYPE
}

/**
 * This function return the contentType for create course
 * @returns {String}
 */
function getContentTypeForCourse () {
  return courseMessage.CONTENT_TYPE
}

/**
 * this function helps to search course using content provider api
 * @param {object} req
 * @param {object} response
 * @returns {Object} object with error or success response with http status code
 */
function searchCourseAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.filters) {
    rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.SEARCH.MISSING_ERR_CODE}`
    rspObj.errMsg = courseMessage.SEARCH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('courseSearch', rspObj, 'Error due to missing request body or filters')
    logger.error({
      msg: 'Error due to missing request body or filters',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  data.request.filters.contentType = getContentTypeForCourse()
  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      utilsService.logDebugInfo('courseSearch', rspObj, 'Request to content provider for course composite search')
      logger.debug({ msg: 'Request to content provider for course composite search', additionalInfo: { data } }, req)

      contentProvider.compositeSearch(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.SEARCH.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.SEARCH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          rspObj.errMsg = 'Error from content provider during composite search'
          utilsService.logErrorInfo('courseSearch', rspObj, err)
          logger.error({
            msg: 'Error from content provider during composite search',
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
          if (req.query.framework && req.query.framework !== 'null') {
            getFrameworkDetails(req, function (err, data) {
              if (err || res.responseCode !== responseCode.SUCCESS) {
                rspObj.errMsg = 'Error - framework details'
                utilsService.logErrorInfo('courseSearch', rspObj, err)
                logger.error({msg: 'Error - framework details', additionalInfo: {framework: req.query.framework}}, req)
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
      if (res.result.content) {
        rspObj.result = transformResBody(res.result, 'content', 'course')
        rspObj.result.count = res.result.count
      }
      utilsService.logDebugInfo('courseSearch', rspObj, `${rspObj.result.count} - course search results found`)
      logger.debug({msg: `${rspObj.result.count} - course search results found`}, req)

      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

function getFrameworkDetails (req, CBW) {
  let rspObj = req.rspObj
  let objectInfo = {'id': _.get(req, 'query.framework'), 'type': 'Framework'}
  cacheManager.get(req.query.framework, function (err, data) {
    if (err || !data) {
      contentProvider.getFrameworkById(req.query.framework, '', req.headers, function (err, result) {
        if (err || result.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error - framework details'
          utilsService.logErrorInfo('frameworkRead', rspObj, err, objectInfo)
          logger.error({msg: 'Error - framework details', err, additionalInfo: {framework: req.query.framework}}, req)
          CBW(new Error('Fetching framework data failed'), null)
        } else {
          cacheManager.set({ key: req.query.framework, value: result },
            function (err, data) {
              if (err) {
                rspObj.errMsg = 'Error - caching'
                utilsService.logErrorInfo('frameworkRead', rspObj, err, objectInfo)
                logger.error({msg: 'Error - caching', err, additionalInfo: {framework: req.query.framework}}, req)
              } else {
                rspObj.errMsg = 'Caching framework - done'
                utilsService.logDebugInfo('frameworkRead', rspObj, err, objectInfo)
                logger.debug({msg: 'Caching framework - done', additionalInfo: {framework: req.query.framework}}, req)
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
    logger.warn({msg: 'Error while parsing translation data ', err: e})
    return null
  }
}

/**
 * this function helps to create course using content provider api
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function createCourseAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.course || !validatorUtil.validate(data.request.course, courseModel.CREATE)) {
    // prepare
    rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.CREATE.MISSING_ERR_CODE}`
    rspObj.errMsg = courseMessage.CREATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('courseCreate', rspObj, 'Error due to missing request body or course')
    logger.error({
      msg: 'Error due to missing request body or course ',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Tranform request for Ekstep
  data.request.course.code = getCode()
  data.request.course.mimeType = getMimeTypeForCourse()
  data.request.course.contentType = getContentTypeForCourse()

  var ekStepReqData = transformReqBody(data.request, 'course', 'content')

  async.waterfall([

    function (CBW) {
      utilsService.logDebugInfo('courseCreate', rspObj, 'Request to content provider for creating course')
      logger.debug({ msg: 'Request to content provider for creating course', additionalInfo: { data } }, req)
      contentProvider.createContent(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.CREATE.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.CREATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseCreate', rspObj, err)
          logger.error({
            msg: 'Error from content provider during content creation',
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
      rspObj.result.course_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      // Adding objectData in telemetry
      if (rspObj.telemetryData) {
        rspObj.telemetryData.object = utilsService.getObjectData(rspObj.result.course_id, 'course', '', {})
      }
      return response.status(200).send(respUtil.successResponse(rspObj))
    }

  ])
}

/**
 * this function helps to update course using content provider api
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function updateCourseAPI (req, response) {
  var data = req.body
  data.courseId = req.params.courseId
  var objectInfo = {'id': _.get(data, 'courseId'), 'type': 'Course'}

  var rspObj = req.rspObj
  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.courseId, 'course', '', {})
  }

  if (!data.request || !data.request.course || !validatorUtil.validate(data.request.course, courseModel.UPDATE)) {
    rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.UPDATE.MISSING_ERR_CODE}`
    rspObj.errMsg = courseMessage.UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('courseUpdate', rspObj, 'Error due to missing request body or course details', objectInfo)
    logger.error({
      msg: 'Error due to missing request body or course details ',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }

  // Tranform request for Ekstep
  delete data.request.course['mimeType']
  delete data.request.course['contentType']

  async.waterfall([

    function (CBW) {
      var qs = {
        mode: 'edit'
      }
      utilsService.logDebugInfo('courseUpdate', rspObj, 'Request to content provider for updating course', objectInfo)
      logger.debug({ msg: 'Request to content provider for updating course', additionalInfo: { data } }, req)
      contentProvider.getContentUsingQuery(data.courseId, qs, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.UPDATE.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseUpdate', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while fetching content using query',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {courseId: data.courseId, qs}
          }, req)
          var httpStatus = res && res.statusCode >= 100 && res.statusCode < 600 ? res.statusCode : 500
          rspObj.result = res && res.result ? res.result : {}
          rspObj = utilsService.getErrorResponse(rspObj, res)
          return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
        } else {
          data.request.course.versionKey = res.result.content.versionKey
          CBW()
        }
      })
    },
    function (CBW) {
      var ekStepReqData = transformReqBody(data.request, 'course', 'content')
      contentProvider.updateContent(ekStepReqData, data.courseId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.UPDATE.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseUpdate', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while updating content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {courseId: data.courseId, ekStepReqData}
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
      rspObj.result.course_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * this function helps to review course using content provider api
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function reviewCourseAPI (req, response) {
  var data = {
    body: req.body
  }
  var rspObj = req.rspObj
  data.courseId = req.params.courseId
  var objectInfo = {'id': _.get(data, 'courseId'), 'type': 'Course'}

  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.courseId, 'course', '', {})
  }
  var ekStepReqData = {
    request: data.request
  }

  async.waterfall([

    function (CBW) {
      utilsService.logDebugInfo('courseReview', rspObj, 'Request to content provider to review course', objectInfo)
      logger.debug({ msg: 'Request to content provider to review course', additionalInfo: { data } }, req)
      contentProvider.reviewContent(ekStepReqData, data.courseId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.REVIEW.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.REVIEW.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseReview', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while reviewing content',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
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
      rspObj.result.course_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * this function helps to publish course using content provider api
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function publishCourseAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj
  data.courseId = req.params.courseId
  var objectInfo = {'id': _.get(data, 'courseId'), 'type': 'Course'}

  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.courseId, 'course', '', {})
  }

  if (!data.request || !data.request.course || !data.request.course.lastPublishedBy) {
    rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.PUBLISH.MISSING_ERR_CODE}`
    rspObj.errMsg = courseMessage.PUBLISH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('coursePublish',
      rspObj,
      'Error due to missing request body or course or lastPublishedBy property in course',
      objectInfo)
    logger.error({
      msg: 'Error due to missing request body or course or lastPublishedBy property in course',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  var ekStepReqData = transformReqBody(data.request, 'course', 'content')

  async.waterfall([

    function (CBW) {
      utilsService.logDebugInfo('coursePublish', rspObj, 'Request to content provider to publish course', objectInfo)
      logger.debug({ msg: 'Request to content provider to publish course', additionalInfo: { data } }, req)
      contentProvider.publishContent(ekStepReqData, data.courseId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.PUBLISH.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.PUBLISH.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('coursePublish', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while publishing course',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
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
      rspObj.result.course_id = res.result.node_id
      rspObj.result.versionKey = res.result.versionKey
      rspObj.result.publishStatus = res.result.publishStatus.replace('Content Id', 'Course Id')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * this function helps to get course of user
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function getCourseAPI (req, response) {
  var data = {}
  var rspObj = req.rspObj

  data.body = req.body
  data.courseId = req.params.courseId
  var objectInfo = {'id': _.get(data, 'courseId'), 'type': 'Course'}

  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.courseId, 'course', '', {})
  }

  if (!data.courseId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.GET.FAILED_ERR_CODE}`
    rspObj.errMsg = courseMessage.GET.FAILED_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('courseRead', rspObj, 'Error due to missing courseId', objectInfo)
    logger.error({
      msg: 'Error due to missing courseId',
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
      utilsService.logDebugInfo('courseRead',
        rspObj,
        'Request to content provider to get Course Details',
        objectInfo)
      logger.debug({ msg: 'Request to content provider to get Course Details', additionalInfo: { data } }, req)
      contentProvider.getContent(data.courseId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.GET.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.GET.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseRead', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while fetching course',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
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
    function (res, CBW) {
      orgHelper.includeOrgDetails(req, res, CBW)
    },
    function (res, CBW) {
      licenseHelper.includeLicenseDetails(req, res, CBW)
    },
    function (res) {
      rspObj.result = transformResBody(res.result, 'content', 'course')
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * this function helps to get course of user
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function getMyCourseAPI (req, response) {
  var request = {
    'filters': {
      // "createdBy": req.userId
      'createdBy': req.params.createdBy,
      'contentType': getContentTypeForCourse()
    }

  }
  req.body.request = request
  var ekStepReqData = {
    request: request
  }
  var rspObj = req.rspObj

  async.waterfall([

    function (CBW) {
      utilsService.logDebugInfo('courseRead', rspObj, 'Request to content provider to get Course Details')
      logger.debug({ msg: 'Request to content provider to get Course Details', additionalInfo: { data: request } }, req)
      contentProvider.compositeSearch(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.GET_MY.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.GET_MY.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseRead', rspObj, err)
          logger.error({
            msg: 'Error from content provider during composite search',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {data: request}
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
      if (res.result.content) {
        rspObj.result = transformResBody(res.result, 'content', 'course')
        rspObj.result.count = res.result.count
      }
      utilsService.logDebugInfo('courseSearch', rspObj, `${rspObj.result.count} - my course search results count`)
      logger.debug({msg: `${rspObj.result.count} - my course search results count`}, req)

      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * this function helps to get course of user
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function getCourseHierarchyAPI (req, response) {
  var data = {}
  var rspObj = req.rspObj

  data.body = req.body
  data.courseId = req.params.courseId
  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.courseId, 'course', '', {})
  }

  if (!data.courseId) {
    rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.HIERARCHY.MISSING_ERR_CODE}`
    rspObj.errMsg = courseMessage.HIERARCHY.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('courseHierarchy', rspObj, 'Error due to missing courseId')
    logger.error({
      msg: 'Error due to missing courseId',
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
      utilsService.logDebugInfo('courseHierarchy', rspObj, 'Request to content provider to get content Hierarchy')
      logger.debug({ msg: 'Request to content provider to get content Hierarchy', additionalInfo: { data } }, req)
      contentProvider.contentHierarchy(data.courseId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.HIERARCHY.FAILED_ERR_CODE}`
          rspObj.errMsg = courseMessage.HIERARCHY.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseHierarchy', rspObj, err)
          logger.error({
            msg: 'Error from content provider while getting content hierarchy',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {courseId: data.courseId}
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
    function (res) {
      rspObj.result = res.result
      return response.status(200).send(respUtil.successResponse(rspObj))
    }
  ])
}

/**
 * this function helps to update course hierarchy
 * @param {Object} req
 * @param {Object} response
 * @returns {Object} object with error or success response with http status code
 */
function updateCourseHierarchyAPI (req, response) {
  var data = req.body
  var rspObj = req.rspObj

  if (!data.request || !data.request.data || !data.request.data.hierarchy) {
    rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.HIERARCHY_UPDATE.MISSING_CODE}`
    rspObj.errMsg = courseMessage.HIERARCHY_UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    utilsService.logErrorInfo('courseUpdateHierarchy',
      rspObj,
      'error due to missing request or request.data or data hierarchy info')
    logger.error({
      msg: 'Error due to missing request or request.data or data hierarchy info',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {data}
    }, req)

    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  var hierarchy = data.request.data.hierarchy
  data.courseId = _.findKey(hierarchy, function (item) {
    if (item.root === true) return item
  })

  // Adding objectData in telemetryData object
  if (rspObj.telemetryData) {
    rspObj.telemetryData.object = utilsService.getObjectData(data.courseId, 'course', '', {})
  }

  async.waterfall([
    function (CBW) {
      var ekStepReqData = {request: data.request}
      utilsService.logDebugInfo('courseUpdateHierarchy',
        rspObj,
        'Request to content provider to update content Hierarchy')
      logger.debug({ msg: 'Request to content provider to update content Hierarchy', additionalInfo: { data } }, req)
      contentProvider.contentHierarchyUpdate(ekStepReqData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errCode = `${SERVICE_PREFIX}_${courseMessage.HIERARCHY_UPDATE.FAILED_CODE}`
          rspObj.errMsg = courseMessage.HIERARCHY_UPDATE.FAILED_MESSAGE
          rspObj.responseCode = res && res.responseCode ? res.responseCode : responseCode.SERVER_ERROR
          utilsService.logErrorInfo('courseUpdateHierarchy', rspObj, err)
          logger.error({
            msg: 'Error from content provider while updating content hierarchy',
            err: {
              err,
              errCode: rspObj.errCode,
              errMsg: rspObj.errMsg,
              responseCode: rspObj.responseCode
            },
            additionalInfo: {courseId: data.courseId}
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

module.exports.searchCourseAPI = searchCourseAPI
module.exports.createCourseAPI = createCourseAPI
module.exports.updateCourseAPI = updateCourseAPI
module.exports.reviewCourseAPI = reviewCourseAPI
module.exports.publishCourseAPI = publishCourseAPI
module.exports.getCourseAPI = getCourseAPI
module.exports.getMyCourseAPI = getMyCourseAPI
module.exports.getCourseHierarchyAPI = getCourseHierarchyAPI
module.exports.updateCourseHierarchyAPI = updateCourseHierarchyAPI
