var angular = require('ng-di');

angular.module('components', [

    'components.scene.camera',
    'components.scene.collision-reporter',
    'components.scene.helper',
    'components.scene.light',
    'components.scene.model',
    'components.scene.rigid-body',
    'components.scene.sprite',
    'components.scene.scene',
    'components.scene.quad',

    'components.script',
    'components.sound',
    'components.gameplay.health',

]);
