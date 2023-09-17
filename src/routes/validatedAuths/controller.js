const { ResponseObj, APIError, Route, Controller, AppCache } = require('../../core');
const { Filter } = require('../../util');
const { TestHarness } = require('../../testing');
const { VerifyAuth } = require('../../middleware');

const routeLabel = 'ValidatedAuths';

module.exports = TestHarness(class ValidatedAuthsCtrlr extends Controller {

    static testConfig = {
        'get': {
            input: [
                'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
                'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
            ],
            output: ['result=><array>']
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

    route = '/userPrefs';
    routes = [
        new Route({ method: 'get',      path: '/find',      handler: 'find'         }),
        new Route({ method: 'get',      path: '/:id?',      handler: 'get'          }),
        new Route({ method: 'delete',   path: '/:id',       handler: 'delete'       })
    ]

    constructor(config) {
        super(config);
        this.init(this);
    }

    async get(req, res) {
        // throw new APIError(400, 'Some helpful user facing error', 'The real reason we had an error');
        let rtn = await this.service.get(req.params.id);
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
