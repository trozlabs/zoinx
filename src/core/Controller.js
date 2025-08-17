// TODO: solution to route sorting for conflict prevention:
// https://gist.github.com/ca69cd4c7163bcd9289cfcec2022ab67

const { Logger } = require('../logger');
// local
const Telemetry = require('../telemetry/Telemetry.js');
const APIResponse = require('./APIResponse.js');
const APIError = require('./APIError.js');

const _ = require('lodash');

module.exports = class Controller {
    defaultRoutes = [
        //
        // common http methods calling unimplemented service methods.
        //
        // new Route({ method: 'all',      path: '*',      handler: 'catch'   }),
        // new Route({ method: 'get',      path: '/',      handler: 'get'     }),
        // new Route({ method: 'post',     path: '/',      handler: 'post',   }),
        // new Route({ method: 'put',      path: '/:id',   handler: 'put',    }),
        // new Route({ method: 'delete',   path: '/:id',   handler: 'delete'  }),
        // new Route({ method: 'options',  path: '/',      handler: 'options' }),
        // new Route({ method: 'head',     path: '/',      handler: 'delete'  }),
    ];
    service;
    router;
    routes;
    route = '';

    self;

    constructor(config) {
        this.self = this.constructor;

        const { router, service, routes } = config || {};

        this.logger = Logger.create({ name: this.constructor.name });
        this.service = service || this.service;
        this.router = router || this.router;
        this.routes =
            routes ||
            this.routes ||
            [
                // new Route({ method: 'get',      path: '/:id?',  handler: 'get'     }),
                // new Route({ method: 'post',     path: '/',      handler: 'post',   }),
                // new Route({ method: 'put',      path: '/:id',   handler: 'put',    }),
                // new Route({ method: 'delete',   path: '/:id',   handler: 'delete'  }),
            ];

        this.init(this);
    }

    init(instance) {
        // this.logger.debug(`${this.constructor.name}.init`);
        const routes = [...this.defaultRoutes, ...(this.routes || [])];
        this.addRoutes(routes);
    }

    addRoutes(routes) {
        // this.logger.debug(`${this.constructor.name}.applyRoutes`, routes.length, 'new routes');
        routes.forEach((route) => this.addRoute(route));
    }

    addRoute(route) {
        // this.logger.debug(`${this.constructor.name}.addRoute`, route.method, route.path);

        try {
            const { method, path, handler, enabled, before } = route;
            const routeHandler = typeof handler === 'string' ? this[handler] : handler;

            if (typeof routeHandler !== 'function') {
                throw new Error(`Route handler is not a function or does not match the name of the method on the Controller.`);
            }

            const boundRouteHandler = routeHandler.bind(this);
            const wrappedBoundRouteHandler = this.handler(boundRouteHandler).bind(this);

            route.router = this.router[method](path, before, wrappedBoundRouteHandler);
            route.handler = wrappedBoundRouteHandler;
            route.controller = this;

            if (_.isEmpty(route.router.roleHandles)) route.router.roleHandles = [];
            route.router.roleHandles.push({'base': this.route, 'route_method': method, 'route_path': `${this.route}${path}`});

            this.routes.push(route);

            this.logger.debug(`Initialized: ${this.route}${route.path}`);
        } catch (e) {
            this.logger.error(e, route);
            // console.error(e);
        }
        return this.routes;
    }

    handler(fn) {
        return async function controllerResults(req, res, next) {
            this.logger.debug(`${req.method} ${this.route}${req.path}`);

            const apiResponse = (res.apiResponse = new APIResponse());
            let telemetry;
            try {
                let results = await fn(req, res),
                    telemetryEvents = [],
                    telemetryEventsService = this.service.telemetryEvents;

                if (!_.isEmpty(telemetryEventsService)) {
                    for (let i = 0; i < telemetryEventsService.length; i++) {
                        telemetryEvents.push(telemetryEventsService[i].json);
                    }
                    this.service.telemetryEvents = [];

                    if (!_.isEmpty(this.service.domain?.telemetryEvent)) {
                        telemetryEvents.push(this.service.domain.telemetryEvent.json);
                    }

                    req.telemetryEvents = telemetryEvents;
                    telemetry = new Telemetry(`${this.constructor.name}.controllerResults`, req);
                }
                apiResponse.data = results;
            }
            catch (error) {
                this.logger.error(error);
                if (error instanceof APIError) {
                    apiResponse.status = error.statusCode;
                } else {
                    apiResponse.status = 500;
                }
                apiResponse.error = error;
            }
            finally {
                res.status(apiResponse.statusCode).send(apiResponse.toJSON());
                if (telemetry) telemetry.send();
            }
        };
    }

    async get(req, res) {
        // console.log(`${this.constructor.name}.get`);
        throw new APIError(501);
    }

    async post(req, res) {
        // console.log(`${this.constructor.name}.post`);
        throw new APIError(501);
    }

    async put(req, res) {
        // console.log(`${this.constructor.name}.put`);
        throw new APIError(501);
    }

    async delete(req, res) {
        // console.log(`${this.constructor.name}.delete`);
        throw new APIError(501);
    }

    async catch(req, res) {
        // console.log(`${this.constructor.name}.delete`);
        throw new APIError(501);
    }

    /**
     * Attempts to order routes to prevent conflicts.
     */
    #sortRoutes(routes) {
        return routes.sort((a, b) => {
            if (a.path === b.path) {
                return a.method.localeCompare(b.method);
            } else {
                return b.path.length - a.path.length;
            }
        });
    }
};
