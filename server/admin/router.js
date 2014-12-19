var express = require('express'),
    passport = require('passport'),
    path = require('path'),
    nconf = require('nconf'),
    EntityService = require('../entity-service.js');

require('./auth.js')();

module.exports = function (app) {
    'use strict';

    var router = express.Router();

    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');

    router.use(express.static(path.join(__dirname, 'www')));

    router.use(function (req, res, next) {
        passport.authenticate('basic', {
            session: false
        })(req, res, next);
    });

    router.get('/', function (req, res) {
        res.render('index', {
            zones: nconf.get('zones')
        });
    });

    router.get('/entities/:zoneId', function(req, res) {
        EntityService.getAll(req.params.zoneId).then(res.send, function(err) {
            res.send(500, err);
        });
    });

    app.use('/', router);

};
