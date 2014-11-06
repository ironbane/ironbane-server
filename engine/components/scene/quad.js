var angular = require('ng-di');

angular.module('components.scene.quad', ['ces', 'three', 'engine.texture-loader'])
    .config(function ($componentsProvider) {
        'use strict';

        $componentsProvider.addComponentData({
            'quad': {
                transparent: false,
                color: 0xffffff,
                texture: null
            }
        });
    })
    .factory('QuadSystem', function (System, THREE, TextureLoader) {
        'use strict';

        var QuadSystem = System.extend({
            addedToWorld: function (world) {
                var sys = this;

                sys._super(world);

                world.entityAdded('quad').add(function (entity) {
                    var quadData = entity.getComponent('quad'),
                        quad;

                    var planeGeo = new THREE.PlaneGeometry(1.0, 1.0, 1, 1);

                    quad = new THREE.Mesh(planeGeo, new THREE.MeshLambertMaterial());
                    quad.material.side = THREE.DoubleSide;
                    quad.geometry.dynamic = true;

                    if (quadData.texture) {
                        TextureLoader.load(quadData.texture)
                            .then(function (texture) {
                                // texture.needsUpdate = true;
                                quad.material.map = texture;
                                quad.material.needsUpdate = true;
                                quad.geometry.buffersNeedUpdate = true;
                                quad.geometry.uvsNeedUpdate = true;
                                quad.material.transparent = quadData.transparent;
                            });
                    }

                    quadData.quad = quad;
                    entity.add(quad);
                });
            },
            update: function () {
                var world = this.world;
            }
        });

        return QuadSystem;
    });
