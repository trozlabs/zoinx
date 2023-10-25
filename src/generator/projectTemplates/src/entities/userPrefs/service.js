const { Service } = require('zoinx/core');
const { Log } = require('zoinx/log');
const { TestHarness } = require('zoinx/testing');
const path = require("path");
const { Model2Avro } = require('zoinx/util');
const {TelemetryEventModel} = require("zoinx/telemetry");

module.exports = TestHarness(class UserPrefsService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

});
