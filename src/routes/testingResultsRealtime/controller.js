const { ResponseObj, APIError, Route, Controller } = require('../../core');
const { TestHarness } = require('../../testing');
const { VerifyAuth } = require('../../middleware');

const routeLabel = 'TestingResultsRealtime';

module.exports = TestHarness(class TestingResultsRealtime extends Controller {

    route = '/testingResultsRealtime';
    routes = [
        new Route({ method: 'get',      path: '/getcache',  before: [VerifyAuth],      handler: 'getCache' }),
        new Route({ method: 'get',      path: '/find',      before: [VerifyAuth],      handler: 'find' }),
        new Route({ method: 'get',      path: '/:id?',      before: [VerifyAuth],      handler: 'get' }),
        new Route({ method: 'put',      path: '/:id',       before: [VerifyAuth],      handler: 'put' }),
        new Route({ method: 'delete',   path: '/:id',       before: [VerifyAuth],      handler: 'delete' }),
        new Route({ method: 'post',     path: '/',          before: [VerifyAuth],      handler: 'post' })
    ]

    constructor(config) {
        super(config);
        this.init(this);
    }

    //global.testingConfig.testResultsMap
    async getCache(req, res){
        return this.service.getCache();
    }

    async get(req, res) {
        let rtn = await this.service.get(req.params.id);
        return rtn;
    }

    async post(req, res) {
        if (!req.body || Object.keys(req.body).length < 1) {
            throw new APIError(500, 'No document sent to save.');
        }

        let rtn = await this.service.save(req.params.id, req.body, req.verifiedAuth);

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

        let rtn = await this.service.save(req.params.id, req.body, req.verifiedAuth);
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
