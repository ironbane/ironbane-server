'use strict';

var Q = require('q'),
    _dbConnection,
    _ready = Q.defer(),
    isReady = _ready.promise;

var init = function (db) {
    if (!_dbConnection) {
        _dbConnection = db;
        _ready.resolve(_dbConnection);
    }
};

var getAllEntities = function (zoneId) {
    return isReady.then(function (_db) {
        var deferred = Q.defer();

        _db.collection(zoneId + '_entities').find({}).toArray(function (err, docs) {
            if (err) {
                console.error('error getting entities from ', zoneId, ' >> ', err);
                deferred.reject(err);
            } else {
                deferred.resolve(docs);
            }
        });

        return deferred.promise;
    });
};

var insertEntity = function (zoneId, data) {
    return isReady.then(function (_db) {
        var deferred = Q.defer();

        _db.collection(zoneId + '_entities').insert([
            data
        ], function (err, result) {
            if (err) {
                console.error('error writing to db', err);
                deferred.reject(err);
                return;
            }

            deferred.resolve(result);
        });

        return deferred.promise;
    });
};

var updateBySocketId = function (zoneId, socketId, data) {
    return isReady.then(function (_db) {
        var deferred = Q.defer();

        _db.collection(zoneId + '_entities').update({
            socket: socketId
        }, {
            $set: data
        }, function (err, result) {
            if (err) {
                console.error('error updating entity: ', err);
                return deferred.reject(err);
            } else {
                return deferred.resolve(result);
            }
        });

        return deferred.promise;
    });
};

var removeBySocketId = function (zoneId, socketId) {
    return isReady.then(function (_db) {
        var deferred = Q.defer();

        _db.collection(zoneId + '_entities').remove({
            socket: socketId
        }, function (err, result) {
            if (err) {
                console.error('error removing entity: ', socket.id);
                return deferred.reject(err);
            } else {
                return deferred.resolve(result);
            }
        });

        return deferred.promise;
    });
};

module.exports = {
    init: init,
    isReady: isReady,
    add: insertEntity,
    getAll: getAllEntities,
    update: updateBySocketId,
    remove: removeBySocketId
};
