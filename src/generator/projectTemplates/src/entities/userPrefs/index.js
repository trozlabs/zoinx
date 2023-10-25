const { RouteDef } = require('zoinx/core');
const path = require('path');

module.exports = class UserPrefs extends RouteDef {

    constructor(app) {
        let routes = {
            UserPrefs: {
                base: '/userPrefs',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }

};
