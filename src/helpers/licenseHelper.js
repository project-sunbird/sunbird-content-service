let _ = require('lodash')
let configData = require('../config/constants')
let async = require('async')
let logger = require('sb_logger_util_v2')
let CacheManager = require('sb_cache_manager')
let cacheManager = new CacheManager({})
const contentProvider = require('sb_content_provider_util')

/**
 * This function loops each object from the input and includes license details in it
 * @param inputdata is req object and res object
 * @param cb there will be no error callback , always returns success
 */
function includeLicenseDetails (req, res, cb) {
  if (_.get(req, 'query.licenseDetails') && _.get(res, 'result.content')) {
    let inputfields = req.query.licenseDetails.split(',')
    let fieldsToPopulate = configData.readableLicenseFields.filter(eachfield => inputfields.includes(eachfield))
    let inputContentIsArray = _.isArray(res.result.content)
    let contents = inputContentIsArray ? res.result.content : [res.result.content]
    if (_.size(fieldsToPopulate) && _.size(contents)) {
      populateLicenseDetailsByName(contents, fieldsToPopulate, function
        (err, contentWithLicenseDetails) {
        if (!err) {
          res.result.content = inputContentIsArray ? contentWithLicenseDetails : contentWithLicenseDetails[0]
        }
        return cb(null, res)
      })
    } else {
      return cb(null, res)
    }
  } else {
    return cb(null, res)
  }
}
/**
 * This function loops each object from the input and maps channel id with hasTagId from licenseDetails and prepares licenseDetails obj for each obj in the array
 * @param inputdata is array of objects, it might be content or course
 * @param cb callback after success or error
 */
function populateLicenseDetailsByName (contents, inputfields, cb) {
  let licenseDetails = []
  let licenseSearchQuery = {
    'request': {
      'filters': {
        'objectType': 'License'
      },
      'limit': 100
    }
  }
  let tryFromCache = true
  async.waterfall([
    // intially fetch all the licenses till the default limit
    function (CBW) {
      getLicenseFromCache(licenseSearchQuery, tryFromCache, contents, function (err, licenseData) {
        if (!err && licenseData) {
          licenseDetails = licenseData
          return CBW()
        } else {
          logger.error({
            msg: 'Error while getting license from cache memory',
            err,
            additionalInfo: { licenseSearchQuery, tryFromCache, contents }
          })
          return cb(null, contents)
        }
      })
    },
    // mapping channel with licenseDetails in contents
    function (CBW) {
      let licenseDetailsWithKey = _.keyBy(licenseDetails, 'name')
      _.forEach(contents, (content, index) => {
        if (content.license) {
          let licenseDetail = licenseDetailsWithKey[content.license]
          contents[index].licenseDetails = licenseDetail ? _.pick(licenseDetail, inputfields) : {}
        }
      })
      return cb(null, contents)
    }
  ])
}

/**
 * This function tries to get the license from cache if not exits fetches from search api and sets to cache
 * @param requestObj is filter query that is sent to fetch composite-search api call, tryfromcache is a boolean flag,
   inputdata is array of contents that needs license data
 * @param CBW callback after success or error
 */
function getLicenseFromCache (licenseSearchquery, tryfromcache, inputdata, cb) {
  async.waterfall([
    function (CBW) {
      if (tryfromcache) {
        let keyNames = getKeyNames(inputdata)
        cacheManager.mget(keyNames, function (err, cacheresponse) {
          let cachedata = _.compact(cacheresponse)
          if (!err && _.size(cachedata) > 0) {
            logger.debug({msg: 'license details - cache.', additionalInfo: {keys: keyNames, cache: cachedata}})
            return cb(null, cachedata)
          } else {
            if (err) {
              logger.error({ msg: 'getLicenseFromCache failed', err })
            }
            CBW()
          }
        })
      } else {
        CBW()
      }
    },
    function (CBW) {
      getLicense(licenseSearchquery, function (err, res) {
        if (err) {
          logger.error({ msg: 'Error while fetching license', err, additionalInfo: { licenseSearchquery } })
          return cb(err)
        } else {
          if (_.get(res, 'result') && _.get(res.result, 'license')) {
            let cacheinputdata = prepareCacheDataToInsert(res.result.license)
            insertDataToCache(cacheinputdata)
            return cb(null, res.result.license)
          } else {
            return cb(null, [])
          }
        }
      }, true)
    }
  ])
}

/**
 * This function executes the composite-search API to get all licenses
 * @param requestObj  js object which contains the search request with filters,offset,limit,query etc
 * @param cb callback after success or error
 */
function getLicense (requestObj, cb, noExitOnError) {
  logger.debug({ msg: 'getLicense called', additionalInfo: { requestObj } })
  contentProvider.compositeSearch(requestObj, {}, (err, res) => {
    if (!err) {
      return cb(err, res)
    } else {
      logger.error({
        msg: 'Error from content provider while getting license details',
        err,
        additionalInfo: { requestObj }
      })
      if (!noExitOnError) {
        logger.fatal({
          msg: 'Exiting due to error from content provider while getting license details',
          err,
          additionalInfo: { requestObj, noExitOnError }
        })
        process.exit(1)
      }
    }
  })
}

function insertDataToCache (cacheinputdata) {
  cacheManager.mset({ data: cacheinputdata, ttl: configData.licenseCacheExpiryTime }, function (err, data) {
    if (err) {
      logger.error({ msg: 'Caching all License data failed', err, additionalInfo: { data: cacheinputdata } })
    } else {
      logger.debug({ msg: 'Caching all License data successful', additionalInfo: { data: cacheinputdata } })
    }
  })
}

// Prepares the cache keys to fetch the data from license cache
function getKeyNames (contentMaps) {
  let keyNames = []
  _.forEach(contentMaps, function (contentMap) {
    if (contentMap.license) {
      let keyname = configData.licenseCacheKeyNamePrefix + contentMap.license
      keyNames.push(keyname)
    }
  })
  return _.uniq(keyNames)
}

// prepares the set data for inserting in cache
function prepareCacheDataToInsert (searchObjects) {
  let cacheKeyValuePairs = []
  _.forEach(searchObjects, function (object) {
    if (object.name) {
      let keyname = configData.licenseCacheKeyNamePrefix + object.name
      cacheKeyValuePairs.push(keyname)
      cacheKeyValuePairs.push(object)
    }
  })
  return cacheKeyValuePairs
}
module.exports = {
  includeLicenseDetails: includeLicenseDetails,
  getLicense: getLicense,
  getLicenseFromCache: getLicenseFromCache
}
