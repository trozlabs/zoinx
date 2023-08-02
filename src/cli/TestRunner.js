#!/usr/bin/env node

// native
const readline = require('readline');
const events = require('events');
const os = require('os');
const v8 = require('v8');
const Performance = require('perf_hooks').performance;
// external
const _ = require('lodash');
const { Log } = require('../log');
const { StaticUtil } = require('../util');
const { ParseFunctionConfig } = require('../testing/');

module.exports = class TestRunner {

    #uniqueInputs = {
        'man':                      {fn: 'horizontalLine', desc:'Show help content'},
        'help':                     {fn: 'displayHelp', desc:'Show help content'},
        'exit':                     {fn: 'exit', desc:'Kill TestRunner'},
        'verify-test-config':       {fn: 'verifyTestConfig', desc:'Verify Object Config'},
        'vtc':                      {fn: 'verifyTestConfig', desc:'Verify Object Config (alias)'}
    }

    #process
    #events

    constructor(process) {
        Log.info('The Tester is running.');
        this.#process = process;
        this.#events = new events();

        const userArgs = process.argv.slice(2);
        if (_.isEmpty(userArgs)) Log.info('No arguments passed to TestRunner');
        else Log.info(userArgs);

        let useDB = false;
        let _interface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '\n\r[TestRunner] -> '
        });

        switch (userArgs[0]) {
            case 'usedb':
                useDB = true;
                break;
        }

        _interface.on('line', async (str, clazz=this) => {
            if (str === '\n') _interface.write('\n\n');
            await clazz.#processInput(str, _interface);
            _interface.prompt();
        });

        _interface.on('close', function () {
            process.exit(0);
        });

        _interface.prompt();

        return useDB;
    }

    async #processInput(inputStr, _interface) {
        if (!_.isEmpty(inputStr)) {
            inputStr = typeof inputStr === 'string' && inputStr.trim().length > 0 ? inputStr.trim() : false;

            let eventParts = this.#getEventPart(inputStr),
                matchFound = !_.isEmpty(this.#uniqueInputs[eventParts.eventName]);

            if (!matchFound) {
                Log.warn(`No matching action for input: ${inputStr}`);
            }
            else {
                const funcResult = await this[this.#uniqueInputs[eventParts.eventName].fn](inputStr, _interface);
                //console.log(funcResult);
            }
        }
    }

    #getEventPart(inputStr) {
        let inputParts = inputStr.trim().toLowerCase().split('--'),
            eventName = inputParts[0]?.toLowerCase().trim(),
            eventSwitches = (inputParts.length > 1) ? inputParts[1] : undefined;

        return {
            eventName: eventName,
            eventSwitches: eventSwitches
        }
    }

    async exit(inputStr, _interface) {
        process.exit(0);
    }

    async displayHelp(inputStr, _interface) {
        await this.horizontalLine();
        console.log(inputStr);
        await this.verticalSpace(1);
        await this.horizontalLine();
    }

    async horizontalLine() {
        let screenWidth = process.stdout.columns,
            line = '';

        for (let i = 0; i < screenWidth; i++) {
            line += '-';
        }
        console.log(line);
    }

    async verticalSpace(numberOfLines) {
        let lines = typeof numberOfLines === 'number' && numberOfLines > 0 ? numberOfLines : 1;
        for (let i = 0; i < lines; i++) {
            console.log('');
        }
    }

    async centered(inputStr) {
        let screenWidth = process.stdout.columns,
            str = typeof inputStr === 'string' && inputStr.trim().length > 0 ? inputStr.trim() : '',
            strWidth = str.length,
            leftPadding = Math.floor((screenWidth - strWidth) / 2),
            line = '';

        for (let i = 0; i < leftPadding; i++) {
            line += ' ';
        }

        line += str;
        console.log(line);
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


}
