#!/usr/bin/env node

const BaseCli = require('./BaseCli');
const _ = require('lodash');
const Log = require('../log/Log');
const StaticUtil = require('../util/StaticUtil');
const ParseFunctionConfig = require('../testing/ParseFunctionConfig');
const AutoUnitTesting = require("../testing/AutoUnitTesting");

module.exports = class TestRunner extends BaseCli {

    constructor(process) {
        super('TestRunner', process);
        Log.info('TestRunner is running.');
        this.addInputs(
            {
                'verify-test-config':       {fn: 'verifyTestConfig', desc:'Verify Object Config'},
                'vtc':                      {fn: 'verifyTestConfig', desc:'Verify Object Config (alias)'},
                'test-static':              {fn: 'testStatic', desc:'Find and auto test static methods with a test config'}
            }
        )
    }

    //verify-test-config --authObj=><object required=:[{"data[0].response.csrf_token.csrf_token": "string"}]>
    //verify-test-config --credentials=><object<someKindOfObjectType> acceptedValues=:[{"name":"peter"}] required=:[{"email":"string=[some@email.com|Asdf|asdaf]","password":"string=/^[a-zA-Z]{7}$/gi"}, {"snap":"number"}]>
    //verify-test-config --userObj=><object<SpecialObject> required=:[{"token": "string"}] acceptedValues=:[{"name":"peter"}] rejectedValues=:[{"name": "boink"}]>
    //verify-test-config --userObj=><object<SpecialObject> required=:[{"token": "string"}] acceptedValues=:[{"name":"peter"}] rejectedValues=:[{"name": "boink"}] expectedOut=:["${numb1 + numb2}"]>
    //verify-test-config --req=><object required=:[{"client.server": "object"}]>
    //verify-test-config --res=><object required=:[{"socket.server": "object"}]>
    async verifyTestConfig(inputStr, _interface) {
        let inputSplit = inputStr.trim().split('--'),
            start = Date.now(), end;

        await this.horizontalLine();
        if (inputSplit.length > 1) {
            console.log(ParseFunctionConfig.parse(inputSplit[1]));
        }
        else {
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
