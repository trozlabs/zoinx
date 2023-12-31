const _ = require('lodash');
const path = require('path');
const bcrypt = require("bcryptjs");
const fs = require("fs");

const { Log } = require('../log');
const { StaticUtil } = require('../util');
const AppCache = require("../core/AppCache");

module.exports = class ScenarioTesting {

    #pathsInput
    #scenarioPaths = []
    #workingFileList = []

    constructor(pathsInput='') {
        global.testingConfig.sendResult2Kafka = false;
        global.testingConfig.consoleOut = false;
        this.#pathsInput = pathsInput;
        this.#buildScenarioPaths();
        this.#setupTestResultCache();
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
                        isDir: fs.lstatSync(fullPath).isDirectory()
                    });
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
                                isDir: false
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

    async exec() {
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
                await this.#execSencario(contents, wkList[i].fullPath);
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

    async #execSencario(scenarioContents, contentsPath) {
        try {
            let scenarioJson = JSON.parse(scenarioContents),
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
                staticFuncs = Object.getOwnPropertyNames(tmpReq.prototype.constructor).filter(name => typeof tmpReq.prototype.constructor[name] === 'function');


                for (let i=0; i<methodKeys.length; i++) {
                    if (i < 1) {
                        if (normalFuncs.includes(methodKeys[i]))
                            tmpClass = new tmpReq();
                        else
                            tmpClass = tmpReq;
                    }

                    let scenarioKeys = Object.keys(scenarioJson[methodKeys[i]]);

                    for (let j=0; j<scenarioKeys.length; j++) {
                        // Log.log(`Scenario for ${methodKeys[i]}: ${scenarioKeys[j]}`);
                        // Log.log(scenarioJson[methodKeys[i]][scenarioKeys[j]]);
                        tmpClass[methodKeys[i]](...scenarioJson[methodKeys[i]][scenarioKeys[j]].inputValues);
                    }
                }
            }

            // Log.log(classFilePath);
        }
        catch (e) {
            Log.warn(`Failed to parse scenario contents for: ${contentsPath}`);
            Log.warn(e.message);
        }
    }

}
