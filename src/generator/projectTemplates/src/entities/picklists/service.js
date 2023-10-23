const { Service } = require('zoinx/core');
const { Log } = require('zoinx/log');
const { TelemetryEventModel } = require('zoinx/telemetry');
const _ = require('lodash');
const path = require('path');
const {Filter} = require("zoinx/util");

module.exports = class PicklistsService extends Service {
    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

    getPLList() {
        this.telemetryEvents.push(
            new TelemetryEventModel({
                name: `${this.constructor.name}.getPLList`,
                attributes: { distinctKey: 'list_key' }
            })
        );
        return this.distinctList('list_key');
    }

    async getFilteredListByValue(listKey, filter4value) {
        this.telemetryEvents.push(
            new TelemetryEventModel({
                name: `${this.constructor.name}.getFilteredListByValue`,
                attributes: { listKey: listKey, filter4value: filter4value }
            })
        );
        let result = [],
            filterArry, filters;

        if (_.isEmpty(listKey) || !_.isString(listKey) || _.isEmpty(filter4value) || !_.isString(filter4value)) {
            Log.warn('Must supply a string for listKey and filter4value to get a result');
            return result;
        }

        filterArry = [
            { field: 'list_key', term: listKey },
            { field: 'val', term: filter4value }
        ];
        return await this.find({filters: new Filter(filterArry)});
    }

};
