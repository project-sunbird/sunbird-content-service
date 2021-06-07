var async = require('async')
var contentProvider = require('sb_content_provider_util')
var utilsService = require('./utilsService')
var messageUtils = require('./messageUtil')
var emailMessage = messageUtils.EMAIL
var responseCode = messageUtils.RESPONSE_CODE
var configUtil = require('sb-config-util')
var _ = require('lodash')
var logger = require('sb_logger_util_v2')

/**
 * Offset for fetching reviewer list
 */
var reviewerQueryLimit = 200

/**
 * Below function is used to create email request object
 * @param {string} name
 * @param {string} subject
 * @param {string} body
 * @param {string} actionUrl
 * @param {string} actionName
 * @param {string} emailArray
 * @param {string} recipientUserIds
 * @param {string} emailTemplateType
 * @param {string} imageUrl
 * @param {string} orgName
 * @param {string} fromEmail
 */
function getEmailData (name, subject, body, actionUrl, actionName, emailArray,
  recipientUserIds, emailTemplateType, imageUrl, orgName, fromEmail) {
  var request = {
    name: name,
    subject: subject,
    body: body,
    actionUrl: actionUrl,
    actionName: actionName,
    recipientEmails: emailArray,
    recipientUserIds: recipientUserIds,
    emailTemplateType: emailTemplateType,
    orgImageUrl: imageUrl,
    orgName: orgName,
    fromEmail: fromEmail
  }
  return request
}

/**
 * Below function is used for send email when flag content api called
 * @param {object} req
 * @param {function} callback
 */
function createFlagContentEmail (req, callback) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  let objectInfo = {'id': _.get(data, 'contentId'), 'type': 'Content'}

  if (!data.contentId) {
    utilsService.logErrorInfo('contentFlagEmail', rspObj, 'content Id is missing', objectInfo)
    logger.error({ msg: 'content Id is missing', additionalInfo: { data } }, req)

    return callback(new Error('Required content id is missing'), null)
  }
  async.waterfall([
    function (CBW) {
      contentProvider.getContent(data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while fetching content'
          utilsService.logErrorInfo('contentFlagEmail', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while fetching content',
            err,
            additionalInfo: { data }
          }, req)
          callback(new Error('Invalid content id'), null)
        } else {
          data.request.contentData = res.result.content
          CBW()
        }
      })
    },
    function (CBW) {
      var cData = data.request.contentData
      var eData = emailMessage.CREATE_FLAG
      var flagReasons = cData.flagReasons ? cData.flagReasons.toString() : ''
      var subject = eData.SUBJECT.replace(/{{Content type}}/g, cData.contentType)
        .replace(/{{Content title}}/g, cData.name)
      var body = eData.BODY.replace(/{{Content type}}/g, cData.contentType)
        .replace(/{{Content title}}/g, cData.name)
        .replace(/{{Flag reason}}/g, flagReasons)
        .replace(/{{Content status}}/g, cData.status)
      var lsEmailData = {
        request: getEmailData(null, subject, body, null, null, null, [cData.createdBy], eData.TEMPLATE)
      }
      contentProvider.sendEmail(lsEmailData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error while sending email'
          utilsService.logErrorInfo('contentFlagEmail', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error while sending email',
            err,
            additionalInfo: { emailData: lsEmailData }
          }, req)
          callback(new Error('Sending email failed'), null)
        } else {
          CBW(null, res)
        }
      })
    },

    function (res) {
      callback(null, true)
    }
  ])
}

/**
 * Below function is used to send email when accept flag api called
 * @param {object} req
 * @param {function} callback
 */
function acceptFlagContentEmail (req, callback) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  let objectInfo = {'id': _.get(data, 'contentId'), 'type': 'Content'}

  if (!data.contentId) {
    utilsService.logErrorInfo('contentAcceptFlagEmail', rspObj, 'content Id is missing', objectInfo)
    logger.error({ msg: 'content Id is missing', additionalInfo: { data } }, req)

    callback(new Error('Content id is missing'), null)
  }
  async.waterfall([
    function (CBW) {
      contentProvider.getContent(data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while fetching content'
          utilsService.logErrorInfo('contentAcceptFlagEmail',
            rspObj,
            err,
            objectInfo)
          logger.error({
            msg: 'Error from content provider while fetching content',
            err,
            additionalInfo: { data }
          }, req)
          callback(new Error('Invalid content id'), null)
        } else {
          data.request.contentData = res.result.content
          CBW()
        }
      })
    },
    function (CBW) {
      var cData = data.request.contentData
      var flagReasons = cData.flagReasons ? cData.flagReasons.toString() : ''
      var eData = emailMessage.ACCEPT_FLAG
      var subject = eData.SUBJECT.replace(/{{Content type}}/g, cData.contentType)
      var body = eData.BODY.replace(/{{Content type}}/g, cData.contentType)
        .replace(/{{Content title}}/g, cData.name)
        .replace(/{{Flag reason}}/g, flagReasons)
      var lsEmailData = {
        request: getEmailData(null, subject, body, null, null, null, [cData.createdBy], eData.TEMPLATE)
      }
      contentProvider.sendEmail(lsEmailData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while fetching content'
          utilsService.logErrorInfo('contentAcceptFlagEmail',
            rspObj,
            err,
            objectInfo)
          logger.error({
            msg: 'Error from content provider while fetching content',
            err,
            additionalInfo: { data }
          }, req)

          callback(new Error('Sending email failed'), null)
        } else {
          CBW(null, res)
        }
      })
    },

    function (res) {
      callback(null, true)
    }
  ])
}

/**
 * Below function is used for send email when reject flag api called
 * @param {object} req
 * @param {function} callback
 */
function rejectFlagContentEmail (req, callback) {
  var data = req.body
  data.contentId = req.params.contentId
  var rspObj = req.rspObj
  let objectInfo = {'id': _.get(data, 'contentId'), 'type': 'Content'}

  if (!data.contentId) {
    utilsService.logErrorInfo('contentRejectFlagEmail', rspObj, 'content Id is missing')
    logger.error({ msg: 'content Id is missing', additionalInfo: { data } }, req)
    callback(new Error('Content id is missing'), null)
  }
  async.waterfall([
    function (CBW) {
      contentProvider.getContent(data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while fetching content'
          utilsService.logErrorInfo('contentRejectFlagEmail', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while fetching content',
            err,
            additionalInfo: { data }
          }, req)
          callback(new Error('Invalid content id'), null)
        } else {
          data.request.contentData = res.result.content
          CBW()
        }
      })
    },
    function (CBW) {
      var cData = data.request.contentData
      var eData = emailMessage.REJECT_FLAG
      var subject = eData.SUBJECT.replace(/{{Content type}}/g, cData.contentType)
        .replace(/{{Content title}}/g, cData.name)
      var body = eData.BODY.replace(/{{Content type}}/g, cData.contentType)
        .replace(/{{Content title}}/g, cData.name)
        .replace(/{{Content status}}/g, cData.status)
      var lsEmailData = {
        request: getEmailData(null, subject, body, null, null, null, [cData.createdBy], eData.TEMPLATE)
      }
      contentProvider.sendEmail(lsEmailData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while sending email'
          utilsService.logErrorInfo('contentRejectFlagEmail',
            rspObj,
            err,
            objectInfo)
          logger.error({
            msg: 'Error from content provider while sending email',
            err,
            additionalInfo: { emailData: lsEmailData }
          }, req)
          callback(new Error('Sending email failed'), null)
        } else {
          CBW(null, res)
        }
      })
    },

    function (res) {
      callback(null, true)
    }
  ])
}

/**
 * Below function is used to fetch content details using content id
 * @param {object} req
 */
function getContentDetails (req) {
  let rspObj = req.rspObj
  let objectInfo = {'id': _.get(req, 'params.contentId'), 'type': 'Content'}
  return function (callback) {
    contentProvider.getContent(req.params.contentId, req.headers, function (err, result) {
      if (err || result.responseCode !== responseCode.SUCCESS) {
        rspObj.errMsg = 'Error from content provider while fetching content'
        utilsService.logErrorInfo('contentRead', rspObj, err, objectInfo)
        logger.error({
          msg: 'Error from content provider while fetching content',
          err,
          additionalInfo: { contentId: req.params.contentId }
        }, req)
        callback(new Error('Invalid content id'), null)
      } else {
        callback(null, result)
      }
    })
  }
}

/**
 * Below function is used to fetch email template using Form API
 * @param {object} formRequest
 */
function getTemplateConfig (formRequest) {
  return function (callback) {
    contentProvider.getForm(formRequest, {}, function (err, result) {
      if (err || result.responseCode !== responseCode.SUCCESS) {
        callback(new Error('Form API failed'), null)
      } else {
        callback(null, result)
      }
    })
  }
}

/**
 * Below function is used to fetch user details
 * @param {object} formRequest
 */
function getUserDetails (req) {
  let objectInfo = {'id': req.get('x-authenticated-userid'), 'type': 'User'}
  let rspObj = req.rspObj
  return function (callback) {
    delete req.headers['accept-encoding']
    var data = {
      'request': {
        'filters': {
          'userId': req.get('x-authenticated-userid')
        }
      }
    }
    contentProvider.userSearch(data, req.headers, function (err, result) {
      if (err || result.responseCode !== responseCode.SUCCESS) {
        rspObj.errMsg = 'Error from content provider while fetching user Details'
        utilsService.logErrorInfo('userRead', rspObj, err, objectInfo)
        logger.error({
          msg: 'Error from content provider while fetching user Details',
          err: err || result,
          additionalInfo: { data }
        }, req)
        callback(new Error('User Search failed'), null)
      } else {
        callback(null, result)
      }
    })
  }
}

/**
 * Below function is used construct content link which will be sent to the
 * content creator after the content is published
 * @param {object} content
 */
function getPublishedContentUrl (content) {
  var baseUrl = configUtil.getConfig('SUNBIRD_PORTAL_BASE_URL')
  if (content.mimeType === 'application/vnd.ekstep.content-collection') {
    if (content.contentType !== 'Course') {
      return baseUrl + '/resources/play/collection/' + content.identifier
    } else {
      return baseUrl + '/learn/course/' + content.identifier
    }
  } else if (content.mimeType === 'application/vnd.ekstep.ecml-archive') {
    return baseUrl + '/resources/play/content/' + content.identifier
  } else {
    return baseUrl + '/resources/play/content/' + content.identifier
  }
}
/**
 * Below function is used construct content link which will be sent to creator
 * after the content is rejected
 * @param {object} content
 */
function getDraftContentUrl (content) {
  var baseUrl = configUtil.getConfig('SUNBIRD_PORTAL_BASE_URL') + '/workspace/content/edit'
  if (content.mimeType === 'application/vnd.ekstep.content-collection') {
    return baseUrl + '/collection/' + content.identifier + '/' + content.contentType +
      '/draft/' + content.framework + '/Draft'
  } else if (content.mimeType === 'application/vnd.ekstep.ecml-archive') {
    return baseUrl + '/content/' + content.identifier + '/draft/' + content.framework + '/Draft'
  } else {
    return baseUrl + '/generic/' + content.identifier + '/uploaded/' + content.framework + '/Draft'
  }
}

/**
 * Below function is used construct content link which will be sent to reviewers
 * @param {object} content
 */
function getReviewContentUrl (content) {
  var baseUrl = configUtil.getConfig('SUNBIRD_PORTAL_BASE_URL') + '/workspace/content'
  if (content.mimeType === 'application/vnd.ekstep.content-collection') {
    return baseUrl + '/edit/collection/' + content.identifier + '/' + content.contentType +
      '/upForReview/' + content.framework
  } else if (content.mimeType === 'application/vnd.ekstep.ecml-archive') {
    return baseUrl + '/upForReview/content/' + content.identifier
  } else {
    return baseUrl + '/upForReview/content/' + content.identifier
  }
}

/**
 * Below function is used to send email
 * @param {object} req
 * @param {function} action
 * @param {function} callback
 */
function sendContentEmail (req, action, callback) {
  let rspObj = req.rspObj
  let objectInfo = {'id': _.get(req, 'params.contentId'), 'type': 'Content'}

  if (!req.params.contentId) {
    utilsService.logErrorInfo('sendContentEmail', rspObj, 'content Id is missing')
    logger.error({ msg: 'content Id is missing', additionalInfo: { contentId: req.params.contentId } }, req)
    callback(new Error('Content id is missing'), null)
  }
  var formRequest = {
    request: {
      'type': 'notification',
      'action': action,
      'subType': 'email',
      'rootOrgId': req.get('x-channel-id')
    }
  }
  async.waterfall([
    function (callback) {
      async.parallel({
        contentDetails: getContentDetails(req),
        templateConfig: getTemplateConfig(formRequest)
      }, function (err, results) {
        if (err) {
          rspObj.errMsg = 'getContentDetails or getTemplateConfig failed'
          utilsService.logErrorInfo('sendContentEmail', rspObj, err, objectInfo)
          logger.error({
            msg: 'getContentDetails or getTemplateConfig failed',
            additionalInfo: { formRequest, contentId: req.params.contentId }
          }, req)
          callback(err, null)
        } else {
          callback(null, results)
        }
      })
    },
    function (data, callback) {
      if (_.get(data.contentDetails, 'result.content') &&
        _.get(data.templateConfig, 'result.form.data.fields[0]')) {
        var cData = data.contentDetails.result.content
        var eData = data.templateConfig.result.form.data.fields[0]
        var subject = eData.subject
        var body = eData.body

        // Creating content link for email template
        var contentLink = ''
        if (action === 'requestForChanges') {
          contentLink = getDraftContentUrl(cData)
        } else if (action === 'publish') {
          contentLink = getPublishedContentUrl(cData)
        }

        // Replacing dynamic content data with email template
        subject = subject.replace(/{{Content type}}/g, cData.contentType)
          .replace(/{{Content title}}/g, cData.name)
        body = body.replace(/{{Content type}}/g, cData.contentType)
          .replace(/{{Content title}}/g, cData.name)
          .replace(/{{Content link}}/g, contentLink)
          .replace(/{{Creator name}}/g, req.rspObj.userName)
          .replace(/{{Reviewer name}}/g, req.rspObj.userName)

        // Fetching email request body for sending email
        var lsEmailData = {
          request: getEmailData(null, subject, body, null, null, null,
            [cData.createdBy], data.templateConfig.result.form.data.templateName,
            eData.logo, eData.orgName, eData.fromEmail)
        }

        contentProvider.sendEmail(lsEmailData, req.headers, function (err, res) {
          if (err || res.responseCode !== responseCode.SUCCESS) {
            rspObj.errMsg = 'Error from content provider while sending email'
            utilsService.logErrorInfo('sendContentEmail', rspObj, err, objectInfo)
            logger.error({
              msg: 'Error from content provider while sending email',
              err,
              additionalInfo: { emailData: lsEmailData }
            }, req)
            callback(new Error('Sending email failed!'), null)
          } else {
            callback(null, data)
          }
        })
      } else {
        callback(new Error('All data not found for sending email'), null)
      }
    }
  ], function (err, data) {
    if (err) {
      rspObj.errMsg = 'Sending email failed'
      utilsService.logErrorInfo('sendContentEmail', rspObj, err, objectInfo)
      logger.error({ msg: 'Error while sending email', err }, req)
      callback(new Error('Sending email failed'), null)
    } else {
      callback(null, true)
    }
  })
}

/**
 * Below function is used for send email when published content api called
 * @param {object} req
 * @param {function} callback
 */
function publishedContentEmail (req, callback) {
  sendContentEmail(req, 'publish', callback)
}

/**
 * Below function is used for send email when review content api called
 * @param {object} req
 * @param {function} callback
 */
function reviewContentEmail (req, callback) {
  let objectInfo = {'id': _.get(req, 'params.contentId'), 'type': 'Content'}
  let rspObj = req.rspObj
  if (!req.params.contentId) {
    utilsService.logErrorInfo('reviewContentEmail', rspObj, 'content Id is missing')
    logger.error({ msg: 'content Id is missing' }, req)
    callback(new Error('Content id is missing'), null)
  }
  var formRequest = {
    request: {
      'type': 'notification',
      'action': 'sendForReview',
      'subType': 'email',
      'rootOrgId': req.get('x-channel-id')
    }
  }
  async.waterfall([
    function (callback) {
      async.parallel({
        userDetails: getUserDetails(req),
        contentDetails: getContentDetails(req),
        templateConfig: getTemplateConfig(formRequest)
      }, function (err, results) {
        if (err) {
          rspObj.errMsg = 'getUserDetails or getContentDetails or getTemplateConfig failed'
          utilsService.logErrorInfo('reviewContentEmail', rspObj, err, objectInfo)
          logger.error({
            msg: 'getUserDetails or getContentDetails or getTemplateConfig failed',
            err,
            additionalInfo: { contentId: req.params.contentId, formRequest }
          }, req)
          callback(err, null)
        } else {
          callback(null, results)
        }
      })
    },
    function (data, callback) {
      if (_.get(data.contentDetails, 'result.content') &&
        _.get(data.templateConfig, 'result.form.data.fields[0]') &&
        _.get(data.userDetails, 'result.response.content[0].rootOrgId')) {
        var cData = data.contentDetails.result.content
        var eData = data.templateConfig.result.form.data.fields[0]
        var subject = eData.subject
        var body = eData.body

        // Creating content link for email template
        var contentLink = getReviewContentUrl(cData)

        // Replacing dynamic content data with email template
        subject = subject.replace(/{{Content type}}/g, cData.contentType)
          .replace(/{{Content title}}/g, cData.name)
        body = body.replace(/{{Content type}}/g, cData.contentType)
          .replace(/{{Content title}}/g, cData.name)
          .replace(/{{Content link}}/g, contentLink)
          .replace(/{{Creator name}}/g, req.rspObj.userName)
          .replace(/{{Reviewer name}}/g, req.rspObj.userName)

        getReviwerUserIds(req, data.userDetails.result.response.content[0],
          data.contentDetails.result.content.contentType, function (err, userIds) {
            if (err) {
              rspObj.errMsg = 'All reviewers data not found'
              utilsService.logErrorInfo('reviewContentEmail', rspObj, err, objectInfo)
              logger.error({ msg: 'All reviewers data not found', err }, req)
              callback(new Error('All reviewers data not found'), null)
            } else {
              // Fetching email request body for sending email
              var lsEmailData = {
                request: getEmailData(null, subject, body, null, null, null,
                  userIds, data.templateConfig.result.form.data.templateName,
                  eData.logo, eData.orgName, eData.fromEmail)
              }
              contentProvider.sendEmail(lsEmailData, req.headers, function (err, res) {
                if (err || res.responseCode !== responseCode.SUCCESS) {
                  rspObj.errMsg = 'Error from content provider while sending email'
                  utilsService.logErrorInfo('reviewContentEmail', rspObj, err, objectInfo)
                  logger.error({
                    msg: 'Error from content provider while sending email',
                    err,
                    additionalInfo: { emailData: lsEmailData }
                  }, req)
                  callback(new Error('Sending email failed!'), null)
                } else {
                  callback(null, data)
                }
              })
            }
          })
      } else {
        utilsService.logErrorInfo('reviewContentEmail', rspObj, 'Required data missing for sending mail')
        logger.error({ msg: 'Required data missing for sending mail' }, req)
        callback(new Error('All data not found for sending email'), null)
      }
    }
  ], function (err, data) {
    if (err) {
      rspObj.errMsg = 'Error while sending email'
      utilsService.logErrorInfo('reviewContentEmail', rspObj, err, objectInfo)
      logger.error({ msg: 'Error while sending email', err }, req)
      callback(new Error('Sending email failed'), null)
    } else {
      callback(null, true)
    }
  })
}

/**
 * Below function is used to get all content reviwer ids
 * @param {object} req
 * @param {object} data
 * @param {function} callback
 */
function getReviwerUserIds (req, userdata, contentType, callback) {
  var rspObj = req.rspObj
  var reviewerRoles = contentType === 'TextBook' ? ['BOOK_REVIEWER'] : ['CONTENT_REVIEWER', 'CONTENT_REVIEW']
  var creatorRoles = contentType === 'TextBook' ? ['BOOK_CREATOR'] : ['CONTENT_CREATOR',
    'CONTENT_CREATION', 'CONTENT_REVIEWER', 'CONTENT_REVIEW']
  var rootOrgReviewerRequest = {
    'request': {
      'filters': {
        'rootOrgId': userdata.rootOrgId,
        'organisations.roles': reviewerRoles
      },
      'limit': reviewerQueryLimit,
      'offset': 0
    }
  }
  var orgIds = []
  if (_.get(userdata, 'organisations[0]')) {
    _.forEach(userdata.organisations, function (value) {
      var result = value.roles.some((e) => { return creatorRoles.indexOf(e) !== -1 })
      if (result) {
        orgIds.push(value.organisationId)
      }
    })
  }

  var fetchSubOrgReviewers = true
  var isRoles = userdata.roles.some((e) => { return creatorRoles.indexOf(e) !== -1 })
  if (isRoles || !orgIds.length) {
    fetchSubOrgReviewers = false
  }
  var subOrgReviewerRequest = {
    'request': {
      'filters': {
        'organisations.organisationId': _.uniq(orgIds),
        'organisations.roles': reviewerRoles
      },
      'limit': reviewerQueryLimit,
      'offset': 0
    }
  }
  async.parallel({
    rootOrgReviewers: getUserIds(req, rootOrgReviewerRequest, true),
    subOrgReviewers: getUserIds(req, subOrgReviewerRequest, fetchSubOrgReviewers)
  }, function (err, results) {
    if (err) {
      rspObj.errMsg = 'getReviwerUserIds failed'
      utilsService.logErrorInfo('getReviwerUserIds', rspObj, err)
      logger.error({ msg: 'getReviwerUserIds failed', err }, req)
      callback(err, null)
    } else {
      var rootOrgReviewersId = _.map(results.rootOrgReviewers, 'id')
      var subOrgReviewersId = _.map(results.subOrgReviewers, 'id')
      var allReviewerIds = _.union(rootOrgReviewersId, subOrgReviewersId)
      callback(null, allReviewerIds)
    }
  })
}

/**
 * Below function is used to get reviewer ids recursively if count is more than 200
 * @param {object} req
 * @param {object} body
 * @param {boolean} fetchDetailsFlag
 */
function getUserIds (req, body, fetchDetailsFlag) {
  var rspObj = req.rspObj
  if (fetchDetailsFlag) {
    return function (CBW) {
      async.waterfall([
        function (callback) {
          contentProvider.userSearch(body, req.headers, function (err, result) {
            if (err || result.responseCode !== responseCode.SUCCESS) {
              rspObj.errMsg = 'Error from content Provider due to user Search'
              utilsService.logErrorInfo('getUserIds', rspObj, err)
              logger.error({ msg: 'Error from content Provider due to user Search', err }, req)
              callback(new Error('User Search failed'), null)
            } else {
              callback(null, { count: result.result.response.count, content: result.result.response.content })
            }
          })
        },
        function (data, callback) {
          if (data.count < reviewerQueryLimit) {
            callback(null, data.content)
          } else {
            var totalCount = 0
            var userDetails = data.content
            totalCount = Math.ceil(data.count / reviewerQueryLimit)
            var parallelFunctions = []
            for (var i = 1; i <= totalCount; i++) {
              var fetchUserIds = function (request) {
                return function (cb) {
                  contentProvider.userSearch(request, req.headers, function (err, result) {
                    if (err || result.responseCode !== responseCode.SUCCESS) {
                      rspObj.errMsg = 'User search failed in content Provider'
                      utilsService.logErrorInfo('userSearch', rspObj, err)
                      logger.error({ msg: 'User search failed in content Provider',
                        err,
                        additionalInfo: { request } },
                      req)
                      cb(new Error('User Search failed'), null)
                    } else {
                      cb(null, result.result.response.content)
                    }
                  })
                }
              }
              var reqBody = _.cloneDeep(body)
              reqBody.request.offset = reviewerQueryLimit * i
              parallelFunctions.push(fetchUserIds(reqBody))
            }
            async.parallel(parallelFunctions, function (err, data) {
              if (err) {
                rspObj.errMsg = 'fetch userIds failed'
                utilsService.logErrorInfo('userSearch', rspObj, err)
                logger.error({ msg: 'fetch userIds failed', err, additionalInfo: { reqBody } }, req)
                callback(new Error('User Search failed'), null)
              } else {
                _.forEach(data, function (userData) {
                  userDetails = userDetails.concat(userData)
                })
                callback(null, userDetails)
              }
            })
          }
        }
      ], function (err, data) {
        if (err) {
          rspObj.errMsg = 'Get user Data failed'
          utilsService.logErrorInfo('userSearch', rspObj, err)
          logger.error({ msg: 'Get user Data failed', err }, req)
          CBW(new Error('Get user data failed'), null)
        } else {
          CBW(null, data)
        }
      })
    }
  } else {
    return function (callback) {
      callback(null, [])
    }
  }
}

/**
 * Below function is used for send email when reject content api called
 * @param {object} req
 * @param {function} callback
 */
function rejectContentEmail (req, callback) {
  sendContentEmail(req, 'requestForChanges', callback)
}

/**
 * [getUnlistedShareUrl Return share url for unlisted content]
 * @param  {[Object]} cData   [content data]
 * @param  {[String]} baseUri [base url]
 * @return {[String]}         [share url]
 */
var getUnlistedShareUrl = function (cData, baseUri) {
  if (cData.contentType === 'Course') {
    return baseUri + '/learn/course' + '/' + cData.identifier + '/Unlisted'
  } else if (cData.mimeType === 'application/vnd.ekstep.content-collection') {
    return baseUri + '/resources/play/collection' + '/' + cData.identifier + '/Unlisted'
  } else {
    return baseUri + '/resources/play/content' + '/' + cData.identifier + '/Unlisted'
  }
}

/**
 * Below function is used for send email when unlist publish content api called
 * @param {object} req
 * @param {function} callback
 */
function unlistedPublishContentEmail (req, callback) {
  var data = req.body
  data.contentId = req.params.contentId
  let objectInfo = {'id': _.get(data, 'contentId'), 'type': 'Content'}
  var rspObj = req.rspObj
  var baseUrl = data.request && data.request.content && data.request.content.baseUrl ? data.request.content.baseUrl : ''

  if (!data.contentId) {
    utilsService.logErrorInfo('unlistedPublishContentEmail',
      rspObj,
      'content id is missing',
      objectInfo)
    logger.error({ msg: 'content id is missing', additionalInfo: { data } }, req)
    callback(new Error('Content id missing'), null)
  }
  async.waterfall([
    function (CBW) {
      contentProvider.getContent(data.contentId, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while fetching content'
          utilsService.logErrorInfo('unlistedPublishContentEmail', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while fetching content',
            err,
            additionalInfo: { contentId: data.contentId }
          }, req)
          callback(new Error('Invalid content id'), null)
        } else {
          data.request.contentData = res.result.content
          CBW()
        }
      })
    },
    function (CBW) {
      var cData = data.request.contentData
      var eData = emailMessage.UNLISTED_PUBLISH_CONTENT
      var subject = eData.SUBJECT.replace(/{{Content title}}/g, cData.name)
      var shareUrl = getUnlistedShareUrl(cData, baseUrl)
      var body = eData.BODY.replace(/{{Content type}}/g, cData.contentType)
        .replace(/{{Content title}}/g, cData.name)
        .replace(/{{Share url}}/g, shareUrl)
        .replace(/{{Share url}}/g, shareUrl)
      var lsEmailData = {
        request: getEmailData(null, subject, body, null, null, null, [cData.createdBy], eData.TEMPLATE)
      }
      contentProvider.sendEmail(lsEmailData, req.headers, function (err, res) {
        if (err || res.responseCode !== responseCode.SUCCESS) {
          rspObj.errMsg = 'Error from content provider while sending email'
          utilsService.logErrorInfo('unlistedPublishContentEmail', rspObj, err, objectInfo)
          logger.error({
            msg: 'Error from content provider while sending email',
            err,
            additionalInfo: { emailData: lsEmailData }
          }, req)
          callback(new Error('Sending email failed'), null)
        } else {
          CBW(null, res)
        }
      })
    },
    function (res) {
      callback(null, true)
    }
  ])
}

module.exports.createFlagContentEmail = createFlagContentEmail
module.exports.acceptFlagContentEmail = acceptFlagContentEmail
module.exports.rejectFlagContentEmail = rejectFlagContentEmail
module.exports.publishedContentEmail = publishedContentEmail
module.exports.rejectContentEmail = rejectContentEmail
module.exports.reviewContentEmail = reviewContentEmail
module.exports.unlistedPublishContentEmail = unlistedPublishContentEmail
