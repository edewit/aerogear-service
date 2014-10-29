var sender = require('unifiedpush-node-sender');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var optval = require('optval');
var util = require('util');
var winston = require('winston')
var requestId = require('connect-requestid');

validateEnvVar('AEROGEAR_SERVER_URL');
validateEnvVar('AEROGEAR_APPLICATION_ID');
validateEnvVar('AEROGEAR_MASTER_SECRET');

var settings = {
  serverUrl: process.env.AEROGEAR_SERVER_URL,
  applicationID: process.env.AEROGEAR_APPLICATION_ID,
  masterSecret: process.env.AEROGEAR_MASTER_SECRET,
  ttl: optval(process.env.AEROGEAR_TTL, 3600)
};

function validateEnvVar(envVar) {
  if( optval(process.env[envVar], null) === null) {
    console.error(new Date() + ' - ERROR: Required environment variable "' + envVar + '" not defined. Please set this environment variable via the Environment Variables section of your service')
  };
}

function sendRoute() {
  var send = new express.Router();
  send.use(cors());
  send.use(bodyParser());
  send.use(requestId);

  // POST REST endpoint - note we use 'body-parser' middleware above to parse the request body in this route.
  // This can also be added in application.js
  // See: https://github.com/senchalabs/connect#middleware for a list of Express 4 middleware
  send.post('/', function(req, res) {
    winston.info(req.id, 'In send route POST / req.body =', util.inspect(req.body));

    if( optval(req.body.message, null) === null) {
      // see http://expressjs.com/4x/api.html#res.json
      var message = 'Required JSON Object "message" not provided.'
      winston.warn(req.id, message, util.inspect(req.body));
      return res.status(400).json({'status' : 'error', 'messages' : message});
    }


    if( optval(req.body.message.alert, null) === null) {
      // see http://expressjs.com/4x/api.html#res.json
      var message = 'Required parameter "alert" not provided in message object.'
      winston.warn(req.id, message, util.inspect(req.body.message));
      return res.status(400).json({'status' : 'error', 'messages' : message});
    }

    var message = req.body.message;

    // Set defaults for optional parameters
    message.sound = optval(req.body.message.sound, 'default');
    message.badge = optval(req.body.message.badge, 2);
    message.contentAvailable = optval(req.body.message.contentAvailable, true);

    winston.info(req.id, "Sending message :", util.inspect(message));

    sender.Sender(settings.serverUrl).send(message, settings, function(err) {
      if (err) {
        winston.warn(req.id, 'Error calling push service - ', err);
        return res.status(500).json({'status':'error', 'message':err});
      }

      res.json({'status' : 'ok'});
    });
  });

  return send;
}

module.exports = sendRoute;