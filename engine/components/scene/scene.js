var angular = require('ng-di');

angular.module('components.scene.scene', ['ces', 'three', 'engine.entity-builder'])
    .config(function ($componentsProvider) {
        'use strict';

        $componentsProvider.addComponentData({
            'scene': {
                'path': ''
            }
        });
    })
    .factory('SceneSystem', function (System, THREE, $http, TextureLoader, EntityBuilder) {
        'use strict';

        var SceneSystem = System.extend({
            addedToWorld: function (world) {
                var sys = this;

                sys._super(world);

                world.entityAdded('scene').add(function (entity) {
                    sys.onEntityAdded(entity);
                });
            },
            update: function () {

            },
            onEntityAdded: function (entity) {
                var component = entity.getComponent('scene');

                // these are clara.io exports
                var loader = new THREE.ObjectLoader();

                var meshTask = $http.get('assets/scene/' + component.id + '/ib-world.json')
                    .success(function (data) {
                        // THREE does not store material names/metadata when it recreates the materials
                        // so we need to store them here and then load the material maps ourselves

                        component.scene = loader.parse(data);

                        var originalMats = data.materials[0].materials;

                        for (var i = 0; i < originalMats.length; i++) {

                            if (originalMats[i].name) {

                                var texName = originalMats[i].name.split('.')[0];

                                (function (texName, material, geometry) {
                                    TextureLoader.load('assets/scene/' + component.id + '/' + texName + '.png')
                                        .then(function (texture) {
                                            material.map = texture;
                                            material.needsUpdate = true;
                                            geometry.buffersNeedUpdate = true;
                                            geometry.uvsNeedUpdate = true;
                                        });
                                })(texName, component.scene.material.materials[i], component.scene.geometry); //jshint ignore:line

                            }
                        }

                        component.scene.material.needsUpdate = true;

                        entity.add(component.scene);
                    });

                var entitiesTask = $http.get('assets/scene/' + component.id + '/ib-entities.json')
                    .then(function(response) {
                        var entities = EntityBuilder.load(response.data);

                        entity.add(entities);
                    });

                // Link the promises to the component so we can
                // wait for the mesh to load in other components
                component.meshTask = meshTask;
                component.entitiesTask = entitiesTask;
            },
            onEntityRemoved: function (entity) {
                // TODO
            }
        });

        return SceneSystem;
    });
