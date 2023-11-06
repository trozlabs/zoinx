const Service = require('../../core/Service');
const TestHarness = require('../../testing/TestHarness');
const Log = require('../../log/Log');
const _ = require('lodash');
const path = require("path");

module.exports = TestHarness(class TestingSendFailsService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

});
