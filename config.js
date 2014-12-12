/*global require:true, __dirname:true, process:true, module:true */

// The purpose of this file is to setup the use
// of a configuration file for our node server.

// Modules.
var nconf = require('nconf'),
    path = require('path'),
    fs = require('fs');

// Export module.
module.exports = function (env) {
    'use strict';

    // Configuration object.
    var config = {};

    config.path = __dirname + '/config';
    config.baseFile = config.path + '/base.json';
    config.overrideFile = config.path + '/config.json';

    // overrides should be the very first thing
    if (fs.existsSync(config.overrideFile)) {
        nconf.overrides(JSON.parse(fs.readFileSync(config.overrideFile)));
        console.log('Loading overrides from ' + config.overrideFile);
    }

    // THEN use env & args
    nconf.env().argv();

    var NODE_ENV = nconf.get('NODE_ENV') || 'development';

    if (env && (NODE_ENV !== env)) {
        nconf.set('NODE_ENV', env);
        NODE_ENV = env;
    }

    config.environmentFile = config.path + '/' + NODE_ENV + '.json';

    // finally the config file and defaults
    nconf.file({
        file: config.environmentFile
    });
    nconf.defaults(JSON.parse(fs.readFileSync(config.baseFile, 'utf-8')));

    nconf.set('applicationPath', __dirname + '/');

    return config;
};
