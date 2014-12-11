angular.module('IronbaneAdminApp', [
    'engine.socket',
    'IronbaneAdminApp.status-ctrl'
])
.run(function(Socket, $rootScope, $log, ZONES) {
    $rootScope.adminSocket = new Socket('/admin');

    $rootScope.adminSocket.connect();

    $rootScope.status = {};

    angular.forEach(ZONES, function(zone) {
        $rootScope.status[zone] = {entities: 0, sockets: []};
    });

    $rootScope.adminSocket.on('ibConnection', function (data) {
        $log.log('client connect: ', data);
        $rootScope.status[data.zoneId].sockets.push(data.socketId);
    });

    $rootScope.adminSocket.on('ibDisconnect', function (data) {
        $log.log('client disconnect: ', data);
        $rootScope.status[data.zoneId].sockets = _.without($rootScope.status[data.zoneId].sockets, data.socketId);
    });
});
