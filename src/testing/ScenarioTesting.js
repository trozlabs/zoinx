const _ = require('lodash');
const path = require('path');
const { Log } = require('../log');
const UtilMethods = require('./UtilMethods');
const ParseFunctionConfig = require('./ParseFunctionConfig');
const { ShellCmd } = require('../shellCmds');
const TypeDefinitions = require('./TypeDefinitions');

module.exports = class ScenarioTesting {

    #runType
    #workingFileList
    #cliInterface
    testCount = 10

    constructor(runType) {
        // if (_.isEmpty(runType)) this.#runType = 'happy';
        // else {
        //     if (['happy', 'fail', 'chaos'].includes(runType)) this.#runType = runType;
        //     else this.#runType = 'happy';
        // }
    }

}
