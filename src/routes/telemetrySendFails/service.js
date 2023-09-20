const Service = require('../../core/Service');
const TestHarness = require('../../testing/TestHarness');
const path = require("path");

module.exports = TestHarness(class TelemetrySendFailsService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

});
