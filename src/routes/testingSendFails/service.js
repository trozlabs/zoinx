const Service = require('../../core/Service');
const path = require("path");

module.exports = class TestingSendFailsService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }
}
