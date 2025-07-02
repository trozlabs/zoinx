const { ResponseObj, APIError, Route, Controller } = require('zoinx/core');
const { Filter } = require('zoinx/util');
const { VerifyAuth } = require('zoinx/middle');
const {TestHarness} = require("zoinx/testing");
const TestConfig = require('./testConfigs/controller');
const  _ = require('lodash');
const { randomUUID } = require('crypto');

const routeLabel = 'Picklists';

module.exports = TestHarness(class PicklistController extends Controller {

    static testConfig = TestConfig;

    route = '/picklists';
    routes = [
        new Route({ method: 'get',      path: '/typelist',  handler: 'getTypeList',     before: [VerifyAuth] }),
        new Route({ method: 'get',      path: '/find',      handler: 'find',            before: [VerifyAuth] }),
        new Route({ method: 'get',      path: '/finda',     handler: 'findA',           before: [VerifyAuth] }),
        new Route({ method: 'get',      path: '/:id?',      handler: 'get',             before: [VerifyAuth] }),
        new Route({ method: 'put',      path: '/:id',       handler: 'put',             before: [VerifyAuth] }),
        new Route({ method: 'delete',   path: '/:id',       handler: 'delete',          before: [VerifyAuth] }),
        new Route({ method: 'post',     path: '/',          handler: 'post',            before: [VerifyAuth] })
    ];

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

        let rtn = await this.service.save(req.body, req.verifiedAuth, req.params.id);

        if (!rtn) {
            throw new APIError(511, `Failed to create ${routeLabel}.`);
        } else if (rtn.stack) {
            throw new APIError(500, `${rtn.message} ${routeLabel}.`);
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

    async getTypeList(req, res) {
        let rtn = await this.service.getPLList();
        let lists = [];
        for (let i = 0; i < rtn.length; i++) {
            lists.push({ _id: randomUUID(), val: rtn[i], lbl: _.capitalize(rtn[i].replace('_',' ')) });
        }
        return lists;
    }

    async find(req, res) {
        const filterObj = new Filter(req);
        const filters = filterObj.getFilters();

        let addedFilter = filterObj.createNewFilters([
            {
                field: 'enabled',
                oper: '=',
                term: true
            }
        ], true);

        let findQueryParams = await this.service.getFindQueryParams(req);
        findQueryParams.filters.push(addedFilter[0]);

        if (findQueryParams.filters.length < 1 || findQueryParams.filters[0].propName !== 'list_key') {
            throw new APIError(400, 'No list key provided');
        }

        let rtn = await this.service.find(findQueryParams);
        return rtn;
    }

    async findA(req, res) {
        let rtn = await this.service.find(await this.service.getFindQueryParams(req));
        return rtn;
    }

});
