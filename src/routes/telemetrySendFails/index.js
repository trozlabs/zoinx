const { RouteDef } = require('../../core');
const path = require('path');

module.exports = class TelemetrySendFails extends RouteDef {

    constructor(app) {
        let routes = {
            // RouteRoles: {
            TelemetrySendFails: {
                base: '/telemetrySendFail',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }

};
