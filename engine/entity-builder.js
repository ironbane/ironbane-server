var angular = require('ng-di');

angular.module('engine.entity-builder', ['ces', 'three'])
    .service('EntityBuilder', function (Entity, THREE, $components) {
        this.build = function (name, data) {
            var entity = new Entity(),
                transform = data.matrix || {
                    position: data.position,
                    rotation: data.rotation,
                    scale: data.scale
                };

            entity.name = name;

            if (angular.isArray(transform)) {
                var matrix = new THREE.Matrix4();
                matrix.fromArray(transform);
                matrix.decompose(entity.position, entity.quaternion, entity.scale);
            } else if (angular.isObject(transform)) {
                if (angular.isArray(transform.position)) {
                    entity.position.fromArray(transform.position);
                }
                if (angular.isArray(transform.rotation)) {
                    entity.rotation.fromArray(transform.rotation);
                }
                if (angular.isArray(transform.scale)) {
                    entity.scale.fromArray(transform.scale);
                }
            }

            angular.forEach(data.components, function(componentData, componentName) {
                entity.addComponent($components.get(componentName, componentData));
            });

            return entity;
        };

        // load from ib-entities.json export
        this.load = function (json) {
            var builder = this,
                root = new Entity();

            function parse (data, parent) {
                var entity = builder.build(data.name, data);
                parent.add(entity);

                angular.forEach(data.children, function(child) {
                    parse(child, entity);
                });
            }

            parse(json.entities, root);

            return root;
        };
    });
