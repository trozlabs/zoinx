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

        // if (Object.keys(this.#routes)[0] === 'session')
        //     console.log('bada bing');

        routeKeys.forEach((key) => {
            if (this.#routes[key].enabled) {
                tmpRoutes[key] = {
                    base: this.#routes[key].base,
                    router: require(this.#routes[key].router)
                };
            }
        });
        return tmpRoutes;
    }
};
