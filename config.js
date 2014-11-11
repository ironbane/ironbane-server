/*global require:true, __dirname:true, process:true, module:true */

// The purpose of this file is to setup the use
// of a configuration file for our node development server.

// Modules.
var nconf = require('nconf'),
    path = require('path'),
    fs = require('fs');



// Export module.
module.exports = function (env) {
    'use strict';

    nconf.argv().env();

    // Configuration object.
    var config = {},
        NODE_ENV = nconf.get('NODE_ENV') || 'development';

    if (env && (NODE_ENV !== env)) {
        nconf.set('NODE_ENV', env);
        NODE_ENV = env;
    }

    config.path = __dirname + '/config';
    config.baseFile = config.path + '/base.json';
    config.overrideFile = config.path + '/config.json';
    config.environmentFile = config.path + '/' + NODE_ENV + '.json';

    nconf.file({file: config.environmentFile});
    if (fs.existsSync(config.overrideFile)) {
        nconf.overrides(JSON.parse(fs.readFileSync(config.overrideFile)));
        console.log('Loading config overrides from config.json');
    }
    nconf.defaults(JSON.parse(fs.readFileSync(config.baseFile, 'utf-8')));
    nconf.set('applicationPath', __dirname + '/');

    return config;
};
