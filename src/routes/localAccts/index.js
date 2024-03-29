const { RouteDef } = require('../../core');
const path = require('path');

module.exports = class LocalAccts extends RouteDef {

    constructor(app) {
        let routes = {
            LocalAccts: {
                base: '/localAccts',
                router: path.join(__dirname, './route'),
                enabled: false
            }
        };
        super(app, routes);
    }

};
