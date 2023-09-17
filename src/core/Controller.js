// sibling
const { Log } = require('../log');
// local
const Route = require('./Route');
const APIError = require('./APIError');
const APIResponse = require('./APIResponse');
const Telemetry = require('../telemetry/Telemetry');
const Network = require('../util/Network');
const _ = require('lodash');
const path = require('path');
const { randomUUID } = require('crypto');


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
        // console.log(`${this.constructor.name}.constructor`);

        const { router, service, routes } = config || {};

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
        // console.log(`${this.constructor.name}.init`);
        const routes = [...this.defaultRoutes, ...(this.routes || [])];
        this.addRoutes(routes);
    }

    addRoutes(routes) {
        // console.log(`${this.constructor.name}.applyRoutes`, routes.length, 'new routes');
        routes.forEach((route) => this.addRoute(route));
    }

    addRoute(route) {
        // console.log(`${this.constructor.name}.applyRoute`, route.method, route.path);

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

            Log.debug(`Initialized: ${this.route}${route.path}`);
        } catch (e) {
            console.error(`${e.message}`, route);
            console.error(e);
        }
        return this.routes;
    }

    handler(fn) {
        return async function controllerResults(req, res, next) {
            // let ugh = require('../inspect/').parseFunction(returnResutls, arguments);
            // console.log(require('../inspect/').parseError(new Error('zippy')));
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

                    if (!_.isEmpty(this.service.domain.telemetryEvent)) {
                        telemetryEvents.push(this.service.domain.telemetryEvent.json);
                    }

                    req.telemetryEvents = telemetryEvents;
                    telemetry = new Telemetry(`${this.constructor.name}.controllerResults`, req);
                }
                apiResponse.data = results;
            }
            catch (error) {
                console.error(error);
                if (error instanceof APIError) {
                    apiResponse.status = error.statusCode;
                } else {
                    apiResponse.status = 500;
                }
                apiResponse.error = error;
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
};
