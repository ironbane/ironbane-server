var express = require('express'),
    nconf = require('nconf'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    angular = require('ng-di'),
    requireDir = require('require-dir'),
    world = {},
    server;

require('./config')();

app.set('port', nconf.get('port'));

// CORS to get hosted socket.io script (TODO: use config)
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    next();
});
io.origins('*:*');

// load up all angular stuff
requireDir('./engine', {
    recurse: true
});

angular.module('app', ['ces', 'engine.world-root'])
    .factory('$log', function () {
        console.debug = console.log;
        return console;
    })
    .factory('SnapshotSystem', function (System) {
        var SnapshotSystem = System.extend({
            init: function (io) {
                this.io = io;
                this.emitTime = 1000;
            },
            update: function (dt) {
                this.emitTime -= dt;

                if (this.emitTime <= 0) {
                    var snapshot = {};

                    // later use interest
                    this.world.getEntities().forEach(function (ent) {
                        snapshot[ent.id] = ent.position.toArray();
                    });

                    this.io.emit('snapshot', snapshot);

                    this.emitTime = 1000;
                }
            }
        });

        return SnapshotSystem;
    })
    .run(function ($rootWorld, Entity, SnapshotSystem) {
        var gameloop = require('node-gameloop');

        var id = gameloop.setGameLoop(function (delta) {
            $rootWorld.update(delta);
        }, 1000 / 60);

        //$rootWorld.addSystem(new SnapshotSystem(io));

        world.loopId = id;
        world.world = $rootWorld;

        io.on('connection', function (socket) {
            var entity = new Entity();
            socket.entity = entity;

            $rootWorld.addEntity(entity);

            socket.broadcast.emit('join', {
                entity: entity
            });

            socket.on('sync', function (pos) {
                socket.entity.position.set(pos[0], pos[1], pos[2]);
            });

            socket.on('disconnect', function () {
                console.log('user disconnected');
                $rootWorld.removeEntity(entity);
            });

            socket.on('chat message', function (msg) {
                console.log('chat message', msg);

                if (msg === 'getEntities') {
                    io.emit('chat message', JSON.stringify($rootWorld.getEntities().length));
                } else {
                    io.emit('chat message', msg);
                }
            });
        });
    });

angular.injector(['app']);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

server = http.listen(nconf.get('port'), function () {
    console.log('Ironbane server listening on port ' + server.address().port + ' in ' + app.settings.env + ' mode');
});
