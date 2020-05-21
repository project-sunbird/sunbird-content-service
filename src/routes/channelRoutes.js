/**
 * file: channel-route.js
 * author: Rajath V B
 * desc: route file for Channel
 */

var channelService = require('../service/channelService')
var requestMiddleware = require('../middlewares/request.middleware')
var healthService = require('../service/healthCheckService')

var BASE_URL_V1_channel = '/v1/channel'
var dependentServiceHealth = ['EKSTEP']

module.exports = function (app) {
  app.route(BASE_URL_V1_channel + '/read/:channelId')
    .get(healthService.checkDependantServiceHealth(dependentServiceHealth),
      requestMiddleware.createAndValidateRequestBody, channelService.getChannelValuesById)

  app.route(BASE_URL_V1_channel + '/create')
    .post(healthService.checkDependantServiceHealth(dependentServiceHealth),
      requestMiddleware.createAndValidateRequestBody, channelService.ChannelCreate)

  app.route(BASE_URL_V1_channel + '/update/:channelId')
    .patch(healthService.checkDependantServiceHealth(dependentServiceHealth),
      requestMiddleware.createAndValidateRequestBody, channelService.ChannelUpdate)
}
