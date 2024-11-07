const _ = require('lodash');
const path = require('path');
const bcrypt = require("bcryptjs");
const fs = require("fs");
const mkdirp = require('mkdirp');

const { Log } = require('../log');
const { StaticUtil } = require('../util');
const AppCache = require("../core/AppCache");
const TypeDefinitions = require('./TypeDefinitions');

module.exports = class ScenarioTesting {

    #startTime
    #endTime
    #pathsInput
    #scenarioPaths = []
    #workingFileList = []
    #scenarioTestComplete = 0
    #writeTestData = false
    #cli

    constructor(pathsInput='', cli=undefined) {
        global.testingConfig.sendResult2Kafka = false;
        global.testingConfig.consoleOut = false;

        this.#pathsInput = pathsInput;
        this.#cli = cli;
        this.#buildScenarioPaths();
        this.#setupTestResultCache();

        global.eventBus.on('ScenarioTestComplete', this.#handleScenarioTestComplete.bind(this));
    }

    #buildScenarioPaths() {
        try {
            let paths = this.#pathsInput.split(','),
                exists = false,
                appDir = process.cwd(),
                fullPath;

            for (let i=0; i<paths.length; i++) {
                fullPath = `${appDir}${paths[i]}`

                exists = fs.existsSync(fullPath);
                if (exists) {
                    this.#scenarioPaths.push({
                        fullPath: fullPath,
                        isDir: fs.lstatSync(fullPath).isDirectory(),
                        scenarios: []
                    });
                }
            }
        }
        catch (e) {
            Log.error(e.message);
        }
    }

    async #getDataFromRef(configObject, fullPath) {
        try {
            const pathTest = /^\/$|(^(?=\/)|^\.|^\.\.|^\~|^\~(?=\/))(\/(?=[^/\0])[^/\0]+)*\/?$/g.exec(configObject.$ref);
            if (pathTest) {
                if (_.isEmpty(fullPath) || !_.isString(fullPath)) return [];
                let pathParts = pathTest[0].split('/');

                if (pathParts.length > 1) {
                    let dataPath = _.dropRight(fullPath.split('/')).join('/'),
                        data;
                    dataPath = `${dataPath}/${pathParts[1]}`;
                    data = await this.#readFileAsync(dataPath);

                    if (!_.isEmpty(data) && !_.isEmpty(pathParts[2]))
                        return JSON.parse(data)[pathParts[2]];
                    else if (!_.isEmpty(data))
                        return JSON.parse(data);
                    else
                        Log.warn('No data returned from referenced data file.');
                }
            }
        }
        catch (e) {
            Log.error(e.message);
        }
    }

    async #setupTestResultCache() {
        let salt;
        try {
            if (!global.testing) global.testing = {};
            if (!global.testing.testResultCache) {
                salt = await bcrypt.genSalt(10);
                global.testing.testResultCacheSalt = salt;

                global.testing.testResultCache = new AppCache(
                    {
                        stdTTL: 300,
                        checkperiod: 100,
                        maxKeys: 5000
                    }
                );
            }
        }
        catch (e) {
            Log.warn(e.message);
        }
        return salt;
    }

    get workingFileList() {
        return this.#workingFileList;
    }

    static get scenarioTestComplete() {
        return this.#scenarioTestComplete;
    }

    static incrementCompleteCount() {

    }

    async #handleScenarioTestComplete(cacheKey) {
        try {
            this.#scenarioTestComplete++;
            if (this.#workingFileList.length >= this.#scenarioTestComplete) {
                this.#endTime = Date.now();
                await this.generateReport();
                if (!_.isUndefined(this.#cli)) {
                    Log.log(`\n\x1b[32m Scenario tests ran in ${this.#endTime - this.#startTime} millis`);
                    if (this.#cli)
                        this.#cli.horizontalLine();
                    this.#cli.exit();
                }
            }
        }
        catch (e) {
            Log.error(e.message);
        }
    }

    async #buildWorkingFileList() {
        if (this.#scenarioPaths.length < 1) {
            Log.warn('No paths provided to find Scenarios.');
            return;
        }

        try {
            let paths = this.#scenarioPaths,
                trailingSlash = '/',
                files;

            for (let i=0; i<paths.length; i++) {
                if (paths[i].fullPath.endsWith('/')) trailingSlash = '';
                if (paths[i].isDir) {
                    files = await StaticUtil.readdirAsync(paths[i].fullPath);

                    for (let j=0; j<files.length; j++) {
                        if (files[j].toLowerCase().endsWith('.json')) {
                            this.#workingFileList.push({
                                fullPath: `${paths[i].fullPath}${trailingSlash}${files[j]}`,
                                isDir: false,
                                scenarios: []
                            });
                        }
                    }
                }
                else {
                    this.#workingFileList.push(paths[i]);
                }
            }
        }
        catch (e) {
            Log.error(e.message);
        }
    }

    async exec(writeTestData=false) {
        if (_.isBoolean(writeTestData))
            this.#writeTestData = writeTestData;

        if (this.#cli) {
            this.#cli.horizontalLine(true);
        }

        this.#startTime = Date.now();
        await this.#buildWorkingFileList();
        if (this.#workingFileList.length < 1) {
            Log.warn('No working files to operate from.')
            return;
        }

        try {
            let wkList = this.#workingFileList,
                contents;
            for (let i=0; i<wkList.length; i++) {
                contents = await this.#readFileAsync(wkList[i].fullPath);
                await this.#execScenario(contents, wkList[i]);
            }
        }
        catch (e) {
            Log.error(e.message);
        }
    }

    async #readFileAsync(path) {
        let fileContents;

        try {
            fileContents = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'});
        }
        catch (e) {
            Log.error(e);
        }

        return fileContents;
    }

    async #execScenario(scenarioContents, workingFile) {
        try {
            let scenarioJson = JSON.parse(scenarioContents),
                contentsPath = workingFile.fullPath,
                methodKeys = Object.keys(scenarioJson),
                pathDelimiter = (process.platform === 'win32') ? '\\' : '\/',
                pathParts = contentsPath.split(pathDelimiter),
                classFileExtention = 'js',
                classFilePath = '',
                tmpReq, tmpClass, normalFuncs, staticFuncs;

            if (methodKeys.length > 0) {
                pathParts.splice((pathParts.length-2), 1);
                classFilePath = pathParts.join(pathDelimiter);
                classFilePath = classFilePath.replace(/[A-Za-z]{2,4}$/, classFileExtention);

                tmpReq = require(classFilePath);
                normalFuncs = Object.getOwnPropertyNames(tmpReq.prototype).filter(name => typeof tmpReq.prototype[name] === 'function');
                // staticFuncs = Object.getOwnPropertyNames(tmpReq.prototype.constructor).filter(name => typeof tmpReq.prototype.constructor[name] === 'function');

                for (let i=0; i<methodKeys.length; i++) {
                    if (i < 1) {
                        if (normalFuncs.includes(methodKeys[i]))
                            tmpClass = new tmpReq();
                        else
                            tmpClass = tmpReq;
                    }

                    let scenarioKeys = Object.keys(scenarioJson[methodKeys[i]]);

                    for (let j=0; j<scenarioKeys.length; j++) {
                        let scenarioRef = scenarioJson[methodKeys[i]][scenarioKeys[j]];

                        for (let j=0; j<scenarioRef.inputValues.length; j++) {
                            if (!_.isString(scenarioRef.inputValues[j]) && _.isObject(scenarioRef.inputValues[j])) {
                                scenarioRef.inputValues[j] = await this.#getDataFromRef(scenarioRef.inputValues[j], workingFile.fullPath);
                            }
                        }

                        workingFile.scenarios.push({
                            scenarioKey: scenarioKeys[j],
                            inputValues: scenarioRef.inputValues,
                            shouldFail:  (_.isUndefined(scenarioRef.shouldFail) || _.isNull(scenarioRef.shouldFail) || !_.isBoolean(scenarioRef.shouldFail)) ? false : scenarioRef.shouldFail
                        });

                        //execute the actual function with args
                        if (TypeDefinitions.isFunctionAsync(tmpClass[methodKeys[i]]))
                            await tmpClass[methodKeys[i]](...scenarioJson[methodKeys[i]][scenarioKeys[j]].inputValues);
                        else
                            tmpClass[methodKeys[i]](...scenarioJson[methodKeys[i]][scenarioKeys[j]].inputValues);
                    }
                }
            }
        }
        catch (e) {
            Log.warn(`Failed to parse scenario contents for: ${contentsPath}`);
            Log.warn(e.message);
        }
    }

    async generateReport() {
        let report = '',
            totalTestCount = 0,
            totalTestTime = 0,
            passedCount = 0,
            failedCount = 0,
            passFailColor = '\x1b[33m';

        try {
            let wkList = this.#workingFileList;

            for (let i=0; i<wkList.length; i++) {
                let scenarios = wkList[i].scenarios,
                    hashedKey, testResult;

                for (let j=0; j<scenarios.length; j++) {
                    hashedKey = await bcrypt.hash(JSON.stringify(scenarios[j].inputValues), global.testing.testResultCacheSalt);
                    testResult = global.testing.testResultCache.get(hashedKey);

                    if (!_.isUndefined(testResult)) {
                        testResult.notes = scenarios[j].scenarioKey;
                        totalTestTime += testResult.runningTimeMillis;

                        if (testResult.passed && testResult.executionPassed) {
                            (scenarios[j].shouldFail) ? failedCount++ : passedCount++;
                            passFailColor = (scenarios[j].shouldFail) ? '\x1b[31m' : '\x1b[32m';
                        } else {
                            (scenarios[j].shouldFail) ? passedCount++ : failedCount++;
                            passFailColor = (scenarios[j].shouldFail) ? '\x1b[32m' : '\x1b[31m';
                        }

                        Log.log(`\n\x1b[36m ${testResult.notes} -> ran in: ${testResult.runningTimeMillis} milli(s)`);
                        Log.log(`\x1b[33m \t-> ${testResult.className}.${testResult.methodName}(${JSON.stringify(scenarios[j].inputValues)})`);
                        Log.log(`${passFailColor} \t-> Method Passed: ${testResult.passed} -> Should Fail: ${scenarios[j].shouldFail}`);
                        totalTestCount++;
                    }
                    else {
                        Log.warn(`Test cache entry was not found for ${hashedKey}`);
                    }
                }
            }
        }
        catch (e) {
            Log.error(e.message);
        }

        Log.log('\n\n\x1b[32m====================================================================================');
        Log.log(`\x1b[36m Total tests run: ${totalTestCount} -> ran in: ${totalTestTime} milli(s)`);
        Log.log(`\x1b[32m Tests Passed: ${passedCount}`);
        Log.log(`\x1b[31m Tests Failed: ${failedCount}\x1b[37m `);



        if (this.#writeTestData && totalTestCount > 0)
            this.#createTestDataFile();

        return report;
    }

    async #createTestDataFile() {
        try {
            let appDir = process.cwd(),
                destDir = `${appDir}/testingResults/`,
                fullPath = `${destDir}${StaticUtil.appendTimestamp('ScenarioTesting_')}.json`;
            const cacheData = global.testing.testResultCache.mget(global.testing.testResultCache.keys());
            const jsonData = JSON.stringify(cacheData, null, 2);

            mkdirp.sync(destDir);
            fs.writeFileSync(fullPath, jsonData);

            Log.log(`\n Testing data has been written to \x1b[33m${fullPath}\x1b[37m`);
        }
        catch (e) {
            Log.error(e.message);
        }
    }

}
