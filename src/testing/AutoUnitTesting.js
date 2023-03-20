const _ = require('lodash');
const path = require('path');
const { Log } = require('../log');
const UtilMethods = require('./UtilMethods');
const ParseFunctionConfig = require('./ParseFunctionConfig');
const { ShellCmd } = require('../shellCmds');
const TypeDefinitions = require('./TypeDefinitions');

module.exports = class AutoUnitTesting {

    #runType
    #workingFileList
    #cliInterface
    testCount = 10

    constructor(runType) {
        if (_.isEmpty(runType)) this.#runType = 'happy';
        else {
            if (['happy', 'fail', 'chaos'].includes(runType)) this.#runType = runType;
            else this.#runType = 'happy';
        }
    }

    async run(fromPath, cliInterface) {
        let me = this;

        try {
            if (cliInterface) this.#cliInterface = cliInterface;

            await me.findTestConfiguredFiles(fromPath);

            Log.info(me.#workingFileList);
            if (me.#workingFileList.length > 0) {
                if (me.#runType === 'happy') return me.runHappyPaths();
            }
            Log.info('No files found to process for tests.');
        }
        catch (ex) {
            Log.error(ex);
        }

        if (me.#cliInterface)
            me.#cliInterface.prompt();
    }

    async findTestConfiguredFiles(fromPath='.') {
        let findCmd = `find ${fromPath} -path './node_modules' -prune -o -path './core' -prune -o -path './bin' -prune -o  -type f -name '*.js' -exec grep -l 'testConfig =' {} \\;`,
            cmd = new ShellCmd(findCmd);

        try {
            await cmd.run(true);
            this.#workingFileList = await cmd.getCmdResults();
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    async runHappyPaths() {
        let testCount = 10, clazz, clazzPath, testConf;

        try {
            for (let i=0; i<this.#workingFileList.length; i++) {
                //if (this.#workingFileList[i].includes('app.js')) continue;

                // let clazzPath = path.join(__dirname, `../../${this.#workingFileList[i]}`),
                let clazzPath = this.#workingFileList[i],
                    clazz = require(clazzPath),
                    testConf = clazz.testConfig,
                    testKeys = Object.keys(testConf);

                Log.info(clazzPath);

                for (let j = 0; j < testKeys.length; j++) {
                    if (_.isFunction(clazz[testKeys[j]])) {
                        await this.handleStaticFunction(clazz, clazzPath, testConf, testKeys[j]);
                    }
                    else {
                        //await this.handleClassFunction(clazz, clazzPath, testConf, testKeys[j]);
                    }
                }
            }
        }
        catch (ex) {
            Log.error(ex);
        }

    }

    async handleStaticFunction(clazz, clazzPath, testConf, testKey) {
        let inputConf = [],
            outputConf = [];

        try {
            // if (clazz.name === 'UserAccountStatics')
                //console.log(clazz.name);

            testConf[testKey].input.forEach( (conf) => {
                let parsedConf = ParseFunctionConfig.parse(conf),
                    acceptedLength = parsedConf.acceptedValues.length;

                parsedConf.testVals = [];

                if (acceptedLength > 0) {
                    parsedConf.testVals = parsedConf.acceptedValues;
                }
                for (let j = (0 + acceptedLength); j < this.testCount; j++) {
                    parsedConf.testVals.push(TypeDefinitions.getRandomPrimitive(parsedConf.type));
                }
                inputConf.push(parsedConf);
            });

            if (_.isEmpty(testConf[testKey].output))
                testConf[testKey].output = [];

            testConf[testKey].output.forEach((conf) => {
                outputConf.push(ParseFunctionConfig.parse(conf));
            });

            for (let k = 0; k < this.testCount; k++) {
                let inputs = [];

                inputConf.forEach((conf) => {
                    inputs.push(conf.testVals[k]);
                });
                // Log.info(`======================= ${inputConf[0].testVals[k]} + ${inputConf[1].testVals[k]} = ${clazz[testKey](...inputs)}`);
                Log.info(`======================= testResults: ${clazz[testKey](...inputs)}`);
            }

        }
        catch(ex) {
            Log.error(ex);
        }
    }

    async handleClassFunction(clazz, clazzPath, testConf, testKey) {
        let inputConf = [],
            outputConf = [];

        try {
            Log.info(`----------------------- needs class instance to be called. ${testKey}`);

            let mockPath = _.dropRight(clazzPath.split('/')).join('/'),
                typePath = Object.getPrototypeOf(clazz)?.name?.toLowerCase(),
                classConfig, classConfigKeys = [],
                mockConfigStr, mockConfig, mockKeys = [];

            if (!_.isEmpty(typePath)) {
                mockPath = `${mockPath}/testing/${clazz.name}.mock.json`;
                mockConfigStr = await UtilMethods.readFileAsync(mockPath);

                try {
                    mockConfig = JSON.parse(mockConfigStr);

                    if (!_.isUndefined(mockConfig[testKey]) && !_.isNull(mockConfig[testKey])) {
                        mockKeys = Object.keys(mockConfig[testKey]);

                        if (mockKeys.length > 0) {
                            for (const key of mockKeys) {
                                Log.info(mockPath);
                                Log.info(mockConfig[testKey][key]);
                            }
                        }
                    }

                    classConfig = clazz.testConfig;

                    if (!_.isUndefined(classConfig) && !_.isNull(classConfig)) {
                        classConfigKeys = Object.keys(classConfig);

                        if (classConfigKeys.length > 0) {
                            for (const key of classConfigKeys) {
                                Log.info(classConfig[key]);
                            }
                        }
                    }
                }
                catch (ex) {
                    Log.error(ex);
                }
            }

        }
        catch(ex) {
            Log.error(ex);
        }
    }

}
