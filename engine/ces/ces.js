var angular = require('ng-di');

require('./class.js');
require('./component.js');
require('./entity.js');
require('./entitlist.js');
require('./family.js');
require('./signal.js');
require('./system.js');
require('./world.js');
require('./components-registry.js');
require('./systems-registry.js');


module.exports = angular.module('ces', [
    'ces.class',
    'ces.component',
    'ces.entity',
    'ces.entitylist',
    'ces.family',
    'ces.signal',
    'ces.system',
    'ces.world',
    'ces.components-registry',
    'ces.systems-registry'
]);
