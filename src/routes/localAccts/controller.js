const { ResponseObj, APIError, Route, Controller, AppCache } = require('../../core');
const { TestHarness } = require('../../testing');
const bcrypt = require('bcryptjs');
const {VerifyAuth} = require("../../middleware");

const routeLabel = 'LocalAccts';

module.exports = TestHarness(class LocalAcctsCtrlr extends Controller {

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
        }
    }

    route = '/localAccts';
    routes = [
        new Route({ method: 'get',      path: '/:id?',      handler: 'get',      before: [VerifyAuth] }),
        new Route({ method: 'post',     path: '/',          handler: 'post',     before: [VerifyAuth] })
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

        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);

        let rtn = await this.service.save(req.body, {user: 'SYSTEM'}, req.params.id);

        if (!rtn) {
            throw new APIError(511, `Failed to create ${routeLabel}.`);
        }
        else if (rtn.stack) {
            throw new APIError(500, `${rtn.message} ${routeLabel}.`);
        }

        rtn = ResponseObj.omitProperties(rtn, '_doc', ['__v', 'password']);
        return rtn;
    }

})
