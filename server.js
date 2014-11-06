var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var angular = require('ng-di');
var requireDir = require('require-dir');

var rw = {};

// load up all angular stuff
requireDir('./engine', {recurse: true});

angular.module('app', ['ces', 'engine.world-root'])
    .service('$log', function () {
        return console;
    })
    .run(function ($rootWorld) {
        var gameloop = require('node-gameloop');

        var id = gameloop.setGameLoop(function (delta) {
            $rootWorld.update(delta);
        }, 1000 / 60);

        rw.loopId = id;
        rw.world = $rootWorld;
    });

angular.injector(['app']);

app.get('/', function (req, res) {
    res.send(rw);
});

io.on('connection', function (socket) {
    console.log('a user connected');
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
