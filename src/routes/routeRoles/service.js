const { Service } = require('../../core');
const { TestHarness } = require('../../testing');
const path = require("path");
const _ = require("lodash");
const {Log} = require("zoinx/log");
const {Filter} = require("zoinx/util");

module.exports = TestHarness(class RouteRolesService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

    async batchInsert(rawObjects =[], session) {
        let     rtn;
        try {
            if (!_.isEmpty(rawObjects) && _.isArray(rawObjects) && rawObjects.length > 0) {
                rtn = await this.insertMany(rawObjects);
            }
        }
        catch (e) {
            Log.error(e);
            rtn = e.message;
        }

        return rtn;
    }

    async fillRouteCacheFromStore() {
        let rtn = '',
            filterArry = [
                {field: 'enabled', term: true}
            ],
            filters = new Filter(filterArry);

        try {
            const results = await this.find({filters: filters});

            if (results.length > 0) {
                await global.RouteCache.flushAll();
                await global.RouteCache.flushStats();
                let result;
                for (let i=0; i<results.length; i++) {
                    result = results[i];
                    await global.RouteCache.set(`${result.get('route_method')}=>${result.get('route_path')}`, result.get('role_names'), 0);
                }
            }

            rtn = `Refreshed ${results.length} route roles.`;
        }
        catch (e) {
            console.log(e.message);
        }

        return rtn
    }

    async setRouteRoles(routes=[], role='') {

        try {
            let filterArry = [
                    {field: 'route_path', term: routes, oper: 'in'}
                ],
                filters = new Filter(filterArry),
                filterObject = {filters: []},
                roles;

            if (_.endsWith(routes[0], '*')) {
                const escaped = routes[0].replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
                const regexString = `^${escaped.replace(/\*/g, "")}`;
                filterObject = {
                    filters: {
                        route_path: { $regex: new RegExp(regexString) }
                    }
                }
            }
            else if (routes[0].toLowerCase() !== 'all') {
                filterObject = { filters: filters.getFilters() };
            }

            let existingRouteRoles = await this.find(filterObject);

            for (let i=0; i<existingRouteRoles.length; i++) {
                roles = existingRouteRoles[i].get('role_names');
                if (!roles.includes(role)) {
                    roles.push(role);
                    existingRouteRoles[i].set('role_names', roles);

                    let rtn = await this.save(existingRouteRoles[i], {user: 'SYSTEM'}, existingRouteRoles[i].get('id'));
                    Log.info(`Updated roles for: ${existingRouteRoles[i].get('route_path')}`);
                }
                else {
                    Log.warn(`Role ${role} already exists for: ${existingRouteRoles[i].get('route_path')}`);
                }
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

});
