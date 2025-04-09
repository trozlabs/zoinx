const BaseCli = require('./BaseCli');
const _ = require('lodash');
const Log = require('../log/Log');
const StaticUtil = require('../util/StaticUtil');
const ParseFunctionConfig = require('../testing/ParseFunctionConfig');
const AutoUnitTesting = require("../testing/AutoUnitTesting");
const ScenarioTesting = require("../testing/ScenarioTesting");

module.exports = class TestRunner extends BaseCli {

    constructor(process) {
        super('TestRunner', process);
        this.addInputs(
            {
                'verify-test-config': {fn: 'verifyTestConfig', desc: 'Verify Object Config'},
                'vtc': {fn: 'verifyTestConfig', desc: 'Verify Object Config (alias)'},
                'test-static': {fn: 'testStatic', desc: 'Find and auto test static methods with a test config'},
                'rssf': {fn: 'runSpecifiedScenarioFile', desc: 'Run Specified Scenario File: Runs a specified set of scenarios found in scenarios/ of entities and features.'}
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

    async runSpecifiedScenarioFile(inputStr, _interface, forceExit=false) {
        let inputSplit = inputStr.trim().split('--');

        if (inputSplit.length > 1) {
            if (!global.testingConfig.isTestingEnabled) {
                Log.warn('Testing config is set to false in AppConfig.');
                process.exit(0);
            }
            else {
                let scenarioTesting = new ScenarioTesting(inputSplit[1], this);
                await scenarioTesting.exec(true);
            }
        }
        else {
            this.logger.error(`No file found at ${inputSplit[1]}`);
        }
    }

}
