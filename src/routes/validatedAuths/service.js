const { Service } = require('../../core');
const { TestHarness } = require('../../testing');
const path = require("path");

module.exports = TestHarness(class ValidatedAuthsService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

});
