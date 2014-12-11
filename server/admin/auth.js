var passport = require('passport'),
    nconf = require('nconf'),
    BasicStrategy = require('passport-http').BasicStrategy;

module.exports = function () {
    'use strict';

    passport.use(new BasicStrategy(
        function(username, password, done) {

            var creds = nconf.get('admin_auth'),
                un = creds.username,
                pw = creds.password,
                isValid = username === un && password === pw;

            if (isValid) {
                return done(null, true);
            }

            return done(401, false);
        }
    ));
};
