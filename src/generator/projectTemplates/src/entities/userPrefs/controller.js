const { ResponseObj, APIError, Route, Controller } = require('zoinx/core');
const { TestHarness } = require('zoinx/testing');
const { VerifyAuth } = require('zoinx/middle');

const routeLabel = 'UserPrefs';

module.exports = TestHarness(class UserPrefs extends Controller {

    static testConfig = {
        'get': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['result=><object>']
        },
        'post': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"body": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><object>']
        },
        'put': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"body": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><object>']
        },
        'delete': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><object>']
        },
        'find': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['record=><array>']
        }
    }

    route = '/userPrefs';
    routes = [
        new Route({ method: 'get',      path: '/find',      before: [VerifyAuth],       handler: 'find'         }),
        new Route({ method: 'get',      path: '/:id',       before: [VerifyAuth],       handler: 'get'          }),
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
        // let rtn = await this.service.testConvert();
        return rtn;
    }

    async post(req, res) {
        if (!req.body || Object.keys(req.body).length < 1) {
            throw new APIError(500, 'No document sent to save.');
        }

        let rtn = await this.service.save(req.body, req.verifiedAuth, req.params.id);

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

        let rtn = await this.service.save(req.body, req.verifiedAuth, req.params.id);
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
        let rtn = await this.service.find(await this.service.getFindQueryParams(req));
        return rtn;
    }
})
