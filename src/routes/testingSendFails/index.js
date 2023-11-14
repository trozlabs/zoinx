const { RouteDef } = require('zoinx/core');
const path = require('path');

module.exports = class TestingSendFails extends RouteDef {

    constructor(app) {
        let routes = {
            TestingSendFails: {
                base: '/testingSendFails',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }

};
