const { Service } = require('../../core');
const { TestHarness } = require('../../testing');
const path = require("path");
const _ = require('lodash');
const bcrypt = require("bcryptjs");
const Log = require("../../log/Log");

module.exports = TestHarness(class LocalAcctsService extends Service {

    constructor() {
        const domainPath = path.join(__dirname, './domain');
        super(domainPath);
    }

    async createAcct(username, password) {

        if (_.isEmpty(username) || _.isEmpty(password)) return;

        try {
            let createResult;
            const salt = await bcrypt.genSalt(10);
            const encryptedPw = await bcrypt.hash(password, salt);

            createResult = await this.save(undefined, {username: username, password: encryptedPw}, {user: 'SYSTEM'});
            Log.info(createResult);
        }
        catch (e) {
            Log.error(e);
        }
    }

});
