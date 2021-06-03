exports.COMPOSITE = {

  CONTENT_TYPE: [
    'Collection', 'LessonPlan', 'Resource', 'TextBook'
  ]
}

exports.COURSE = {

  SEARCH: {
    MISSING_ERR_CODE: 'SER01',
    MISSING_CODE: 'ERR_COURSE_SEARCH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for search course are missing',
    FAILED_ERR_CODE: 'SER02',
    FAILED_CODE: 'ERR_COURSE_SEARCH_FAILED',
    FAILED_MESSAGE: 'Search course failed'
  },

  CREATE: {
    MISSING_ERR_CODE: 'CRT01',
    MISSING_CODE: 'ERR_COURSE_CREATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for create course are missing',
    FAILED_ERR_CODE: 'CRT02',
    FAILED_CODE: 'ERR_COURSE_CREATE_FAILED',
    FAILED_MESSAGE: 'Create course failed'
  },

  UPDATE: {
    MISSING_ERR_CODE: 'UPD01',
    MISSING_CODE: 'ERR_COURSE_UPDATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update course are missing',
    FAILED_ERR_CODE: 'UPD02',
    FAILED_CODE: 'ERR_COURSE_UPDATE_FAILED',
    FAILED_MESSAGE: 'Update course failed'
  },

  REVIEW: {
    MISSING_CODE: 'ERR_COURSE_REVIEW_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for review course are missing',
    FAILED_ERR_CODE: 'REW01',
    FAILED_CODE: 'ERR_COURSE_REVIEW_FAILED',
    FAILED_MESSAGE: 'Review course failed'
  },

  PUBLISH: {
    MISSING_ERR_CODE: 'PUB01',
    MISSING_CODE: 'ERR_COURSE_PUBLISH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for publish course are missing',
    FAILED_ERR_CODE: 'PUB02',
    FAILED_CODE: 'ERR_COURSE_PUBLISH_FAILED',
    FAILED_MESSAGE: 'Publish course failed'
  },

  GET: {
    FAILED_ERR_CODE: 'RED01',
    FAILED_CODE: 'ERR_COURSE_GET_FAILED',
    FAILED_MESSAGE: 'Get course failed'
  },

  GET_MY: {
    FAILED_ERR_CODE: 'RDC01',
    FAILED_CODE: 'ERR_COURSE_GET_MY_FAILED',
    FAILED_MESSAGE: 'Get my course failed'
  },

  HIERARCHY: {
    MISSING_ERR_CODE: 'HCY01',
    MISSING_CODE: 'ERR_COURSE_HIERARCHY_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get course hierarchy are missing',
    FAILED_ERR_CODE: 'HCY02',
    FAILED_CODE: 'ERR_COURSE_HIERARCHY_FAILED',
    FAILED_MESSAGE: 'Get course hierarchy failed'
  },

  HIERARCHY_UPDATE: {
    MISSING_ERR_CODE: 'HRU01',
    MISSING_CODE: 'ERR_COURSE_HIERARCHY_UPDATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update course hierarchy are missing',
    FAILED_ERR_CODE: 'HRU02',
    FAILED_CODE: 'ERR_COURSE_HIERARCHY_UPDATE_FAILED',
    FAILED_MESSAGE: 'Update course hierarchy failed'
  },

  MIME_TYPE: 'application/vnd.ekstep.content-collection',
  CONTENT_TYPE: 'Course',
  PREFIX_CODE: 'org.sunbird.'
}

exports.CONTENT = {
  SEARCH: {
    MISSING_ERR_CODE: 'SER01',
    MISSING_CODE: 'ERR_CONTENT_SEARCH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for search content are missing',
    FAILED_ERR_CODE: 'SER02',
    FAILED_CODE: 'ERR_CONTENT_SEARCH_FAILED',
    FAILED_MESSAGE: 'Search content failed'
  },

  CREATE: {
    MISSING_ERR_CODE: 'CRT01',
    MISSING_CODE: 'ERR_CONTENT_CREATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for create content are missing',
    FAILED_ERR_CODE: 'CRT02',
    FAILED_CODE: 'ERR_CONTENT_CREATE_FAILED',
    FAILED_MESSAGE: 'Create content failed'
  },

  UPDATE: {
    MISSING_ERR_CODE: 'UPD01',
    MISSING_CODE: 'ERR_CONTENT_UPDATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update content are missing',
    FAILED_ERR_CODE: 'UPD02',
    FAILED_CODE: 'ERR_CONTENT_UPDATE_FAILED',
    FAILED_MESSAGE: 'Update content failed'
  },

  UPLOAD: {
    MISSING_ERR_CODE: 'UPL01',
    MISSING_CODE: 'ERR_CONTENT_UPLOAD_FILES_MISSING',
    MISSING_MESSAGE: 'Required files for upload content are missing',
    FAILED_ERR_CODE: 'UPL02',
    FAILED_CODE: 'ERR_CONTENT_UPLOAD_FAILED',
    FAILED_MESSAGE: 'Upload content failed'
  },

  REVIEW: {
    MISSING_CODE: 'ERR_CONTENT_REVIEW_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for review content are missing',
    FAILED_ERR_CODE: 'REW01',
    FAILED_CODE: 'ERR_CONTENT_REVIEW_FAILED',
    FAILED_MESSAGE: 'Review content failed'
  },

  PUBLISH: {
    MISSING_ERR_CODE: 'PUB01',
    MISSING_CODE: 'ERR_CONTENT_PUBLISH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for publish content are missing',
    FAILED_ERR_CODE: 'PUB02',
    FAILED_CODE: 'ERR_CONTENT_PUBLISH_FAILED',
    FAILED_MESSAGE: 'Publish content failed'
  },

  GET: {
    MISSING_ERR_CODE: 'RED01',
    MISSING_CODE: 'ERR_CONTENT_GET_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get content are missing',
    FAILED_ERR_CODE: 'RED02',
    FAILED_CODE: 'ERR_CONTENT_GET_FAILED',
    FAILED_MESSAGE: 'Get content failed'
  },

  GET_MY: {
    FAILED_ERR_CODE: 'RDM01',
    FAILED_CODE: 'ERR_CONTENT_GET_MY_FAILED',
    FAILED_MESSAGE: 'Get my content failed'
  },

  RETIRE: {
    MISSING_ERR_CODE: 'RTR01',
    MISSING_CODE: 'ERR_CONTENT_RETIRE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for retire content are missing',
    FAILED_ERR_CODE: 'RTR02',
    FAILED_CODE: 'ERR_CONTENT_RETIRE_FAILED',
    FAILED_MESSAGE: 'Retire content failed'
  },

  REJECT: {
    MISSING_ERR_CODE: 'REJ01',
    MISSING_CODE: 'ERR_CONTENT_REJECT_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for reject content are missing',
    FAILED_ERR_CODE: 'REJ02',
    FAILED_CODE: 'ERR_CONTENT_REJECT_FAILED',
    FAILED_MESSAGE: 'Reject content failed'
  },

  FLAG: {
    MISSING_CODE: 'ERR_CONTENT_FLAG_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for flag content are missing',
    FAILED_CODE: 'ERR_CONTENT_FLAG_FAILED',
    FAILED_MESSAGE: 'Flag content failed'
  },

  ACCEPT_FLAG: {
    MISSING_ERR_CODE: 'FLA01',
    MISSING_CODE: 'ERR_CONTENT_ACCEPT_FLAG_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for accept flag are missing',
    FAILED_ERR_CODE: 'FLA02',
    FAILED_CODE: 'ERR_CONTENT_ACCEPT_FLAG_FAILED',
    FAILED_MESSAGE: 'Accept flag for content failed'
  },

  REJECT_FLAG: {
    MISSING_ERR_CODE: 'FLR01',
    MISSING_CODE: 'ERR_CONTENT_REJECT_FLAG_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for reject flag are missing',
    FAILED_ERR_CODE: 'FLR02',
    FAILED_CODE: 'ERR_CONTENT_REJECT_FLAG_FAILED',
    FAILED_MESSAGE: 'Reject flag for content failed'
  },

  UPLOAD_URL: {
    MISSING_ERR_CODE: 'UPU01',
    MISSING_CODE: 'ERR_CONTENT_UPLOAD_URL_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for upload url are missing',
    FAILED_ERR_CODE: 'UPU02',
    FAILED_CODE: 'ERR_CONTENT_UPLOAD_URL_FAILED',
    FAILED_MESSAGE: 'Upload url for content failed'
  },

  HIERARCHY_UPDATE: {
    MISSING_CODE: 'ERR_CONTENT_HIERARCHY_UPDATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update hierarchy are missing'
  },

  UNLISTED_PUBLISH: {
    MISSING_CODE: 'ERR_UNLISTED_PUBLISH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for unlisted publish content are missing',
    FAILED_CODE: 'ERR_UNLISTED_PUBLISH_FIELDS_FAILED',
    FAILED_MESSAGE: 'Unlisted publish content failed'
  },

  CONTENT_TYPE: [
    'Story',
    'Worksheet',
    'TextBook',
    'Collection'
  ],

  MIME_TYPE: [
    'application/vnd.ekstep.ecml-archive',
    'application/vnd.ekstep.html-archive',
    'application/vnd.android.package-archive',
    'application/vnd.ekstep.content-archive',
    'application/vnd.ekstep.plugin-archive',
    'application/octet-stream',
    'application/msword',
    'application/pdf',
    'video/youtube',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'image/gif',
    'image/svg+xml',
    'video/avi',
    'video/mpeg',
    'video/quicktime',
    'video/3gpp',
    'video/mpeg',
    'video/mp4',
    'video/ogg',
    'video/webm',
    'audio/mp3',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/webm',
    'audio/x-wav',
    'audio/wav'
  ],
  PREFIX_CODE: 'org.sunbird.',
  ASSIGN_BADGE: {
    MISSING_ERR_CODE: 'BGA01',
    MISSING_CODE: 'ERR_CONTENT_ASSIGN_BADGE_MISSING',
    MISSING_MESSAGE: 'Required fields for assigning badge are missing',
    FAILED_ERR_CODE: 'BGA02',
    FAILED_CODE: 'ERR_CONTENT_ASSIGN_BADGE_FAILED',
    FAILED_MESSAGE: 'Assigning badge to content failed'
  },
  REVOKE_BADGE: {
    MISSING_ERR_CODE: 'BGR01',
    MISSING_CODE: 'ERR_CONTENT_REVOKE_BADGE_MISSING',
    MISSING_MESSAGE: 'Required fields for revoking badge are missing',
    FAILED_ERR_CODE: 'BGR02',
    FAILED_CODE: 'ERR_CONTENT_REVOKE_BADGE_FAILED',
    FAILED_MESSAGE: 'Assigning badge to content failed'
  },

  COPY: {
    MISSING_ERR_CODE: 'CPY01',
    MISSING_CODE: 'ERR_CONTENT_ID_MISSING',
    MISSING_MESSAGE: 'Content Id is missing for copying content',
    FAILED_ERR_CODE: 'CPY02',
    FAILED_CODE: 'ERR_CONTENT_COPY_FAILED',
    FAILED_MESSAGE: 'content copy failed'
  },

  SEARCH_PLUGINS: {
    MISSING_ERR_CODE: 'SER01',
    MISSING_CODE: 'ERR_PLUGINS_SEARCH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for search plugins are missing',
    FAILED_ERR_CODE: 'SER02',
    FAILED_CODE: 'ERR_PLUGINS_SEARCH_FAILED',
    FAILED_MESSAGE: 'Searching plugins failed'
  },

  COLLABORATORS: {
    MISSING_ERR_CODE: 'CBU01',
    MISSING_CODE: 'ERR_CONTENT_COLLABORATORS_UPDATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update collaborators are missing',
    FAILED_ERR_CODE: 'CBU02',
    FAILED_CODE: 'ERR_CONTENT_COLLABORATORS_UPDATE_FAILED',
    FAILED_MESSAGE: 'Update collaborators failed',
    FORBIDDEN: 'FORBIDDEN'
  },

  CREATE_LOCK: {
    MISSING_ERR_CODE: 'CRT02',
    MISSING_CODE: 'ERR_LOCK_CREATION_FIELDS_MISSING',
    MISSING_MESSAGE: 'request is required',
    FAILED_ERR_CODE: 'CRT01',
    FAILED_CODE: 'ERR_LOCK_CREATION_FAILED',
    FAILED_MESSAGE: 'Creating lock failed',
    ALREADY_LOCKED: 'The resource is already locked by {{Name}}',
    DEVICE_ID_MISSING: 'X-device-Id is missing in headers',
    SAME_USER_ERR_MSG: 'The resource is already locked by you in a different window/device',
    UNAUTHORIZED: 'You are not authorized to lock this resource',
    SELF_LOCKED_ERR_CODE: 'CRT03',
    SELF_LOCKED_CODE: 'RESOURCE_SELF_LOCKED',
    LOCKED_ERR_CODE: 'CRT04',
    LOCKED_CODE: 'RESOURCE_LOCKED'
  },

  REFRESH_LOCK: {
    MISSING_ERR_CODE: 'REF02',
    MISSING_CODE: 'ERR_LOCK_REFRESHING_FIELDS_MISSING',
    MISSING_MESSAGE: 'request is required',
    FAILED_ERR_CODE: 'REF01',
    FAILED_CODE: 'ERR_LOCK_REFRESHING_FAILED',
    FAILED_MESSAGE: 'Refreshing lock failed',
    NOT_FOUND_FAILED_MESSAGE: 'Resource is not locked',
    DEVICE_ID_MISSING: 'X-device-Id is missing in headers',
    UNAUTHORIZED: 'You are not authorized to refresh this resource',
    INVALID_LOCK_KEY: 'Invalid lock id'
  },

  RETIRE_LOCK: {
    MISSING_ERR_CODE: 'RTR02',
    MISSING_CODE: 'ERR_LOCK_RETIRING_FIELDS_MISSING',
    MISSING_MESSAGE: 'request is required',
    FAILED_ERR_CODE: 'RTR01',
    FAILED_CODE: 'ERR_LOCK_RETIRING_FAILED',
    FAILED_MESSAGE: 'Retiring lock failed',
    NOT_FOUND_FAILED_MESSAGE: 'Resource is not locked',
    DEVICE_ID_MISSING: 'X-device-Id is missing in headers',
    UNAUTHORIZED: 'You are not authorized to retire this resource'
  },

  LIST_LOCK: {
    FAILED_ERR_CODE: 'LST01',
    FAILED_CODE: 'ERR_LISTING_LOCK_FAILED',
    FAILED_MESSAGE: 'Listing lock failed',
    DEVICE_ID_MISSING: 'X-device-Id is missing in headers'
  }
}

exports.REQUEST = {

  PARAMS: {
    MISSING_CID_CODE: 'ERR_REQUEST_FIELDS_CID_MISSING',
    MISSING_CID_MESSAGE: 'Required field consumer id is missing',
    MISSING_CHANNELID_CODE: 'ERR_REQUEST_FIELDS_CHANNEL_ID_MISSING',
    MISSING_CHANNELID_MESSAGE: 'Required field channel id is missing'
  },
  TOKEN: {
    MISSING_ERR_CODE: 'TKN01',
    MISSING_CODE: 'ERR_TOKEN_FIELD_MISSING',
    MISSING_MESSAGE: 'Required field token is missing',
    INVALID_ERR_CODE: 'TKN02',
    INVALID_CODE: 'ERR_TOKEN_INVALID',
    INVALID_MESSAGE: 'Access denied'
  }
}

exports.RESPONSE_CODE = {
  CLIENT_ERROR: 'CLIENT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  SUCCESS: 'OK',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS'
}

exports.API_VERSION = {
  V1: '1.0'
}

exports.SERVICE = {
  NAME: 'ContentService'
}

exports.UTILS = {
  UPLOAD: {
    MISSING_CODE: 'ERR_MEDIA_UPLOAD_FILES_MISSING',
    MISSING_MESSAGE: 'Required files for upload media are missing',
    FAILED_CODE: 'ERR_MEDIA_UPLOAD_FAILED',
    FAILED_MESSAGE: 'Upload media failed'
  },
  RESOURCE_BUNDLE: {
    MISSING_CODE: 'ERR_GET_RESOURCE_BUNDLE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get resource language are missing',
    FAILED_CODE: 'ERR_GET_RESOURCE_BUNDLE_FAILED',
    FAILED_MESSAGE: 'Get resource bundle failed'
  }
}

exports.DOMAIN = {

  GET_DOMAINS: {
    FAILED_ERR_CODE: 'DLS01',
    FAILED_CODE: 'ERR_GET_DOMAINS_FAILED',
    FAILED_MESSAGE: 'Get domains failed'
  },

  GET_DOMAIN_BY_ID: {
    MISSING_ERR_CODE: 'DRD01',
    MISSING_CODE: 'ERR_GET_DOMAIN_BY_ID_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get domain are missing',
    FAILED_ERR_CODE: 'DRD02',
    FAILED_CODE: 'ERR_GET_DOMAIN_BY_ID_FAILED',
    FAILED_MESSAGE: 'Get domain failed'
  },

  GET_OBJECTS: {
    MISSING_ERR_CODE: 'DOL01',
    MISSING_CODE: 'ERR_GET_OBJECTS_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get objects are missing',
    FAILED_ERR_CODE: 'DOL02',
    FAILED_CODE: 'ERR_GET_OBJECT_FAILED',
    FAILED_MESSAGE: 'Get objects failed'
  },

  GET_OBJECT_BY_ID: {
    MISSING_ERR_CODE: 'DOS01',
    MISSING_CODE: 'ERR_GET_OBJECT_BY_ID_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get object are missing',
    FAILED_ERR_CODE: 'DOS02',
    FAILED_CODE: 'ERR_GET_OBJECT_BY_ID_FAILED',
    FAILED_MESSAGE: 'Get object failed'
  },

  GET_CONCEPT_BY_ID: {
    MISSING_ERR_CODE: 'CRD01',
    MISSING_CODE: 'ERR_GET_CONCEPT_BY_ID_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get concept are missing',
    FAILED_ERR_CODE: 'CRD02',
    FAILED_CODE: 'ERR_GET_CONCEPT_BY_ID_FAILED',
    FAILED_MESSAGE: 'Get concept failed'
  },

  SEARCH_OBJECT_TYPE: {
    MISSING_ERR_CODE: 'DOS01',
    MISSING_CODE: 'ERR_SEARCH_OBJECT_TYPE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for search object type are missing',
    FAILED_ERR_CODE: 'DOS02',
    FAILED_CODE: 'ERR_SEARCH_OBJECT_TYPE_FAILED',
    FAILED_MESSAGE: 'Search object type failed'
  },

  CREATE_OBJECT_TYPE: {
    MISSING_ERR_CODE: 'DOC01',
    MISSING_CODE: 'ERR_CREATE_OBJECT_TYPE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for create object type are missing',
    FAILED_ERR_CODE: 'DOC02',
    FAILED_CODE: 'ERR_CREATE_OBJECT_TYPE_FAILED',
    FAILED_MESSAGE: 'Create object type failed'
  },

  UPDATE_OBJECT_TYPE: {
    MISSING_ERR_CODE: 'DOU01',
    MISSING_CODE: 'ERR_UPDATE_OBJECT_TYPE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update object type are missing',
    FAILED_ERR_CODE: 'DOU02',
    FAILED_CODE: 'ERR_UPDATE_OBJECT_TYPE_FAILED',
    FAILED_MESSAGE: 'Update object type failed'
  },

  RETIRE_OBJECT_TYPE: {
    MISSING_ERR_CODE: 'DOR01',
    MISSING_CODE: 'ERR_RETIRE_OBJECT_TYPE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for retire object type are missing',
    FAILED_ERR_CODE: 'DOR02',
    FAILED_CODE: 'ERR_RETIRE_OBJECT_TYPE_FAILED',
    FAILED_MESSAGE: 'Retire object type failed'
  }
}

exports.EMAIL = {
  CREATE_FLAG: {
    FAILED_CODE: 'ERR_SEND_CREATE_FLAG_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for create flag',
    SUBJECT: 'Flag raised for your content: Content Type: {{Content type}}, Title: {{Content title}} ',
    BODY: 'Your content is flagged by another user. <br><br>' +
            '<b>Content Type: </b>{{Content type}}<br>' +
            '<b>Title: </b>{{Content title}}<br>' +
            '<b>Flag(s) Raised: </b>{{Flag reason}}<br>' +
            '<b>Content Status: </b>{{Content status}}<br>',
    TEMPLATE: 'contentFlagged'
  },
  ACCEPT_FLAG: {
    FAILED_CODE: 'ERR_SEND_ACCEPT_FLAG_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for accept flag',
    SUBJECT: 'Reviewer has accepted the flag for your content: {{Content type}} ',
    BODY: 'Your content has been flagged by the reviewer. <br><br>' +
            '<b>Content Type: </b>{{Content type}}<br>' +
            '<b>Title: </b>{{Content title}}<br>' +
            '<b>Flag(s) Raised: </b>{{Flag reason}}<br>',
    TEMPLATE: 'acceptFlag'
  },
  REJECT_FLAG: {
    FAILED_CODE: 'ERR_SEND_REJECT_FLAG_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for reject flag',
    SUBJECT: 'Congratulations, your content is live! Content Type: {{Content type}}, Title: {{Content title}}',
    BODY: 'Congratulations! The content that you had submitted has been accepted for publication.' +
            ' It is now available for usage. <br><br>' +
            '<b>Content Type: </b>{{Content type}}<br>' +
            '<b>Title: </b>{{Content title}}<br>' +
            '<b>Status: </b>{{Content status}}<br>',
    TEMPLATE: 'rejectFlag'
  },
  PUBLISHED_CONTENT: {
    FAILED_CODE: 'ERR_SEND_PUBLISHED_CONTENT_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for published content',
    SUBJECT: 'Congratulations, your content is live! Content Type: {{Content type}}, Title: {{Content title}}',
    BODY: 'Congratulations! The content that you had submitted has been accepted for publication. ' +
            'It will be available for usage shortly. <br><br>' +
            '<b>Content Type: </b>{{Content type}}<br>  ' +
            '<b>Title: </b>{{Content title}}<br>',
    TEMPLATE: 'publishContent'
  },
  REJECT_CONTENT: {
    FAILED_CODE: 'ERR_SEND_REJECT_CONTENT_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for reject content',
    SUBJECT: 'Our sincere apologies! Content Type: {{Content type}}, Title: {{Content title}}',
    BODY: 'We acknowledge your contribution and effort in creating content for us.' +
            ' However, we are unable to accept the content that you submitted.<br>' +
            'We look forward to a more meaningful relationship with you, the next time around. <br><br>' +
            '<b>Content Type: </b>{{Content type}}<br>' +
            '<b>Title: </b>{{Content title}}<br>' +
            '<b>Status: </b>{{Content status}}<br>',
    TEMPLATE: 'rejectContent'
  },
  UNLISTED_PUBLISH_CONTENT: {
    FAILED_CODE: 'ERR_SEND_UNLISTED_PUBLISH_CONTENT_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for unlist publish content',
    SUBJECT: 'Congratulations, your content {{Content title}} is live!',
    BODY: 'Congratulations! The content is now ready for limited sharing. ' +
            'You can share it using <a href=\'{{Share url}}\'>{{Share url}}</a>. <br><br>' +
            '<b>Content Type: </b>{{Content type}}<br>  ' +
            '<b>Title: </b>{{Content title}}<br>',
    TEMPLATE: 'unlistedPublishContent'
  },
  ADD_COLLABORATORS: {
    FAILED_CODE: 'ERR_SEND_ADD_COLLABORATORS_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for adding collaborators',
    SUBJECT: 'Congratulations! You are now a Collaborator',
    BODY: '{{User}} has added you as a collaborator for the ' +
    '{{Content type}}: {{Content title}}. View this in {{Content link}}',
    TEMPLATE: 'default'
  },
  REMOVE_COLLABORATORS: {
    FAILED_CODE: 'ERR_SEND_REMOVE_COLLABORATORS_EMAIL',
    FAILED_MESSAGE: 'Sending email failed for removing collaborators',
    SUBJECT: 'Removed as Collaborator',
    BODY: '{{User}} has removed you as a collaborator for the ' +
    '{{Content type}}: {{Content title}}',
    TEMPLATE: 'default'
  }
}

exports.HEALTH_CHECK = {
  EK_STEP: {
    NAME: 'ekstep.api',
    FAILED_CODE: 'CONTENT_PROVIDER_HEALTH_FAILED',
    FAILED_MESSAGE: 'Content provider service is not healthy'
  },
  LEARNER_SERVICE: {
    NAME: 'learnerservice.api',
    FAILED_CODE: 'LEARNER_SERVICE_HEALTH_FAILED',
    FAILED_MESSAGE: 'Learner service is not healthy'
  },
  CASSANDRA_DB: {
    NAME: 'cassandra.db',
    FAILED_CODE: 'CASSANDRA_HEALTH_FAILED',
    FAILED_MESSAGE: 'Cassandra db is not connected'
  }
}

exports.DIALCODE = {
  GENERATE: {
    MISSING_ERR_CODE: 'GEN01',
    MISSING_CODE: 'ERR_DIALCODE_GENERATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for generate dialcode are missing',
    FAILED_ERR_CODE: 'GEN03',
    FAILED_CODE: 'ERR_DIALCODE_GENERATE_FAILED',
    FAILED_MESSAGE: 'Generate dialcode failed',
    MISSING_ERR_COUNT: 'GEN02',
    MISSING_COUNT: 'ERR_DIALCODE_GENERATE_COUNT_ERROR',
    MISSING_COUNT_MESSAGE: 'Required fields count is missing or invalid'

  },

  LIST: {
    MISSING_ERR_CODE: 'LIS01',
    MISSING_CODE: 'ERR_DIALCODE_LIST_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for getting dialcode list are missing',
    FAILED_ERR_CODE: 'LIS02',
    FAILED_CODE: 'ERR_DIALCODE_LIST_FAILED',
    FAILED_MESSAGE: 'Getting dialcode list failed'
  },

  UPDATE: {
    MISSING_ERR_CODE: 'UPD01',
    MISSING_CODE: 'ERR_DIALCODE_UPDATE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update dialcode are missing',
    FAILED_ERR_CODE: 'UPD02',
    FAILED_CODE: 'ERR_DIALCODE_UPDATE_FAILED',
    FAILED_MESSAGE: 'Update dialcode failed'
  },

  GET: {
    MISSING_ERR_CODE: 'RED01',
    MISSING_CODE: 'ERR_DIALCODE_GET_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get dialcode are missing',
    FAILED_ERR_CODE: 'RED02',
    FAILED_CODE: 'ERR_DIALCODE_GET_FAILED',
    FAILED_MESSAGE: 'Get dialcode failed'
  },

  CONTENT_LINK: {
    MISSING_ERR_CODE: 'CNL01',
    MISSING_CODE: 'ERR_DIALCODE_CONTENT_LINK_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for content link dialcode are missing',
    FAILED_ERR_CODE: 'CNL02',
    FAILED_CODE: 'ERR_DIALCODE_CONTENT_LINK_FAILED',
    FAILED_MESSAGE: 'Content link dialcode failed'
  },

  PROCESS: {
    MISSING_ERR_CODE: 'PRS01',
    MISSING_ID: 'ERR_DIALCODE_PROCESS_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for process status are missing',
    FAILED_CODE: 'ERR_DIALCODE_PROCESS_ID_FAILED',
    FAILED_MESSAGE: 'Unable get the process info',
    NOTFOUND_CODE: 'ERR_PROCESS_ID_NOT_FOUND',
    NOTFOUND_MESSAGE: 'Requested process id not found',
    INPROGRESS_MESSAGE: 'in-process',
    COMPLETED: 'completed'
  },

  SEARCH: {
    MISSING_ERR_CODE: 'SER01',
    MISSING_CODE: 'ERR_DIALCODE_SEARCH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for search dialcode are missing',
    FAILED_ERR_CODE: 'SER02',
    FAILED_CODE: 'ERR_DIALCODE_SEARCH_FAILED',
    FAILED_MESSAGE: 'Search dialcode failed'
  },

  PUBLISH: {
    MISSING_ERR_CODE: 'PUB01',
    MISSING_CODE: 'ERR_DIALCODE_PUBLISH_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for publish dialcode are missing',
    FAILED_ERR_CODE: 'PUB02',
    FAILED_CODE: 'ERR_DIALCODE_PUBLISH_FAILED',
    FAILED_MESSAGE: 'Publish dialcode failed'
  },

  CREATE_PUBLISHER: {
    MISSING_ERR_CODE: 'PBC01',
    MISSING_CODE: 'ERR_CREATE_PUBLISHER_DIALCODE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for create publisher are missing',
    FAILED_ERR_CODE: 'PBC02',
    FAILED_CODE: 'ERR_CREATE_PUBLISHER_DIALCODE_FAILED',
    FAILED_MESSAGE: 'Create publisher failed'
  },

  UPDATE_PUBLISHER: {
    MISSING_ERR_CODE: 'PBU01',
    MISSING_CODE: 'ERR_UPDATE_PUBLISHER_DIALCODE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for update publisher are missing',
    FAILED_ERR_CODE: 'PBU02',
    FAILED_CODE: 'ERR_UPDATE_PUBLISHER_DIALCODE_FAILED',
    FAILED_MESSAGE: 'Update publisher failed'
  },

  GET_PUBLISHER: {
    MISSING_ERR_CODE: 'PBR01',
    MISSING_CODE: 'ERR_GET_PUBLISHER_DIALCODE_FIELDS_MISSING',
    MISSING_MESSAGE: 'Required fields for get publisher are missing',
    FAILED_ERR_CODE: 'PBR02',
    FAILED_CODE: 'ERR_GET_PUBLISHER_DIALCODE_FAILED',
    FAILED_MESSAGE: 'GET publisher failed'
  },

  RELEASE: {
    FAILED_ERR_CODE: 'REL01',
    FAILED_CODE: 'ERR_RELEASING_DIALCODE_FAILED',
    FAILED_MESSAGE: 'Unable to release the dial code'
  },

  RESERVE: {
    FAILED_ERR_CODE: 'REV01',
    FAILED_CODE: 'ERR_RESERVING_DIALCODE_FAILED',
    FAILED_MESSAGE: 'Unable to reserve the dial code'
  }
}

exports.DATASET = {
  SUBMIT: {
    FAILED_CODE: 'SUBMIT_DATASET_REQUEST_FAILED',
    FAILED_MESSAGE: 'Submit dataset request failed'
  },
  LIST: {
    FAILED_CODE: 'GET_DATASET_REQUEST_LIST_FAILED',
    FAILED_MESSAGE: 'Get dataset request list failed'
  },
  READ: {
    FAILED_CODE: 'GET_DATASET_REQUEST_FAILED',
    FAILED_MESSAGE: 'Get dataset request detail failed'
  },
  CHANNEL: {
    FAILED_CODE: 'GET_CHANNEL_DATASET_REQUEST_FAILED',
    FAILED_MESSAGE: 'Get channel dataset request failed'
  }
}

exports.FORM = {
  READ: {
    MISSING_ERR_CODE: 'RED01',
    MISSING_CODE: 'ERR_GET_FORM_DATA',
    MISSING_MESSAGE: 'Required fields to get form are missing',
    FAILED_CODE: 'ERR_GET_FORM_DATA_FAILED',
    FAILED_MESSAGE: 'Unable to get the form data'
  },
  CREATE: {
    MISSING_ERR_CODE: 'CRT01',
    MISSING_CODE: 'ERR_CREATE_FORM_DATA',
    MISSING_MESSAGE: 'Required fields for creating form data are missing',
    FAILED_CODE: 'ERR_CREATE_FORM_DATA_FAILED',
    FAILED_MESSAGE: 'Unable to create the form data'
  },
  UPDATE: {
    MISSING_ERR_CODE: 'UPD01',
    MISSING_CODE: 'ERR_UPDATE_FORM_DATA',
    MISSING_MESSAGE: 'Required fields while updating form data are missing',
    FAILED_ERR_CODE: 'UPD02',
    FAILED_CODE: 'ERR_UPDATE_FORM_DATA_FAILED',
    FAILED_MESSAGE: 'Unable to update the form data'
  }
}
exports.EXTERNAL_URL_META = {
  FETCH: {
    MISSING_ERR_CODE: 'FCM01',
    MISSING_CODE: 'ERR_FETCH_URLMETA_MISSING',
    MISSING_MESSAGE: 'Required fields for fetching url meta data are missing',
    FAILED_ERR_CODE: 'FCM02',
    FAILED_CODE: 'ERR_FETCH_URLMETA_FAILED',
    FAILED_MESSAGE: 'Unable to load the url metadata'
  }
}
