const BaseCli = require('./BaseCli');
const _ = require('lodash');
const Log = require('../log/Log');
const StaticUtil = require('../util/StaticUtil');
const ParseFunctionConfig = require('../testing/ParseFunctionConfig');
const os = require("os");
const v8 = require("v8");
const ShellCmd = require("../shellCmds/CmdExec");
const CreateEntityOrFeature = require("../generator/CreateEntityOrFeature");
const {Playground} = require("../../../../vast/FogLight/lib/playground");

/*
'testparse',
'testfetch',
'testkafka',
'testsecrets',

 */

module.exports = class ZoinxCli extends BaseCli {

    constructor(process) {
        super('ZoinxCli', process);
        Log.info('ZoinxCli is running.');
        this.addInputs(
            {
                'stats': {fn: 'sysStats', desc: 'Get Statistic on the underlying OS and resource utilities'},
                'mongo ping': {fn: 'mongoPing', desc:'Pings Mongo DB'},
                'mongo stats': {fn: 'mongoStats', desc:'Returns Mongo DB statistics'},
                'mongo currentops': {fn: 'mongoCurrentops', desc: 'Returns a list of currnet Mongo DB operations'},
                'shell': {fn: 'execShellCmd', desc: 'Execute shell commands i.e. shell --ls -ltr'},
                'create': {fn: 'createZoinxElements', desc: 'create --entity|feature\': Creates a new Entity file structure for a simple CRUD route. \n' +
                        '            \'Example usage: create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "dork.newEntity"} Supported templates: index, route, service, domain, statics, controller'},
                "playground": {fn: 'playground', desc: 'JS programming examples'}
            }
        )
    }

    async sysStats() {
        let stats = {
            'Load Avgerage': os.loadavg().join(' '),
            'CPU Count': os.cpus().length,
            'Free Memory': os.freemem(),
            'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
            'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory,
            'Allocated Heap Used (%)': Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
            'Available Heap Allocated (%)': Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
            'Uptime': os.uptime() + ' seconds'
        };

        this.horizontalLine();
        this.centered('System Stats');
        this.horizontalLine();
        this.verticalSpace(2);

        for (let key in stats) {
            if (stats.hasOwnProperty(key)) {
                let value = stats[key],
                    line = `\x1b[33m${key}\x1b[0m`,
                    padding = 60 - line.length;

                for (let i = 0; i < padding; i++) {
                    line += ' ';
                }
                line += value;
                Log.info(line);
                this.verticalSpace();
            }
        }

        this.verticalSpace(1);
        this.horizontalLine();
    }

    async mongoPing(inputStr, _interface) {
        try {
            const dbConn =  await this.getMongoConnectionDB();
            await dbConn.db.admin().command({ping: 1},
                (err, result) => {
                    Log.info('Result: ', result);
                    dbConn.conn.close();
                    _interface.prompt();
                })
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    async mongoStats(inputStr, _interface) {
        try {
            const dbConn = await this.getMongoConnectionDB();
            await dbConn.db.admin().serverStatus(function(err, result) {
                Log.info('Result: ', result);
                dbConn.conn.close();
                _interface.prompt();
            });
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    async mongoCurrentops(inputStr, _interface) {
        try {
            const dbConn =  await this.getMongoConnectionDB();
            await dbConn.db.admin().command({currentOp: 1},
                (err, result) => {
                    Log.info('Result: ', result);
                    dbConn.conn.close();
                    _interface.prompt();
                })
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    async execShellCmd(inputStr, _interface) {
        let cmdSplit = inputStr.trim().split('--'),
            cmdstr = (typeof(inputStr) === 'string' && inputStr.trim().length > 0) ? cmdSplit[1] : '',
            cmd = new ShellCmd(cmdstr),
            returnArray = false;

        try {
            if (!_.isEmpty(cmdSplit[2]))
                returnArray = Boolean(cmdSplit[2])

            await cmd.run(returnArray);
            await StaticUtil.sleep(500);
            if (returnArray) Log.info(cmd.getCmdResults());
            _interface.prompt();
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    async createZoinxElements(inputStr, _interface) {
        let inputParts = inputStr.trim().split('--');

        try {
            if (inputParts[1]) {
                let details = inputParts[1].trim().split('='),
                    createWhat = details[0].trim(),
                    createObj = {};

                if (details[1]) {
                    try {
                        createObj = JSON.parse(details[1]);
                    } catch (ex) {
                        Log.error(ex.message);
                    }
                }

                if (['entity', 'feature'].includes(createWhat.toLowerCase())) {
                    let codeGen = new CreateEntityOrFeature(createObj, createWhat);
                    //debugger;
                    await codeGen.generate(async function() {
                        await StaticUtil.sleep(5);
                        _interface.prompt();
                    });

                }
                else Log.error('Can only create Entities or Features.');
            }
            else {
                Log.info('No switches supplied to use create.');
            }
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    async playground(inputStr, _interface) {
        let inputParts = inputStr.trim().split('--'),
            rxBananas = /\.?(\(.+\))/gi,
            rxBrackets = /\.?(\[.+\])/gi;

        if (inputParts.length > 1 && !_.isEmpty(inputParts[1])) {
            try {
                let funcName = '',
                    withBananas = rxBananas.exec(inputParts[1]),
                    withBrackets = rxBrackets.exec(inputParts[1]),
                    inputParams = [];

                if (!_.isNull(withBananas)) {
                    if (!inputParts[1].includes('[') || inputParts[1].includes('([')) {
                        withBananas[0] = withBananas[0].replace('(', '[');
                        withBananas[0] = withBananas[0].replace(')', ']');
                    }
                    withBrackets = withBananas;
                }

                if (_.isEmpty(withBrackets)) {
                    let whichChar = '(',
                        charIdx = inputParts[1].indexOf(whichChar);

                    funcName = inputParts[1];

                    if (charIdx < 0) {
                        whichChar = '[';
                        charIdx = inputParts[1].indexOf(whichChar);
                    }

                    if (charIdx >= 0) funcName = inputParts[1].substr(0, inputParts[1].indexOf(whichChar));
                } else {
                    inputParams = JSON.parse(withBrackets[0]);
                    funcName = inputParts[1].substr(0, withBrackets.index);
                }

                Log.info(Playground[funcName](...inputParams));
            }
            catch (ex) {
                if (ex.name.toLowerCase() === 'syntaxerror') {
                    Log.warn('JSON syntax error. Might need double quotes instead of single quotes.');
                }
                else {
                    Log.warn(`No matching function found for "${inputParts[1]}"`);
                    // Log.error(ex.message);
                }
            }

            return;
        }
        Log.info('No matching playground function');
    }

}
