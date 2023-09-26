const Service = require('../../core/Service');
const TestHarness = require('../../testing/TestHarness');
const Log = require('../../log/Log');
const _ = require('lodash');
const path = require("path");

module.exports = TestHarness(class TestingResultsRealtimeService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

    async getCache() {
        let cacheKeys = global.TestCache.keys(),
            cacheEntries = [];

        try {
            if (!_.isEmpty(cacheKeys) && _.isArray(cacheKeys)) {
                for (let i=0; i<cacheKeys.length; i++) {
                    cacheEntries.push(global.TestCache.get(cacheKeys[i]));
                }
            }
        }
        catch (e) {
            Log.error(e);
        }
        // let ahShit = cacheEntries[0].testedParams;
        // ahShit.constructor.resolve();
        // cacheEntries[0].json;
        // cacheEntries[0].testedParams = Promise.resolve(cacheEntries[0].testedParams);
        return cacheEntries;
    }

});
