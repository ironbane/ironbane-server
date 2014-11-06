var angular = require('ng-di'),
    Ammo = require('./ammo.js');

'use strict';

(function() {
    var module = angular.module('ammo', ['three']);
    module.factory('Ammo', function(THREE) {

        Ammo.btVector3.prototype.toTHREEVector3 = function () {
            return new THREE.Vector3(this.x(), this.y(), this.z());
        };

        return Ammo;
    });
})();
