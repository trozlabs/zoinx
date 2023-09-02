const { ResponseObj, APIError, Route, Controller, AppCache } = require('../../core');
const { Filter } = require('../../util');
const { TestHarness } = require('../../testing');
const { VerifyAuth } = require('../../middleware');

const routeLabel = 'RouteRoles';

module.exports = TestHarness(class RouteRolesCtrlr extends Controller {

    static testConfig = {
        'get': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['result=><array>']
        },
        'post': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"body": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><array>']
        },
        'put': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"body": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><array>']
        },
        'delete': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><array>']
        },
        'find': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><array>']
        }
    }

    route = '/RouteRoles';
    routes = [
        new Route({ method: 'get',      path: '/find',      before: [VerifyAuth],       handler: 'find'         }),
        new Route({ method: 'get',      path: '/:id?',      before: [VerifyAuth],       handler: 'get'          }),
        new Route({ method: 'put',      path: '/:id',       before: [VerifyAuth],       handler: 'put'          }),
        new Route({ method: 'delete',   path: '/:id',       before: [VerifyAuth],       handler: 'delete'       }),
        new Route({ method: 'post',     path: '/',          before: [VerifyAuth],       handler: 'post'         })
    ]

    constructor(config) {
        super(config);
        this.init(this);
    }

    async get(req, res) {
        let rtn = await this.service.get(req.params.id);
        return rtn;
    }

    async post(req, res) {
        if (!req.body || Object.keys(req.body).length < 1) {
            throw new APIError(500, 'No document sent to save.');
        }

        let rtn = await this.service.save(req.params.id, req.body, req.session);

        if (!rtn) {
            throw new APIError(`Failed to create ${routeLabel}.`);
        }
        else if (rtn.stack) {
            throw new APIError(`${rtn.message} ${routeLabel}.`);
        }

        rtn = ResponseObj.omitProperties(rtn, '_doc', ['__v']);
        return rtn;
    }

    async put(req, res) {
        if (!req.body || Object.keys(req.body).length < 1) {
            throw new APIError(400, 'No changes sent to save.');
        }

        let rtn = await this.service.save(req.params.id, req.body, req.session);
        if (!rtn) {
            throw new APIError(400, `${routeLabel} with the ID ${req.params.id} was not found and could not be updated.`);
        }

        rtn = await this.service.get(req.params.id);
        rtn = ResponseObj.omitProperties(rtn, '_doc', ['__v']);
        return rtn;
    }

    async delete(req, res) {
        let rtn = await this.service.remove(req.params.id);

        if (!rtn) {
            throw new APIError(400, `${routeLabel} with the ID ${req.params.id} was not found and could not be deleted.`);
        }
        return rtn;
    }

    async find(req, res) {
        const filterObj = new Filter(req);
        const filters = filterObj.getFilters();

        if (filters.length < 1) {
            throw new APIError(400, 'A filter must be provided to get results.');
        }

        let rtn = await this.service.find(req, filters);
        return rtn;
    }
})