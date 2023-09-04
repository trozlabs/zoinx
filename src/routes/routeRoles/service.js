const { Service } = require('../../core');
const { TestHarness } = require('../../testing');
const path = require("path");
const _ = require("lodash");
const {Log} = require("zoinx/log");

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
});
