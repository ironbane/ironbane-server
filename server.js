var express = require('express'),
    cluster = require('cluster'),
    net = require('net'),
    sio = require('socket.io'),
    sio_redis = require('socket.io-redis'),
    nconf = require('nconf'),
    config = require('/opt/ironbane-secret/ironbane-dev-settings/ibconfig.json'),
    seneca = require('seneca');


// load config and defaults
require('./config')();

var port = nconf.get('port'),
    num_processes = nconf.get('num_workers') || require('os').cpus().length;

var MongoClient = require('mongodb').MongoClient,
    mongoUrl = 'mongodb://' + config.mongouser + ':' + config.mongopass + '@' + nconf.get('mongo_host') + ':' + nconf.get('mongo_port') + '/ironbane'; // TODO: auth

if (cluster.isMaster) {

    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) {
            console.error('unable to connect to mongo: ', err);
            return;
        }

        db.collection('entities').drop(function (err) {
            if (err) {
                console.log('error dropping entities', err);
            }

            // all done
            db.close();
        });
    });

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
    var app = new express();

    var MongoClient = require('mongodb').MongoClient,
        mongoUrl = 'mongodb://' + config.mongouser + ':' + config.mongopass + '@' + nconf.get('mongo_host') + ':' + nconf.get('mongo_port') + '/ironbane',
    _db;

    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) {
            console.error('unable to connect to mongo: ', err);
            return;
        }

        _db = db;
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

    // TODO: remove test endpoint
    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/index.html');
    });
    // this is just a debug / test method
    app.get('/entities', function (req, res) {
        // TODO: service getter
        if (_db) {
            _db.collection('entities').find({}).toArray(function (err, docs) {
                if (err) {
                    res.send(500, err);
                } else {
                    res.send(docs);
                }
            });
        } else {
            res.send(500, 'no db connection');
        }
    });


    // Don't expose our internal server to the outside.
    var server = app.listen(0, 'localhost'),
        io = sio(server);

    // Tell Socket.IO to use the redis adapter. By default, the redis
    // server is assumed to be on localhost:6379. You don't have to
    // specify them explicitly unless you want to change them.
    io.adapter(sio_redis({
        host: nconf.get('redis_host'),
        port: nconf.get('redis_port')
    }));

    // Here you might use Socket.IO middleware for authorization etc.
    io.on('connection', function (socket) {
        console.log('player connected: ', socket.id);

        socket.on('disconnect', function () {
            console.log('player disconnected: ', socket.id);
            if (_db) {
                _db.collection('entities').remove({
                    socket: socket.id
                }, function (err, result) {
                    if (err) {
                        console.error('error removing entity: ', socket.id);
                        return;
                    }
                    // do something with result?
                });
            }
        });

        socket.on('chat message', function (msg) {
            io.emit('chat message', {
                id: socket.id,
                msg: msg,
                worker: process.env.pid
            });
        });

        socket.on('request spawn', function () {
            console.log('spawn requested!', socket.id);

            var playerEnt = {
                position: [22, 5, -10],
                rotation: [0, Math.PI - 0.4, 0],
                socket: socket.id
            };

            if (_db) {
                _db.collection('entities').insert([
                    playerEnt
                ], function (err, result) {
                    if (err) {
                        console.error('error writing to db', err);
                        return;
                    }

                    // TODO: send server ID along with spawn? or generate another entity ID
                    console.log('success add documents to db;', result);
                    socket.emit('spawn', playerEnt);
                });
            }
        });

        socket.on('movement', function (data) {
            //console.log('movement: ', data, socket.id);
            // this is gonna happen a LOT this *needs improvement*
            if (_db) {
                _db.collection('entities').update({
                    socket: socket.id
                }, {$set: data}, function (err, result) {
                    if (err) {
                        console.error('error updating entity: ', err);
                        return;
                    }
                    // do anything with result?
                });
            }
        });

        socket.on('sync', function () {
            //console.log('sync: ', socket.id);
            // I know this sucks, but it's the easiest way I could think of, have each client request updates
            if(_db) {
                _db.collection('entities').find({}).toArray(function (err, docs) {
                    if (err) {
                        console.error('db error get entities: ', err);
                    }

                    socket.emit('sync', docs || []);
                });
            }
        });

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
