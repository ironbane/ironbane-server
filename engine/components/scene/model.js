var angular = require('ng-di');

angular.module('components.scene.model', ['ces', 'three'])
    .config(function ($componentsProvider) {
        'use strict';

        $componentsProvider.addComponentData({
            'model': {
                'type': 'Box',
                'material': null,
                'mesh': null,
                'receiveShadows': true,
                'castShadows': false
            }
        });
    })
    .factory('ModelSystem', function (System, THREE) {
        'use strict';

        function getGeometry(type) {
            var geometry;

            if (type === 'Box') {
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            }

            if (type === 'Sphere') {
                geometry = new THREE.SphereGeometry(1);
            }

            if (type === 'Circle') {
                geometry = new THREE.CircleGeometry(1);
            }

            if (type === 'Cylinder') {
                geometry = new THREE.CylinderGeometry();
            }

            if (type === 'Icosahedron') {

            }

            if (type === 'Torus') {

            }

            if (type === 'TorusKnot') {

            }

            if (type === 'mesh') {
                // TODO: load a json mesh from asset cache
            }

            return geometry;
        }

        var ModelSystem = System.extend({
            addedToWorld: function (world) {
                var sys = this;

                sys._super(world);

                world.entityAdded('model').add(function (entity) {
                    sys.onEntityAdded(entity);
                });
            },
            update: function () {},
            onEntityAdded: function (entity) {
                var component = entity.getComponent('model'),
                    geometry = getGeometry(component.type);

                component.model = new THREE.Mesh(geometry);
                entity.add(component.model);
            },
            onEntityRemoved: function (entity) {
                // TODO
            }
        });

        return ModelSystem;
    });
