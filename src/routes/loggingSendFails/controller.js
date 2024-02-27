const { ResponseObj, APIError, Route, Controller } = require('../../core');
const { TestHarness } = require('../../testing');
const { VerifyAuth } = require('../../middleware');

const routeLabel = 'LoggingSendFails';

module.exports = TestHarness(class LoggingSendFails extends Controller {

    route = '/loggingSendFails';
    routes = [
        new Route({ method: 'get',      path: '/find',      before: [VerifyAuth],      handler: 'find' }),
        new Route({ method: 'get',      path: '/:id?',      before: [VerifyAuth],      handler: 'get' }),
        new Route({ method: 'delete',   path: '/:id',       before: [VerifyAuth],      handler: 'delete' })
    ]

    constructor(config) {
        super(config);
        this.init(this);
    }

    async get(req, res) {
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
