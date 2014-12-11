angular.module('IronbaneAdminApp.status-ctrl', [])
.controller('StatusController', function($scope, ZONES) {
    $scope.zones = ZONES;
});
