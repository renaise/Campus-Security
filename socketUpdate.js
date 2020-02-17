var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// const locateIntruder = require('./intruderAnalytics.js').locateIntruder
var locationData = [];
var timeout = 30;
var open = true;
var socket = 3000;


io.on('connection', function(socket) {

  socket.on('locationUpdate', function(locationData) {

    if (locationData.length == 0) {
      setTimeout(function() {
        open = false;
        var intruderUpdate = locateIntruder(locationData);
        io.emit('intruderUpdate', intruderUpdate);
      }, timeout * 1000);
    }

    if (answer == 'yes' && open) {
      locationData.push([req.body.latitude, req.body.longitude])
    }

  });
});
