var angular = require('ng-di');
var THREE = require('three');

angular.module('three', [])
    .factory('THREE', function () {
        return THREE;
    });
