const BaseCli = require('./BaseCli');
const _ = require('lodash');
const Log = require('../log/Log');
const StaticUtil = require('../util/StaticUtil');
const ParseFunctionConfig = require('../testing/ParseFunctionConfig');
const AutoUnitTesting = require("../testing/AutoUnitTesting");

module.exports = class TestRunner extends BaseCli {

    constructor(process) {
        super('TestRunner', process);
        // Log.info('TestRunner is running.');
        this.addInputs(
            {
                'verify-test-config': {fn: 'verifyTestConfig', desc: 'Verify Object Config'},
                'vtc': {fn: 'verifyTestConfig', desc: 'Verify Object Config (alias)'},
                'test-static': {fn: 'testStatic', desc: 'Find and auto test static methods with a test config'}
            }
        )

        if (this.otherArgs.length > 0)
            this.execOtherArgs();
    }
    
    async verifyTestConfig(inputStr, _interface) {
        let inputSplit = inputStr.trim().split('--'),
            start = Date.now(), end;

        await this.horizontalLine();
        if (inputSplit.length > 1) {
            if (inputSplit.length > 1) {
                let output = ParseFunctionConfig.parse(inputSplit[1]);
                console.log(JSON.stringify(ParseFunctionConfig.createAccurateVtcOutput(output), null, 4));
            }
        } else {
            console.error('No test config provided to parse');
        }
        end = Date.now();
        console.log(`Parsed in ${end - start} millis`);
        await this.horizontalLine();
    }

    async testStatic(inputStr, _interface) {
        let aut = new AutoUnitTesting(),
            start = Date.now(), end;

        await aut.run(`${process.cwd()}/src`, _interface);
        end = Date.now();
        await StaticUtil.sleep(25);

        Log.info(`Total time executing tests (millis): ${end - start}`);
        //Log.info(`Tests created: ${JSON.stringify(global.testConfigList)}`);

        _interface.prompt();
    }

}
