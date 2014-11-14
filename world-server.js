// this isn't used at the moment... very WIP

var express = require('express'),
    nconf = require('nconf'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    angular = require('ng-di'),
    requireDir = require('require-dir'),
    world = {},
    redis = require('socket.io-redis'),
    sticky = require('sticky-session');


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
                this.emitTime = 480;
            },
            update: function (dt) {
                this.emitTime -= dt * 1000;

                if (this.emitTime <= 0) {
                    var snapshot = {};

                    // later use interest
                    this.world.getEntities().forEach(function (ent) {
                        snapshot[ent.id] = ent.position.toArray();
                    });

                    this.io.emit('snapshot', snapshot);

                    this.emitTime = 480;
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

        $rootWorld.addSystem(new SnapshotSystem(io));

        world.loopId = id;
        world.world = $rootWorld;

        io.on('connection', function (socket) {
            var entity = new Entity();
            socket.entity = entity;

            $rootWorld.addEntity(entity);

            socket.broadcast.emit('join', {
                entity: entity.id
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
