const { RouteDef } = require('../../core');
const path = require('path');

module.exports = class RouteRoles extends RouteDef {

    constructor(app) {
        let routes = {
            ValidatedAuths: {
                base: '/routeRoles',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }

};
