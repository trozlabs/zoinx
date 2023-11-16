const _ = require('lodash');
const Log = require('../log/Log');
const TypeDefinitions = require('./TypeDefinitions');
const { TestParamDetails, TestExecutionDetails, TestRawObject } = require('./model');

const { readdirSync, statSync } = require('fs');
const fs = require('fs');
const { resolve, parse } = require('path');

module.exports = class UtilMethods {

    static getGlobalTestConfig(configKey) {
        return (global.testConfigList) ? global.testConfigList[configKey] : undefined;
    }

    static setGlobalTestConfig(configKey, confObj) {
        global.testConfigList[configKey] = confObj;
    }

    static isSimpleObject(value) {
        return value instanceof Object && value.constructor === Object;
    }

    static isTextNode(value) {
        return value ? value.nodeName === "#text" : false;
    }

    static isIterable(value) {
        const iterableRe = /\[object\s*(?:Array|Arguments|\w*Collection|\w*List|HTML\s+document\.all\s+class)\]/;

        // To be iterable, the object must have a numeric length property and must not be
        // a string or function.
        if (!value || typeof value.length !== 'number' || typeof value === 'string' ||
            _.isFunction(value)) {
            return false;
        }

        // Certain "standard" collections in IE (such as document.images) do not offer
        // the correct Javascript Object interface; specifically, they lack the
        // propertyIsEnumerable method.
        // And the item property while it does exist is not typeof "function"
        if (!value.propertyIsEnumerable) {
            return !!value.item;
        }

        // If it is a regular, interrogatable JS object (not an IE ActiveX object), then...
        // If it has its own property called "length", but not enumerable, it's iterable
        if (value.hasOwnProperty('length') && !value.propertyIsEnumerable('length')) {
            return true;
        }

        // Test against whitelist which includes known iterable collection types
        return iterableRe.test(toString.call(value));
    }

    static getToString(input) {
        try {
            return toString.call(input);
        }
        catch (e) {
            Log.error('getToString failed:\n', e);
        }
    }

    static logTestResult(clazz, method, customMessage) {
        try {
            let me = this,
                logStr = '',
                classId = (_.isString(clazz)) ? clazz : me.getClassName(clazz),
                methodName = (_.isString(method)) ? method : me.getMethodName(method),
                nowFormatted = new Date().toLocaleString();

            logStr = `[TEST] [${nowFormatted}] [${classId}.${methodName}]`;

            if (!_.isEmpty(customMessage)) logStr = `${logStr} -- ${customMessage}`;

            //if (this.getConsoleOut()) Log.warn(logStr);
            console.error(logStr)
        }
        catch (e) {
            Log.error('logTestResult failed:\n', e);
        }
    }

    static getClassName(clazz) {
        // clazz should never be undefined but something is causing it to be such.
        // async function might have an empty class but gets caught on a second run.
        if (_.isUndefined(clazz) || _.isNull(clazz)) return '';

        let classPath = '',
            //isAsync = (clazz.constructor) ? clazz.constructor.name.includes('AsyncFunction') : false,
            tmpCaller;

        // If the function is async, the next call will fail.
        // Have to catch it before the rest to ensure correct operation of the rest of the testing.
        try {
            tmpCaller = clazz.caller;
        }
        catch (e) {}

        try {
            if (!_.isFunction(clazz.fn)) {
                if (!_.isEmpty(clazz.uuid))
                    return clazz.uuid;

                else if (typeof (clazz) === 'string')
                    return clazz;

                else  {
                    if (!_.isEmpty(clazz.name)) return clazz.name;
                    else if (!_.isEmpty(clazz.constructor?.name)) return clazz.constructor.name;
                    return 'NotFound';
                }
            }
            else {
                return 'Class is null/undefined';
            }
        }
        catch (e) {
            Log.error('getClassName failed:\n', e);
        }
    }

    static getMethodName(fn, context) {
        let contextName = '';
        try {
            if (typeof context === 'function') {
                contextName = `${context.name}.`;
            }
            else if (context?.constructor?.name !== 'Object') {
                contextName = `${context.constructor.name}.`;
            }
            else if (typeof context === 'object' && _.isBoolean(context.isStatic) && context.isStatic) {
                contextName = Object.keys(context)[0];
            }
        }
        catch (e) {
            Log.error('getMethodName failed:\n', e);
        }

        return `${contextName}${fn.name}`;
    }

    static getCallerMethod(clazz, errorStack) {
        let returnObj = {
            className: 'unknown',
            file: ''
        },
            className = this.getClassName(clazz);

        try {
            if (!_.isEmpty(errorStack)) {
                if (errorStack.length > 2) {
                    let match = errorStack[2].match(/at ([a-zA-Z\-_$.]+) (.*)/);
                    if (match) {
                        returnObj.className = className;
                        returnObj.file = match[2];
                    }
                    else {
                        let pathParts = [];
                        for (let i=2; i<errorStack.length; i++) {
                            pathParts = errorStack[i].split('/');
                            if (pathParts[pathParts.length-1].includes('TestProxy')) continue;
                            else {
                                returnObj.className = className;
                                returnObj.file = `${pathParts[pathParts.length-3]}/${pathParts[pathParts.length-2]}/${pathParts[pathParts.length-1]}`;
                                break;
                            }
                        }
                    }
                }
            }
        }
        catch (ex) {
            Log.error(ex);
        }
        return returnObj;
    }

    static getMethodSignature(caller) {
        let signature = 'No signature';

        try {
            if (!_.isEmpty(caller.toString()) || _.isObject(caller)) {
                let tmpSigParts = caller.toString().split('\n');
                if (!_.isEmpty(tmpSigParts[0])) {
                    signature = /\w(.*?)\)/gi.exec(tmpSigParts)[0];

                    // With a testing and likely production build, async functions get an extra \n placed into the function signature.
                    // This results in a double comma inside the signature when the regex is executed as it auto joins the array
                    // back to a string. This replaces that double comma if present.
                    signature = signature.replace(',,', ',');
                }
            }
            else {
                signature = 'Caller is null/undefined';
            }

            return signature;
        }
        catch (e) {
            Log.error('getCallerSignature failed:\n', e);
            return 'getCallerSignature failed';
        }
    }

    static getDistinctNamesFromArray(objectArray) {
        if (!_.isArray(objectArray)) return [];
        return [...new Set(objectArray.map(x => x.name))];
    }

    static areRejectedInAccepted(paramConfig) {
        let accepted, rejected,
            rejectedFound = false;

        if (!_.isEmpty(paramConfig)) {
            accepted = paramConfig.acceptedValues;
            rejected = paramConfig.rejectedValues;

            if (accepted.length > 0 && rejected.length > 0) {
                for (let i = 0; i < rejected.length; i++) {
                    if (accepted.includes(rejected[i])) {
                        rejectedFound = true;
                        break;
                    }
                }
            }
        }

        return rejectedFound;
    }

    static getOutputTemplateStr (expectedOut, distinctParamNames, passedArguments) {
        let outputStrings = [],
            keyname, rxStr, rx, expectedOutCloned;

        if (!_.isEmpty(expectedOut) && _.isArray(expectedOut) &&
            !_.isEmpty(distinctParamNames) && _.isArray(distinctParamNames) &&
            !_.isEmpty(passedArguments) && _.isArray(passedArguments)) {

            expectedOutCloned = this.cloneObjectShallow(expectedOut);

            for (let j=0; j<expectedOutCloned.length; j++) {
                for (let i = 0; i < distinctParamNames.length; i++) {
                    keyname = distinctParamNames[i];
                    rxStr = `(\\$\\{*${keyname}*?\\})`;
                    rx = new RegExp(rxStr, 'g');
                    expectedOutCloned[j] = expectedOutCloned[j].replace(rx, passedArguments[i]);
                }
                outputStrings.push(expectedOutCloned[j]);
            }
        }

        return outputStrings;
    }

    static getConfiguredOutput(expectedOut, distinctParamNames, passedArguments) {
        const frontRE = /\$\{/g,
            backRE = /\}/g;

        let result = undefined,
            tmpObj = {},
            expectedOutClone;

        if (!_.isEmpty(expectedOut) && _.isArray(expectedOut) &&
            !_.isEmpty(distinctParamNames) && _.isArray(distinctParamNames) &&
            !_.isEmpty(passedArguments) && _.isArray(passedArguments)) {

            expectedOutClone = String(expectedOut[0]); // (' ' + expectedOut[0]).slice(1); //seems like a hacky way to clone a string.
            expectedOutClone = expectedOutClone.replace(frontRE, '');
            expectedOutClone = expectedOutClone.replace(backRE, '');

            if (distinctParamNames.length !== passedArguments.length) console.error('Possible param and value mismatch.');

            try {
                for (let i=0; i<distinctParamNames.length; i++) {
                    expectedOutClone = expectedOutClone.replace(new RegExp(distinctParamNames[i], 'g'), `tmpObj.${distinctParamNames[i]}`);
                    tmpObj[distinctParamNames[i]] = passedArguments[i];
                }
                tmpObj.tpl = expectedOutClone;
                let runIt = Function('tmpObj', `return ${tmpObj.tpl}`);
                result = (runIt(tmpObj));
            }
            catch (ex) {
                console.error(ex);
            }
        }
        else {
            console.error('All 3 parameters for getConfiguredOutput must be present and be an array.');
        }
        return result;
    }

    static getRealArgumentsCount(passedArguments) {
        let passedCount = 0;

        if (_.isArray(passedArguments)) {
            passedCount = passedArguments.length;
            try {
                for (let i = 0; i < passedArguments.length; i++) {
                    if (_.isUndefined(passedArguments[i]) || _.isNull(passedArguments[i])) passedCount--;
                }
            } catch (e) {
                passedCount = -1;
                Log.error('getRealParamCount failed:\n', e);
            }
        }
        return passedCount;
    }

    static doesPassedCountEqualExpectedCount(passedArguments, expectedParams) {
        let passedCount = passedArguments.length;

        try {
            for ( let i=0; i<passedArguments.length; i++) {
                if (_.isUndefined(passedArguments[i]) || !_.isNull(passedArguments[i]) && passedArguments[i]?.type === 'closureCaller')
                    passedCount--;
            }
        }
        catch (e) {
            passedCount = -1;
            Log.error('doesPassedCountEqualExpectedCount failed:\n', e);
        }
        return passedCount === expectedParams.length;
    }

    static getSignatureParamsCount(sig) {
        let paramCount = -1,
            params;

        if (!_.isEmpty(sig) && sig.includes('(') && sig.includes(')')) {
            params = sig.substring((sig.indexOf('(')+1), sig.indexOf(')'));
            paramCount = params.split(',').length;
        }

        return paramCount;
    }

    static getUntestedParams(passedArguments, expectedParams) {
        let me = this;

        if (expectedParams.length < passedArguments.length) {
            let untested = [];

            for (let i=expectedParams.length; i<passedArguments.length; i++) {
                let paramTest = {
                    name: `Untested ${i+1}`,
                    testObject: passedArguments[i]
                };

                paramTest.jsType = this.getUntestedType(passedArguments[i]);
                paramTest.isEmpty = _.isEmpty(passedArguments[i]);
                paramTest.isElement = _.isElement(passedArguments[i]);
                paramTest.isTextNode = this.isTextNode(passedArguments[i]);
                paramTest.isIterable = this.isIterable(passedArguments[i]);
                paramTest.isFunction = _.isFunction(passedArguments[i]);

                untested.push(new TestParamDetails(paramTest));
            }

            return untested;
        }

        return [];
    }

    static getUntestedType(untested) {
        let typeFound = false,
            foundType = 'unknown',
            tmpFn;

        for (let i=0; i<TypeDefinitions.primitives.length; i++) {
            tmpFn = TypeDefinitions.typeTests[TypeDefinitions.primitives[i]].typeFn;

            if (_.isString(tmpFn)) typeFound = require(tmpFn)(untested);
            else typeFound = tmpFn(untested);

            if (typeFound) {
                foundType = TypeDefinitions.primitives[i];
                break;
            }
        }

        if (foundType === 'unknown') {
            for (let i=0; i<TypeDefinitions.objects.length; i++) {
                tmpFn = Diag.typeTests[TypeDefinitions.objects[i]].typeFn;

                if (_.isString(tmpFn)) typeFound = require(tmpFn)(untested);
                else typeFound = tmpFn(untested);

                if (typeFound) {
                    foundType = TypeDefinitions.objects[i];
                    break;
                }
            }
        }

        return foundType;
    }

    static getObjectKeyValuePairs(testObject) {
        let tmpObjPropertyArray = [],
            keys, values, tmpType;

        try {
            if (!_.isEmpty(testObject) && typeof(testObject) === 'object') {

                keys = Object.keys(testObject);
                values = Object.values(testObject);

                for (let i=0; i<keys.length; i++) {
                    tmpObjPropertyArray.push(new TestRawObject({
                        objectKey: keys[i],
                        objectValue: values[i]
                    }));
                }
            }
            else if (_.isEmpty(testObject.get('testObject'))) {
                tmpType = 'object';
                if (TypeDefinitions.isPrimitive(testObject.get('testObject')))
                    tmpType = 'Empty';

                tmpObjPropertyArray.push(new TestRawObject({
                    objectKey: tmpType,
                    objectValue: testObject.get('testObject')
                }));
            }
            else {
                tmpType = 'non-object';
                if (TypeDefinitions.isPrimitive(testObject.get('testObject')))
                    tmpType = 'primitive';

                tmpObjPropertyArray.push(new TestRawObject({
                    objectKey: tmpType,
                    objectValue: testObject.get('testObject')
                }));
            }
            return tmpObjPropertyArray;
        }
        catch (e) {
            Log.error('getObjectKeyValuePairs failed:\n', e);
        }
    }

    static setFuncTestPassed(funcDetails) {
        if ( (funcDetails.get('paramsPassedTestCount') >= funcDetails.get('paramsCount')) && funcDetails.get('executionPassedTestCount') > 0) {
            funcDetails.set('passed', true);
        }
    }

    static cloneObjectShallow(obj) {
        return Object.assign({}, obj);
    }

    static cloneObjectDeep(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;

        const newObject = Array.isArray(obj) ? [] : {};

        for (let key in obj) {
            const value = obj[key];
            newObject[key] = this.cloneObjectDeep(value);
        }

        return newObject;
    }

    static getUpdatedTestConfig(target, clazz, testConfig) {
        let targetName =  target?.name,
            classTestConfig = {},
            updatedTestConfig = {};

        try {
            if (_.isUndefined(clazz.testConfig) || _.isNull(clazz.testConfig)) {
                if (!_.isUndefined(clazz.constructor.testConfig) && !_.isNull(clazz.constructor.testConfig))
                    classTestConfig = clazz.constructor.testConfig;
            }
            else
                classTestConfig = clazz.testConfig;

            if (_.isEmpty(classTestConfig)) {
                if (Object.keys(testConfig).length > 0) {
                    let tmpConfig = this.cloneObjectShallow(testConfig);
                    targetName = testConfig.name;
                    delete tmpConfig.name;
                    let tmpObj = {};
                    tmpObj[targetName] = tmpConfig;
                    tmpObj.isStatic = true;
                    updatedTestConfig = tmpObj;
                }
            }
            else if (!_.isEmpty(classTestConfig) && _.isEmpty(targetName)) {
                let configKeys = Object.keys(classTestConfig);
                if (_.isEmpty(configKeys[0])) {
                    testConfig.name;
                }
                else {
                    targetName = configKeys[0];
                    classTestConfig.isStatic = true;
                }
                updatedTestConfig = classTestConfig;
            }
            else {
                updatedTestConfig = classTestConfig;
                updatedTestConfig.isStatic = false;
            }
        }
        catch (ex) {
            console.error(ex);
        }
        return {targetName: targetName, updatedTestConfig: updatedTestConfig};
    }

    static async getTestObjectWithoutModels(testObj) {
        if (!_.isEmpty(testObj) && Object.keys(testObj).length > 0) {
            if (testObj.constructor.__proto__.isPrototypeOf(TestExecutionDetails)) {
                let paramJsonList = [],
                    testedParams = testObj.get('testedParams');
                if (_.isArray(testedParams) && testedParams.length > 0) {
                    for (let i=0; i<testedParams.length; i++) {
                        if (!_.isUndefined(testedParams[i])) {
                            let tmpModel = testedParams[i];
                            if (TypeDefinitions.objects.includes(tmpModel.get('jsType'))) {
                                console.log(testObj.get('testParamConfig')[i]);
                                let tmpTestObj = await this.getPropertyFromObject(tmpModel.get('testObject'), testObj.get('testParamConfig')[i].required[0]?.propName);
                                if (!_.isUndefined(tmpTestObj)) {
                                    tmpModel.set('testObject', tmpTestObj);
                                }
                            }
                            paramJsonList.push(tmpModel.getData());
                        }
                    }
                }
                testObj.set('testedParams', paramJsonList);

                let untestedParamsJsonList = [],
                    untestedParams = testObj.get('untestedParams');
                if (_.isArray(untestedParams) && untestedParams.length > 0) {
                    for (let i=0; i<untestedParams.length; i++) {
                        if (!_.isUndefined(untestedParams[i]))
                            untestedParamsJsonList.push(untestedParams[i].getData());
                    }
                }
                testObj.set('untestedParams', untestedParamsJsonList);
            }
        }
        return testObj;
    }

    static async getJsonWithoutCirculars(obj, depth = 0) {
        let visitedMark = Symbol('VISITED_MARK'),
            MAX_CLEANUP_DEPTH = 10;

        if (_.isEmpty(obj)) return obj;

        // Skip condition - either object is falsy, was visited or we go too deep
        const shouldSkip = !obj || obj[visitedMark] || depth > MAX_CLEANUP_DEPTH;

        // Copy object (we copy properties from it and mark visited nodes)
        const originalObj = obj;
        let result = {};

        for (const entry of Object.keys(originalObj)) {
            const val = originalObj[entry];

            if (!shouldSkip) {
                if (typeof val === 'object') { // Value is an object - run object sanitizer
                    originalObj[visitedMark] = true; // Mark current node as "seen" - will stop from going deeper into circulars
                    const nextDepth = depth + 1;

                    let nextResult =  await this.getJsonWithoutCirculars(val, nextDepth);
                    if (!_.isEmpty(nextResult) && (nextResult !== 'CIRCULAR' && nextResult !== 'SYMBOL ERROR')) {
                        try {
                            nextResult = Object.fromEntries(Object.entries(nextResult).sort());
                        }
                        catch (e) {
                            // sort() this a symbol inside larger browser objects, not certain yet how to best handle
                            // so this is a temporary catch to ensure the UI shows data and doesn't lag.
                            nextResult = 'SYMBOL ERROR';
                        }
                    }
                    result[entry] = nextResult;
                }
                else {
                    result[entry] = val;
                }
            }
            else {
                result = 'CIRCULAR';
            }
        }

        return result;
    }

    static getPrimitive(obj) {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        return _.isArray(obj) ? 'array' : typeof(obj);
    }

    static async findObjectProperty(obj, propertyName, propertyValue) {
        const objKeys = new Set(Object.keys(obj));
        for (const key in objKeys) {
            try {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];

                    // If the current property matches the search criteria, return it
                    if (key === propertyName && propertyValue === 'object') { //value === propertyValue) {
                        return obj;
                    }

                    // If the current property is an object, recursively search within it
                    if (typeof value === 'object' && value !== null) {
                        const result = await this.findObjectProperty(value, propertyName, propertyValue);
                        if (result) {
                            return result;
                        }
                    }
                }
            }
            catch (e) {
                Log.error(e.message);
            }
        }

        // Return null if the property and value are not found in the object
        return null;
    }

    //this.queryObject(this.getJsonWithoutCirculars(automation.data, 8), {property: 'id'})
    //UtilMethods.queryObject(UtilMethods.getJsonWithoutCirculars(passedArguments[0],8), {property: paramConfig[0].required[0].propName})
    static queryObject (obj, options) {
        options = Object.assign({ value: undefined, property: undefined, fn: undefined, results: [], path: [], depth: 1 }, (options || {}));

        let { value, property, fn, results, path, depth } = options;

        const array = Object.keys(this.getPrimitive(obj) === 'array' || this.getPrimitive(obj) === 'object' ? obj : {});

        for (let key of array) {
            const val = obj[key];
            const type = this.getPrimitive(val);

            if (key === 'body') debugger;

            if (type === 'array' || type === 'object') {

                results = this.queryObject(val, {
                    results,
                    value,
                    property,
                    path: path.concat(_.isNumber(key) ? `[${key}]` : `${key}`),
                    depth: depth + 1
                });
            }
            else {
                let useFn = typeof(fn) === 'function';
                let propertyIsKey = property === key;
                let match = useFn ? fn(property, value) : propertyIsKey;
                if (match) {
                    path.push(key);
                    results.push({
                        depth,
                        key,
                        val,
                        path,
                        namespace: path.join('.')
                    });
                }
            }
        }
        //console.log(results);
        return results;
    }

    static readFileAsync(path) {
        return new Promise(function (resolve, reject) {
            fs.readFile(path, 'utf8', function (error, result) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Read a file system and gather info about each file in a Map or Array of Objects
     * containing data about each file.
     *
     * @example
     *  tree('../').then(map => {
     *       console.log(map);
     *  });
     *
     * @example
     *  tree('.', {
     *      ignore: ['node_modules'],
     *      toArray: true,
     *      maxDepth: 3
     *  }).then(array => {
     *     console.log(array);
     *  });
     *
     * @param {string} path - the path root to start reading.
     * @param {Object} opts - optional: { toArray: false, maxDepth: 5, ignore: [] }] opts - toArray and maxDepth settings
     * @returns {Promise} Map by default or Array if toArray is true
     */
    static async GetFileTree(path = '.', opts = {}) {
        path = resolve(path);
        opts = Object.assign({ toArray: false, depth: 1, maxDepth: 5, ignore: [] }, opts);

        const list = opts.toArray ? [] : new Map();
        const currentDepth = opts.depth;
        const maxDepthReached = (opts.depth >= opts.maxDepth);

        opts.depth++;

        try {
            let index = 0;
            const files = readdirSync(path);

            for (const file of files) {
                if (opts.ignore.includes(file)) continue;

                const full  = resolve(path, file);
                const stats = await statSync(full);
                const isDir = stats.isDirectory();
                const children = isDir && !maxDepthReached ? await tree(full, opts) : null;
                const meta = Object.assign({}, stats, parse(full), {
                    index: index++,
                    depth: currentDepth,
                    type: isDir ? 'directory' : 'file',
                    pathname: full,
                }, (isDir ? {
                    total: children ? (children.size || children.length) : 0,
                    files: children
                } : {}));

                if (opts.toArray) {
                    list.push(meta);
                } else {
                    list.set(file, meta);
                }
            }
        } catch(e) {
            console.error('Error:', e.message);
        }

        return list;
    }

    static async isPropertyInObject(testObj={}, propertyPath='') {
        let propPresence = true,
            propPathParts = propertyPath.split('.');

        try {
            if (propPathParts.length > 0) {
                let tmpObjProp = testObj;
                for (let i=0; i<propPathParts.length; i++) {
                    if (tmpObjProp[propPathParts[i]]) {
                        tmpObjProp = tmpObjProp[propPathParts[i]];
                    }
                    else {
                        propPresence = false;
                        break;
                    }
                }
            }
        }
        catch (e) {
            Log.error(e);
        }

        return propPresence;
    }


    static async getPropertyFromObject(testObj={}, propertyPath='') {
        let prop,
            propPathParts = propertyPath.split('.');

        try {
            if (propPathParts.length > 0) {
                let tmpObjProp = testObj;
                for (let i=0; i<propPathParts.length; i++) {
                    if (tmpObjProp[propPathParts[i]]) {
                        tmpObjProp = tmpObjProp[propPathParts[i]];
                    }
                }
                prop = tmpObjProp;
            }
        }
        catch (e) {
            Log.error(e);
        }

        return prop;
    }

    static getPassedParamsTypes(passedArguments=[]) {
        let typeList = [];

        try {
            if (passedArguments.length > 0) {
                for (let i=0; i<passedArguments.length; i++) {
                    typeList.push(passedArguments[i].constructor.name);
                }
            }
        }
        catch (e) {
            Log.error(e);
        }

        return typeList;
    }

}
