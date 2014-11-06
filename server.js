var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var angular = require('ng-di');
var requireDir = require('require-dir');

var world = {};

// load up all angular stuff
requireDir('./engine', {
    recurse: true
});

angular.module('app', ['ces', 'engine.world-root'])
    .factory('$log', function () {
        console.debug = console.log;
        return console;
    })
    .run(function ($rootWorld, Entity) {
        var gameloop = require('node-gameloop');

        var id = gameloop.setGameLoop(function (delta) {
            $rootWorld.update(delta);
        }, 1000 / 60);

        world.loopId = id;
        world.world = $rootWorld;

        io.on('connection', function (socket) {
            console.log('a user connected');

            var entity = new Entity();
            entity.socket = socket; // temp

            $rootWorld.addEntity(entity);
        });
    });

angular.injector(['app']);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
