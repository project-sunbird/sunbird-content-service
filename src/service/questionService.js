/**
 * @file  : questionService.js
 * @author: Harish Kumar Gangula
 * @desc  : controller file for questions
 */

var respUtil = require('response_util')
var contentProviderUtil = require('sb_content_provider_util')
var logger = require('sb_logger_util_v2')
var messageUtils = require('./messageUtil')
var utilsService = require('./utilsService')
var _ = require('lodash')
var responseCode = messageUtils.RESPONSE_CODE
const questionAllFields = 'name,code,description,mimeType,primaryCategory,additionalCategories,' +
'visibility,copyright,license,lockKey,assets,audience,author,owner,attributions,consumerId,' +
'contentEncoding,contentDisposition,appIcon,publishCheckList,publishComment,compatibilityLevel,' +
'status,prevState,prevStatus,lastStatusChangedOn,keywords,pkgVersion,version,versionKey,language,' +
'channel,framework,subject,medium,board,gradeLevel,topic,boardIds,gradeLevelIds,subjectIds,mediumIds,' +
'topicsIds,targetFWIds,targetBoardIds,targetGradeLevelIds,targetSubjectIds,targetMediumIds,targetTopicIds,' +
'createdOn,createdFor,createdBy,lastUpdatedOn,lastUpdatedBy,lastSubmittedOn,lastSubmittedBy,publisher,' +
'lastPublishedOn,lastPublishedBy,publishError,reviewError,body,editorState,answer,solutions,instructions,' +
'hints,media,responseDeclaration,interactions,qType,scoringMode,qumlVersion,timeLimit,maxScore,showTimer,' +
'showFeedback,showSolutions,interactionTypes,templateId,bloomsLevel,feedback,responseProcessing,' +
'templateDeclaration,dailySummaryReportEnabled,allowAnonymousAccess,termsAndConditions,expectedDuration,' +
'completionCriteria,collaborators,semanticVersion,schemaVersion'

/**
 * This function helps to get all domain from ekstep
 * @param {Object} req
 * @param {Object} response
 */

function readQuestion (identifier, query, headers) {
  return (new Promise((resolve, reject) => {
    contentProviderUtil.readQuestion(identifier, query, headers, (error, res) => {
      if (error) {
        reject(error)
      } else {
        if (res.responseCode !== responseCode.SUCCESS) {
          reject(res)
        } else {
          resolve(res)
        }
      }
    })
  }))
}

function getList (req, response) {
  delete req.headers['accept-encoding']
  logger.debug({ msg: 'questionService.getList() called' }, req)
  utilsService.logDebugInfo('question-list', req.rspObj, 'question list api called')
  let data = {}
  let rspObj = req.rspObj
  data.body = req.body
  req.query.fields = req.query.fields || questionAllFields
  data.query = req.query

  let questionIds = _.get(data, 'body.request.search.identifier')
  if (_.isEmpty(questionIds) || !_.isArray(questionIds)) {
    rspObj.responseCode = responseCode.CLIENT_ERROR
    rspObj.errMsg = 'Either identifier is missing or it is not list type'
    logger.error({
      msg: rspObj.errMsg,
      additionalInfo: { data },
      err: { responseCode: rspObj.responseCode }
    }, req)
    utilsService.logErrorInfo('question-list', rspObj, rspObj.errMsg)
    return response.status(400).send(respUtil.errorResponse(rspObj))
  }
  const questionsLimit = parseInt(process.env.questions_list_limit, 10) || 20
  questionIds = _.take(questionIds, questionsLimit)
  logger.debug({ msg: 'Request to get questions by ids ', additionalInfo: { questionIds } }, req)
  utilsService.logDebugInfo('question-list', rspObj, 'Request to get questions by ids')

  const questionsRequestPromises = questionIds.map(id => {
    return readQuestion(id, req.query, req.headers)
  })

  Promise.all(questionsRequestPromises).then(questionResponses => {
    rspObj.result = {questions: []}
    rspObj.result.questions = questionResponses.map(questionResponse => {
      return _.get(questionResponse, 'result.question')
    })
    rspObj.result.count = questionResponses.length
    logger.debug({ msg: 'questions details', additionalInfo: { questionResponses } }, req)
    utilsService.logDebugInfo('question-list', rspObj, 'questions details')
    return response.status(200).send(respUtil.successResponse(rspObj))
  }).catch(err => {
    rspObj.responseCode = _.get(err, 'responseCode') || responseCode.SERVER_ERROR
    const errorObject = { err, responseCode: rspObj.responseCode }
    rspObj.errMsg = 'Getting error  fetching questions by ids'
    logger.error({ msg: rspObj.errMsg, additionalInfo: { questionIds }, err: errorObject }, req)
    utilsService.logErrorInfo('question-list', rspObj, err)
    var httpStatus = err && err.statusCode >= 100 && err.statusCode < 600 ? err.statusCode : 500
    rspObj.result = err && err.result ? err.result : {}
    rspObj = utilsService.getErrorResponse(rspObj, err)
    return response.status(httpStatus).send(respUtil.errorResponse(rspObj))
  })
}

module.exports.getList = getList
