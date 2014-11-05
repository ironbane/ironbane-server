var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var angular = require('ng-di');
var ces = require('./engine/ces/ces.js');

angular.module('app', ['ces'])
.run(function(World) {
    var world = new World();

    console.log('booted', world);
});

angular.injector(['app']);

app.get('/', function (req, res) {
    res.send(ces);
});

io.on('connection', function (socket) {
    console.log('a user connected');
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
