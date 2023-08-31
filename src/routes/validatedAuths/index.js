const { RouteDef } = require('../../core');
const path = require('path');

module.exports = class ValidatedAuths extends RouteDef {

    constructor(app) {
        let routes = {
            ValidatedAuths: {
                base: '/validatedAuths',
                router: path.join(__dirname, './route'),
                enabled: true
            }
        };
        super(app, routes);
    }

};
