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
            const results = await this.find({}, filters.getFilters());

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

});
