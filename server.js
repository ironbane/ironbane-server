'use strict';

var express = require('express'),
    cluster = require('cluster'),
    net = require('net'),
    sio = require('socket.io'),
    sio_redis = require('socket.io-redis'),
    nconf = require('nconf'),
    passport = require('passport');

// load config and defaults
require('./config')();

var port = nconf.get('port'),
    num_processes = nconf.get('num_workers') || require('os').cpus().length;

var MongoClient = require('mongodb').MongoClient,
    mongoUrl;

if (nconf.get('mongo_useAuth')) {
    mongoUrl = 'mongodb://' + nconf.get('mongo_user') + ':' + nconf.get('mongo_pass') + '@' + nconf.get('mongo_host') + ':' + nconf.get('mongo_port');
} else {
    mongoUrl = 'mongodb://' + nconf.get('mongo_host') + ':' + nconf.get('mongo_port');
}

// TODO: use db
var zones = nconf.get('zones') || [];

var EntityService = require('./server/entity-service.js');

if (cluster.isMaster) {

    // This stores our workers. We need to keep them to be able to reference
    // them based on source IP address. It's also useful for auto-restart,
    // for example.
    var workers = [];

    // Helper function for spawning worker at index 'i'.
    var spawn = function (i) {
        workers[i] = cluster.fork();

        // Optional: Restart worker on exit
        workers[i].on('exit', function (worker, code, signal) {
            console.log('respawning worker', i);
            spawn(i);
        });
    };

    // Spawn workers.
    for (var i = 0; i < num_processes; i++) {
        spawn(i);
    }

    // Helper function for getting a worker index based on IP address.
    // This is a hot path so it should be really fast. The way it works
    // is by converting the IP address to a number by removing the dots,
    // then compressing it to the number of slots we have.
    //
    // Compared against "real" hashing (from the sticky-session code) and
    // "real" IP number conversion, this function is on par in terms of
    // worker index distribution only much faster.
    var worker_index = function (ip, len) {
        var s = '';
        for (var i = 0, _len = ip.length; i < _len; i++) {
            if (ip[i] !== '.') {
                s += ip[i];
            }
        }

        return Number(s) % len;
    };

    // Create the outside facing server listening on our port.
    var server = net.createServer(function (connection) {
        // We received a connection and need to pass it to the appropriate
        // worker. Get the worker for this connection's source IP and pass
        // it the connection.
        var worker = workers[worker_index(connection.remoteAddress, num_processes)];
        worker.send('sticky-session:connection', connection);
    }).listen(port);

} else {
    // Note we don't use a port here because the master listens on it for us.
    var app = new express(),
        _db;

    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) {
            console.error('unable to connect to mongo: ', err);
            return;
        }

        _db = db;
        db.db(nconf.get('mongo_db'));

        EntityService.init(db);
    });

    // Here you might use middleware, attach routes, etc.
    // CORS to get hosted socket.io script (TODO: use config)
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        next();
    });

    // session / auth
    app.use(passport.initialize());

    // admin site routes
    require('./server/admin/router.js')(app);

    // Don't expose our internal server to the outside.
    var server = app.listen(0, 'localhost'),
        io = sio(server);

    io.adapter(sio_redis({
        key: nconf.get('sio_redis_key'),
        host: nconf.get('redis_host'),
        port: nconf.get('redis_port')
    }));

    // TODO: factor out into service
    var chatHandler = function (socket) {
        console.log('chat connected: ', socket.id);

        // TODO: better validation etc. and rooms
        socket.on('message', function (data) {
            socket.emit('message', data);
        });
    };

    // Here you might use Socket.IO middleware for authorization etc.
    var bindToZone = function (zoneId) {
        // wrapping this in zoneId for the database
        var bindSocket = function (socket) {
            io.of('/admin').emit('ibConnection', {
                socketId: socket.id,
                zoneId: zoneId
            });
            console.log('player connected: ', socket.id);

            socket.on('disconnect', function () {
                console.log('player disconnected: ', socket.id);
                EntityService.remove(zoneId, socket.id);

                io.of('/admin').emit('ibDisconnect', {
                    socketId: socket.id,
                    zoneId: zoneId
                });
            });

            socket.on('request spawn', function (data) {
                //console.log('[', socket.id, '] spawn requested in', zoneId, ' >> ', data);

                // temp crash protection
                if(!data) {
                    data = {};
                }

                // super hack until this can come from the server reading ib_entities or db
                var spawnpoint = [22, 25, -10];
                if(zoneId === 'tower-of-doom') {
                    spawnpoint = [0, 3, 0];
                }

                var playerEnt = {
                    handle: data.handle || 'no name mcgee',
                    position: spawnpoint,
                    rotation: [0, Math.PI - 0.4, 0],
                    socket: socket.id,
                    components: data.components || {}
                };

                EntityService.add(zoneId, playerEnt).then(function (result) {
                    //console.log('add entity result: ', result);
                    socket.emit('spawn', playerEnt);
                });
            });

            socket.on('movement', function (data) {
                EntityService.update(zoneId, socket.id, data);
            });

            socket.on('sync', function () {
                // TODO: grab spatially
                EntityService.getAll(zoneId).then(function (entities) {
                    socket.emit('sync', entities);
                });
            });

        };
        // this is the actual callback for the socket io connection
        return bindSocket;
    };

    // default namespace
    io.of('/chat').on('connection', chatHandler);
    io.of('/admin').on('connection', chatHandler); // TODO: separate handler
    zones.forEach(function (zoneId) {
        io.of('/' + zoneId).on('connection', bindToZone(zoneId));
    });

    // Listen to messages sent from the master. Ignore everything else.
    process.on('message', function (message, connection) {
        if (message !== 'sticky-session:connection') {
            return;
        }

        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        server.emit('connection', connection);
    });

    var exitHandler = function (options, err) {
        if (_db) {
            _db.close();
        }
        if (options.cleanup) {
            console.log('clean');
        }
        if (err) {
            console.log(err.stack);
        }
        if (options.exit) {
            process.exit();
        }
    };

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, {
        cleanup: true
    }));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {
        exit: true
    }));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {
        exit: true
    }));
}
