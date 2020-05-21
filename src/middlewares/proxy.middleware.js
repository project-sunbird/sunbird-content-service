var proxy = require('express-http-proxy')
var contentService = require('../service/contentService')
var courseService = require('../service/courseService')
var collaboratorService = require('../service/collaboratorService')
var dialCodeService = require('../service/dialCodeService')
var lockService = require('../service/lockService')
var requestMiddleware = require('../middlewares/request.middleware')
var configUtil = require('sb-config-util')

module.exports = function (app) {
  var contentRepoBaseUrl = configUtil.getConfig('CONTENT_REPO_BASE_URL')
  var contentServiceBaseUrl = configUtil.getConfig('CONTENT_SERVICE_BASE_URL')
  var assessmentServiceBaseUrl = configUtil.getConfig('ASSESSMENT_SERVICE_BASE_URL')
  var dialRepoBaseUrl = configUtil.getConfig('DIAL_REPO_BASE_URL')
  var ekstepProxyUrl = globalEkstepProxyBaseUrl
  var contentRepoApiKey = configUtil.getConfig(
    'CONTENT_REPO_AUTHORIZATION_TOKEN'
  )
  var dialRepoApiKey = configUtil.getConfig('DIAL_REPO_AUTHORIZATION_TOKEN')
  var reqDataLimitOfContentUpload = configUtil.getConfig(
    'CONTENT_UPLOAD_REQ_LIMIT'
  )
  var searchServiceBaseUrl = configUtil.getConfig('SEARCH_SERVICE_BASE_URL')
  var searchServiceApiKey = configUtil.getConfig(
    'SEARCH_SERVICE_AUTHORIZATION_TOKEN'
  )
  var languageServiceBaseUrl = configUtil.getConfig(
    'LANGUAGE_SERVICE_BASE_URL'
  )
  var languageServiceApiKey = configUtil.getConfig(
    'LANGUAGE_SERVICE_AUTHORIZATION_TOKEN'
  )

  app.use(
    '/itemset/*',
    requestMiddleware.validateUserToken,
    proxy(assessmentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('v1/', 'v3/')
        return require('url').parse(assessmentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/api/*',
    proxy(contentRepoBaseUrl, {
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('api/', '/')
        return require('url').parse(contentRepoBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/content-plugins/*',
    proxy(ekstepProxyUrl, {
      proxyReqPathResolver: function (req) {
        return require('url').parse(ekstepProxyUrl + req.originalUrl).path
      }
    })
  )

  app.use(
    '/plugins/*',
    proxy(ekstepProxyUrl, {
      proxyReqPathResolver: function (req) {
        return require('url').parse(ekstepProxyUrl + req.originalUrl).path
      }
    })
  )

  app.use(
    '/assets/public/*',
    proxy(ekstepProxyUrl, {
      proxyReqPathResolver: function (req) {
        return require('url').parse(ekstepProxyUrl + req.originalUrl).path
      }
    })
  )

  app.use(
    '/content/preview/*',
    proxy(ekstepProxyUrl, {
      proxyReqPathResolver: function (req) {
        return require('url').parse(ekstepProxyUrl + req.originalUrl).path
      }
    })
  )

  app.use(
    '/action/content/v3/create',
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(['/action/content/v3/hierarchy/add', '/action/content/v3/hierarchy/remove'],
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app
    .route(
      '/action' + configUtil.getConfig('GET_CONTENT_URI') + '/:contentId'
    )
    .get(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      contentService.getContentAPI
    )

  app
    .route(
      '/action' + configUtil.getConfig('PUBLISH_CONTENT_URI') + '/:contentId'
    )
    .post(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForReviewerUser,
      contentService.publishContentAPI
    )

  app
    .route(
      '/action' + configUtil.getConfig('REJECT_CONTENT_URI') + '/:contentId'
    )
    .post(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForReviewerUser,
      contentService.rejectContentAPI
    )

  app
    .route(
      '/action' +
      configUtil.getConfig('ACCEPT_FLAG_CONTENT_URI') +
      '/:contentId'
    )
    .post(
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForReviewerUser,
      contentService.acceptFlagContentAPI
    )

  app
    .route(
      '/action' +
      configUtil.getConfig('REJECT_FLAG_CONTENT_URI') +
      '/:contentId'
    )
    .post(
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForReviewerUser,
      contentService.rejectFlagContentAPI
    )

  app
    .route(
      '/action' + configUtil.getConfig('UPDATE_CONTENT_URI') + '/:contentId'
    )
    .patch(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForCreatorUser,
      contentService.updateContentAPI
    )

  app
    .route(
      '/action' + configUtil.getConfig('REVIEW_CONTENT_URI') + '/:contentId'
    )
    .post(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForCreatorUser,
      contentService.reviewContentAPI
    )

  app
    .route(
      '/action' + configUtil.getConfig('CONTENT_UPLOAD_URL_URI') + '/:contentId'
    )
    .post(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.apiAccessForCreatorUser
    )

  app
    .route(
      '/action' + configUtil.getConfig('CONTENT_HIERARCHY_UPDATE_URI') + '/'
    )
    .patch(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.hierarchyUpdateApiAccess,
      courseService.updateCourseHierarchyAPI
    )

  app
    .route(
      '/action' +
      configUtil.getConfig('UNLISTED_PUBLISH_CONTENT_URI') +
      '/:contentId'
    )
    .post(
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForCreatorUser,
      contentService.unlistedPublishContentAPI
    )

  app.use(
    '/action/vocabulary/v3/term/suggest',
    requestMiddleware.validateUserToken,
    proxy(searchServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = searchServiceApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        return require('url').parse(
          searchServiceBaseUrl + '/vocabulary/v3/term/suggest'
        ).path
      }
    })
  )
  app.use('/action/composite/v3/search',
    proxy(searchServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = searchServiceApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/composite/', '')
        return require('url').parse(searchServiceBaseUrl + originalUrl).path
      }
    })
  )
  app.use(
    ['/action/framework/v3/read/*', '/action/content/v3/read/*', '/action/content/v1/read/*'],
    proxy(contentRepoBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentRepoBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    ['/action/content/v3/hierarchy/*'],
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/content/v3/upload/*',
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/content/v3/copy/*',
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/content/v3/discard/*',
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/content/v3/flag/accept/*',
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/content/v3/flag/reject/*',
    requestMiddleware.validateUserToken,
    proxy(contentRepoBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentRepoBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/content/v3/flag/*',
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app
    .route(
      '/action/dialcode/v1/reserve/:contentId'
    )
    .post(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      dialCodeService.reserveDialCode
    )

  app.route('/action/dialcode/v1/process/status/:processId')
    .get(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      dialCodeService.getProcessIdStatusAPI)

  app
    .route(
      '/action/dialcode/v1/release/:contentId'
    )
    .patch(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      dialCodeService.releaseDialCode
    )

  app
    .route(
      '/action' + configUtil.getConfig('UPDATE_COLLABORATOR') + '/:contentId'
    )
    .patch(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      requestMiddleware.apiAccessForCreatorUser,
      collaboratorService.updateCollaborators
    )

  app
    .route(
      '/action' + configUtil.getConfig('CREATE_LOCK')
    )
    .post(
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      lockService.createLock
    )

  app
    .route(
      '/action' + configUtil.getConfig('REFRESH_LOCK')
    )
    .patch(
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      lockService.refreshLock
    )

  app
    .route(
      '/action' + configUtil.getConfig('RETIRE_LOCK')
    )
    .delete(
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateToken,
      lockService.retireLock
    )

  app
    .route(
      '/action' + configUtil.getConfig('LIST_LOCK')
    )
    .post(
      requestMiddleware.createAndValidateRequestBody,
      requestMiddleware.validateUserToken,
      lockService.listLock
    )

  app.use(
    '/action/dialcode/*',
    requestMiddleware.validateUserToken,
    proxy(dialRepoBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        if (dialRepoApiKey) {
          proxyReqOpts.headers['Authorization'] = dialRepoApiKey
        }
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(dialRepoBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/composite/*',
    requestMiddleware.validateUserToken,
    proxy(searchServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = searchServiceApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/composite/', '')
        return require('url').parse(searchServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/language/v3/list',
    requestMiddleware.validateUserToken,
    proxy(contentRepoBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentRepoBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/language/*',
    requestMiddleware.validateUserToken,
    proxy(languageServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = languageServiceApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/language/', '')
        return require('url').parse(languageServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/itemset/*',
    requestMiddleware.validateUserToken,
    proxy(assessmentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(assessmentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/channel/v3/*',
    requestMiddleware.validateUserToken,
    proxy(contentServiceBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentServiceBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/action/*',
    requestMiddleware.validateUserToken,
    proxy(contentRepoBaseUrl, {
      limit: reqDataLimitOfContentUpload,
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        var originalUrl = req.originalUrl
        originalUrl = originalUrl.replace('action/', '')
        return require('url').parse(contentRepoBaseUrl + originalUrl).path
      }
    })
  )

  app.use(
    '/v1/telemetry',
    proxy(configUtil.getConfig('TELEMETRY_BASE_URL'), {
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Authorization'] = contentRepoApiKey
        return proxyReqOpts
      },
      proxyReqPathResolver: function (req) {
        return require('url').parse(configUtil.getConfig('TELEMETRY_BASE_URL') + 'v1/telemetry')
          .path
      }
    })
  )
}
