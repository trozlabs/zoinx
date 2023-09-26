const { RouteDef } = require('zoinx/core');
const path = require('path');

module.exports = class TestingResultsRealtime extends RouteDef {

    constructor(app) {
        let routes = {
            TestingResultsRealtime: {
                base: '/testingResultsRealtime',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }

};
