const Log = require('../log/Log');

module.exports = class RouteDef {
    #app;
    #routes;

    constructor(app, routes) {
        if (app) this.#app = app;
        this.#routes = routes;
    }

    getRoutes() {
        let tmpRoutes = {},
            routeKeys = Object.keys(this.#routes);

        try {
            for (let i=0; i<routeKeys.length; i++) {
                if (this.#routes[routeKeys[i]].enabled) {
                    tmpRoutes[routeKeys[i]] = {
                        base: this.#routes[routeKeys[i]].base,
                        router: require(this.#routes[routeKeys[i]].router)
                    };
                }
            }
        }
        catch (e) {
            Log.error(e);
        }
        return tmpRoutes;
    }
};
