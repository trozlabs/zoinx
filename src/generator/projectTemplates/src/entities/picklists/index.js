const { RouteDef } = require('zoinx/core');
const path = require('path');

module.exports = class Picklists extends RouteDef {
    constructor(app) {
        let routes = {
            Picklists: {
                base: '/picklists',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }
};
