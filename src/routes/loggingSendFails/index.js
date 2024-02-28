const { RouteDef } = require('zoinx/core');
const path = require('path');

module.exports = class LoggingSendFails extends RouteDef {

    constructor(app) {
        let routes = {
            LoggingSendFails: {
                base: '/loggingSendFails',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }

};
