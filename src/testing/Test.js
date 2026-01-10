const os = require('os');
const _ = require('lodash');
const { Log } = require('../log');
const TypeDefinitions = require('./TypeDefinitions');
const UtilMethods = require('./UtilMethods');
const { TestFuncDetails, TestParamDetails, TestExecutionDetails } = require('./model');
const TestMsgProducer = require('./TestMsgProducer');
const AppCache = require('../core/AppCache');
const KafkaClient = require('../datastream/KafkaClient');

module.exports = class ZoinxTest {

    static setupTestConfigCache() {
        if (!global.testing) global.testing = {};
        if (!global.testing.configCache) {
            global.testing.configCache = new AppCache(
                {
                    stdTTL: 3600,
                    checkperiod: 1000,
                    maxKeys: 5000
                }
            );
        }
    }

    static async createTestMsgProducer() {
        try {
            if (_.isUndefined(global.kafka)) global.kafka = {};
            if (_.isUndefined(global.kafka.TestMsgProducer)) {
                let kafkaClient = new KafkaClient('TestMsgProducer', [process.env.TESTING_MESSAGE_SERVERS]);
                await kafkaClient.setClientConfig('TESTING_MESSAGE', process.env.TESTING_ENV, process.env.TESTING_USE_SSL);
                global.kafka.TestMsgProducer = kafkaClient;
            }
        } catch (e) {
            Log.error(e);
        }
    }

    static setupFuncTest(clazz, func, passedArguments, errorStack, testConfig, targetName, notes = '') {
        let newFuncRec,
            methodInput,
            methodOutput;

        if (_.isUndefined(testConfig) || _.isNull(testConfig)) {
            Log.error('Must have method config and output config to setup a test.', clazz);
            return;
        }

        this.setupTestConfigCache();
        methodInput = (_.isEmpty(testConfig[targetName].input)) ? ['<=><undefined>'] : testConfig[targetName].input;
        methodOutput = (_.isEmpty(testConfig[targetName].output)) ? ['<=><undefined>'] : testConfig[targetName].output;

        if (!global.testingConfig.isTestingEnabled) {
            if (global.testingConfig.consoleOut) Log.info('Testing is not enabled.');
            return;
        }

        if (global.testingConfig?.isTestingEnabled && global.testingConfig?.sendResult2Kafka) {
            this.createTestMsgProducer().catch(r => {
                Log.error(r);
            });
        }

        try {
            if (!_.isUndefined(clazz) && !_.isNull(clazz) && !_.isUndefined(func) && !_.isNull(func)) {
                newFuncRec = this.createMethodTest(clazz, func, passedArguments, errorStack, methodInput, methodOutput, testConfig);
                if (!_.isUndefined(newFuncRec)) newFuncRec.set('notes', notes);
            } else Log.info(`Class and arguments must be supplied to setup test. ${clazz?.constructor.name}.${func?.name}`);
        } catch (e) {
            Log.error('setupFuncTest failed:\n', e);
        }

        return newFuncRec;
    }

    static createMethodTest(clazz, func, passedArguments, errorStack, methodInput, methodOutput, testConfig) {
        let funcTestConfig = {},
            className = UtilMethods.getClassName(clazz),
            methodName = (_.isEmpty(clazz.testConfig)) ? UtilMethods.getMethodName(func, testConfig) : UtilMethods.getMethodName(func, clazz.testConfig),
            expectedParams = [],
            expectedResult = [],
            methodCaller, callee;

        try {
            funcTestConfig.testParamConfigStr = methodInput;
            expectedParams = UtilMethods.getExpectedConfig(className, methodName, methodInput, 'input');
            funcTestConfig.testParamConfig = expectedParams;
            funcTestConfig.distinctParamNames = UtilMethods.getDistinctNamesFromArray(expectedParams);

            funcTestConfig.testOutputConfigStr = methodOutput;
            expectedResult = UtilMethods.getExpectedConfig(className, methodName, methodOutput, 'output');
            funcTestConfig.testOutputConfig = expectedResult;

            methodCaller = UtilMethods.getCallerMethod(clazz, errorStack);
            if (methodCaller.className === 'Proxy')
                return undefined;

            funcTestConfig.className = className;
            funcTestConfig.methodName = methodName;
            funcTestConfig.passedArguments = UtilMethods.getPassedParamsTypes(passedArguments);
            funcTestConfig.argumentsCount = UtilMethods.getRealArgumentsCount(passedArguments);

            funcTestConfig.methodSignature = UtilMethods.getMethodSignature(func);
            funcTestConfig.paramsCount = UtilMethods.getSignatureParamsCount(funcTestConfig.methodSignature);
            funcTestConfig.serverInstance = os.hostname();

            if (!_.isString(methodInput) || methodInput.toLowerCase() !== 'trace')
                funcTestConfig.doArgumentCountsMatch = UtilMethods.doesPassedCountEqualExpectedCount(passedArguments, expectedParams);

            if (!funcTestConfig.doArgumentCountsMatch && passedArguments.length > expectedParams.length)
                funcTestConfig.untestedParams = UtilMethods.getUntestedParams(passedArguments, expectedParams);

            // This is a workaround for closures or callbacks or async and might work for async/await.
            // This looks to see if the methodCaller is null or if it has a className property.
            // The presence of a className property indicates that a closure/callback was
            // pre-feed it's parent method, so we can use it here since closure has its own special scope.
            if (_.isEmpty(methodCaller) || _.isEmpty(methodCaller.className)) {
                funcTestConfig.callerClassName = methodCaller.className;
                funcTestConfig.callerMethodName = (methodCaller.file) ? methodCaller.file : methodCaller.methodName;
                funcTestConfig.callerSignature = UtilMethods.getMethodSignature(func);
            }
            else {
                funcTestConfig.callerClassName = methodCaller.className;
                funcTestConfig.callerMethodName = (methodCaller.file) ? methodCaller.file : methodCaller.methodName;
                //funcTestConfig.callerSignature = methodCaller.signature;
            }

            let funcTest = new TestFuncDetails(funcTestConfig);
            return funcTest;
        }
        catch (e) {
            Log.error('createMethodTest failed:\n', e);
        }
    }

    static async execFuncTest(clazz, func, passedArguments, testRec = {}, optionalVals = {}) {

        if (Object.keys(testRec).length < 1) {
            Log.error('No test record provided to run.');
            return false;
        }

        let testId = testRec.get('id');
        if (testId === '-1' || _.isEmpty(testId) || _.isUndefined(testId)) {
            Log.error('No ID found to operate func test on.');
            return false;
        }

        try {

            let optionalKeys = Object.keys(optionalVals);
            if (optionalKeys.length > 0) {
                let fieldNames = testRec.getFieldNames();
                for (const key of optionalKeys) {
                    if (fieldNames.includes(key)) {
                        let tmpResult = optionalVals[key];
                        if (key === 'executionResult') {
                            if (TypeDefinitions.isObjectLike(tmpResult)) {
                                if (tmpResult.constructor.name === 'Promise') {
                                    tmpResult = await tmpResult;
                                }
                                tmpResult = await this.reduceObjectOrArray(tmpResult);
                            }
                        }
                        testRec.set(key, tmpResult);
                    }
                }
            }

            if (_.isEmpty(testRec)) {
                UtilMethods.logTestResult('noclass', 'nomethod', 'No matching test record found.');
            } else {
                if (_.isDate(testRec.get('stopWatchStart')) && _.isDate(testRec.get('stopWatchEnd'))) {
                    testRec.set('runningTimeMillis', (+testRec.get('stopWatchEnd') - +testRec.get('stopWatchStart')));
                }
                else if (_.isObject(optionalVals.executionTimer) && optionalVals.executionTimer.constructor?.name === 'HighResTimer') {
                    testRec.set('runningTime', optionalVals.executionTimer.durationNs());
                    testRec.set('runningTimeMillis', optionalVals.executionTimer.durationMs());
                }
                else if (_.isInteger(testRec.get('stopWatchStart')) && _.isInteger(testRec.get('stopWatchEnd'))) {
                    testRec.set('runningTimeMillis', (testRec.get('stopWatchEnd') - testRec.get('stopWatchStart')));
                }
                await this.functionTest(clazz, func, passedArguments, testRec);
            }
        }
        catch (e) {
            Log.info('execFuncTest failed:\n', e);
            return false;
        }

        return true;
    }

    static async reduceObjectOrArray(toReduce) {
        if (!_.isEmpty(toReduce) && _.isArray(toReduce) && toReduce.length >= 10) {
            return _.clone(toReduce).splice(10);
        } else if (!_.isEmpty(toReduce) && _.isObject(toReduce)) {
            if (['IncomingMessage', 'ServerResponse'].includes(toReduce.constructor.name)) {
                return await UtilMethods.getJsonWithoutCirculars(toReduce, 8);
            }
            return await UtilMethods.getJsonWithoutCirculars(toReduce, 4);
        }

        return toReduce;
    }

    static async functionTest(clazz, func, passedArguments, testRec) {
        if (!global.testingConfig.isTestingEnabled) return;

        try {
            const distinctParams = testRec.get('distinctParamNames');
            const hasParams = distinctParams && distinctParams.length > 0;

            // ------------------------------
            // Core test execution
            // ------------------------------
            if (hasParams) {
                await this.execParamTests(clazz, func, passedArguments, testRec);
                await this.execOutputTest(clazz, func, passedArguments, testRec);
                UtilMethods.setFuncTestPassed(testRec);

                if (!testRec.get('passed')) {
                    const passedCount = testRec.get('paramsPassedTestCount');
                    const totalCount = testRec.get('paramsCount');

                    let msg;
                    if (passedCount !== totalCount) {
                        msg =
                            `********** Function parameters for ${testRec.get('methodName')} passed ` +
                            `${passedCount} of ${totalCount} tests. **********`;
                    } else if (!testRec.get('executionPassed')) {
                        msg =
                            `********** Function OUTPUT test for ${testRec.get('methodName')} failed. **********`;
                    }

                    testRec.set('resultMessage', msg);
                    UtilMethods.logTestResult(testRec.get('className'), testRec.get('methodName'), msg);
                }
            }
            else if (testRec.get('distinctParamNames').length < 1) {
                testRec.set('paramsCount', 0);
                testRec.set('paramsPassedTestCount', 0);
                testRec.set('passed', true);
                testRec.set('resultMessage', 'Function trace');
                await this.execOutputTest(clazz, func, passedArguments, testRec);
            }

            // ----------------------------------------
            // OPTIONAL: sampled detection / metrics
            // ----------------------------------------
            const len = passedArguments.length;
            if (this.shouldSample()) {
                for (let i = 0; i < len; i++) {
                    if (this.hasCircularRefFast(passedArguments[i])) {
                        // metric/log hook here
                        break;
                    }
                }
            }

            testRec = await UtilMethods.getTestObjectWithoutModels(testRec);

            const tmpReduced = [];
            for (let i = 0; i < testRec.get('passedArguments').length; i++) {
                tmpReduced.push(await UtilMethods.removeCircularRefs(testRec.get('passedArguments')[i]));
            }
            if (tmpReduced.length > 0) {
                testRec.set('testedParams', tmpReduced);
            }

            // ----------------------------------------
            // Fire-and-forget
            // ----------------------------------------
            new TestMsgProducer(testRec.json).send().catch();
            return testRec;

        }
        catch (e) {
            Log.error('functionTest failed:', e);
        }
    }

    static execParamTests(clazz, func, passedArguments, funcDetails) {
        const paramConfig = funcDetails.get('testParamConfig');
        const paramDetails = [];
        let currentParamName = '',
            passedArgIdx = -1,
            testObject;

        for (let i = 0; i < paramConfig.length; i++) {
            const config = paramConfig[i];
            if (config.name !== currentParamName) {
                currentParamName = config.name;
                passedArgIdx++;
            }

            testObject = passedArguments[passedArgIdx];
            let paramTest = new TestParamDetails({
                jsType: config.type,
                subType: config.subType,
                name: currentParamName,
                testObject: testObject,
                isOptional: config.optional,
                maskValue: config.maskValue,
                passed: false,
                typePassed: false,
                subTypePassed: true
            });

            if ((!_.isUndefined(testObject) && !_.isNull(testObject)) || paramTest.get('isOptional')) {

                // Use static def typeTests to easily test declared data type
                let tmpFn = TypeDefinitions.typeTests[paramTest.get('jsType')].typeFn;

                if (_.isString(tmpFn)) paramTest.set('typePassed', require(tmpFn)(testObject));
                else paramTest.set('typePassed', tmpFn(testObject));

                const jsType = paramTest.get('jsType');
                if (TypeDefinitions.primitives.includes(jsType)) {
                    this.testPrimitive(config, paramTest, passedArguments[i], testObject);
                }
                else if (TypeDefinitions.objects.includes(jsType)) {
                    this.testObject(config, paramTest, passedArguments[i], testObject);
                }
                else if (TypeDefinitions.otherTypes.includes(jsType)) {
                    this.testOthers(config, paramTest, passedArguments[i], testObject);
                }

                if (UtilMethods.areRejectedInAccepted(config)) {
                    UtilMethods.logTestResult(clazz, passedArguments, 'Rejected values were found in accepted values from test config.');
                    paramTest.set('passed', false);
                }

                if (paramTest.get('isOptional')) {
                    paramTest.set('passed', true);
                }
            }

            paramTest.set('testParamConfigStr', config.testParamConfigStr);
            // Set the final booleans to help best understand what was tested
            paramTest.set('isEmpty', _.isEmpty(testObject));
            paramTest.set('isElement', _.isElement(testObject));
            paramTest.set('isTextNode', UtilMethods.isTextNode(testObject));
            paramTest.set('isIterable', UtilMethods.isIterable(testObject));
            paramTest.set('isFunction', _.isFunction(testObject));
            paramTest.set('successCount', (_.isBoolean(paramTest.get('passed')) && paramTest.get('passed')) ? 1 : 0);

            if (paramTest.get('maskValue') && _.isString(testObject))
                paramTest.set('testObject', UtilMethods.maskValue(testObject));

            paramDetails.push(paramTest);
        }

        // This similar to a few lines up, but it is for the entire set not just 1 test.
        funcDetails.set('paramsPassedTestCount', paramDetails.reduce((accumulator, currentVal) => {
            if (currentVal.get('successCount') > 0) accumulator += 1;
            return accumulator;
        }, 0));

        funcDetails.set('testedParams', paramDetails);
    }

    static execOutputTest(clazz, func, passedArguments, funcDetails) {
        const outputConfig = funcDetails.get('testOutputConfig');
        const distinctParamNames = funcDetails.get('distinctParamNames');

        const outDetails = [];
        let successCount = 0,
            executionResult = funcDetails.get('executionResult');

        funcDetails.set('passedArguments', passedArguments);

        for (const config of outputConfig) {
            const execTest = {
                name: config.name ?? 'None Supplied',
                isOptional: config.optional,
                testParamConfigStr: config.testParamConfigStr,
                expectedOut: config.expectedOut
            };

            const typeTest = TypeDefinitions.getTypeAccepted(config.type, executionResult);

            execTest.type = typeTest.type;
            execTest.typePassed = typeTest.typeAccepted;
            execTest.subType = typeTest.subType;
            execTest.subTypePassed = typeTest.subTypeAccepted;

            execTest.passed = false;

            // Fast-exit cases
            if (execTest.typePassed && (config.type === 'undefined' || config.type === 'null')) {
                execTest.passed = true;
            }
            else if (TypeDefinitions.primitives.includes(config.type.toLowerCase())) {

                if (Array.isArray(config.expectedOut) && config.expectedOut.length > 0) {

                    const testValue = UtilMethods.getConfiguredOutput(
                        config.expectedOut,
                        distinctParamNames,
                        passedArguments
                    );

                    execTest.passed = testValue === executionResult;
                    execTest.resultMessage = testValue;
                }
                else if (execTest.typePassed && TypeDefinitions.typeTests[config.type]?.typeFn(executionResult)) {
                    execTest.passed = true;
                    execTest.resultMessage = executionResult;
                }
            }
            else {
                // Complex object comparison
                const testOutputConfig = new TestParamDetails(outputConfig[0]);
                testOutputConfig.set('jsType', execTest.type);

                this.testObject(
                    outputConfig[0],
                    testOutputConfig,
                    executionResult,
                    executionResult
                );

                execTest.passed = testOutputConfig.get('passed');
            }

            if (!execTest.passed) {
                execTest.resultMessage ??= 'No matching output found.';
            }

            if (config.maskValue && _.isString(executionResult))
                funcDetails.set('executionResult', UtilMethods.maskValue(executionResult));

            outDetails.push(new TestExecutionDetails(execTest));
        }

        successCount = outDetails.reduce((accumulator, currentVal) => {
            if (typeof currentVal.get('passed') === 'boolean' && currentVal.get('passed')) accumulator += 1;
            return accumulator;
        }, 0);
        funcDetails.set('executionPassedTestCount', successCount);
        funcDetails.set('testedOutput', outDetails);
        funcDetails.set('executionPassed', successCount === outDetails.length);
    }

    static testPrimitive(paramConfig, paramTest, passedArgument, testObject) {
        try {
            if (paramTest.get('typePassed') && !paramTest.get('isOptional')) {
                paramTest.set('passed', true);
            }

            if (paramConfig.acceptedValues.length > 0) {
                if (!paramConfig.acceptedValues.includes(testObject)) {
                    paramTest.set('passed', false);
                    if (_.isRegExp(paramConfig.acceptedValues[0]) && paramConfig.acceptedValues[0].test(testObject)) {
                        paramTest.set('passed', true);
                    } else if (_.isFunction(paramConfig.acceptedValues[0])) {
                        let funcResults = paramConfig.acceptedValues[0](testObject);
                        paramTest.set('passed', TypeDefinitions.toBoolean(funcResults));
                    }
                }
            } else if (paramConfig.rejectedValues.length > 0) {
                if (paramConfig.rejectedValues.includes(testObject)) {
                    paramTest.set('passed', false);
                    if (_.isRegExp(paramConfig.rejectedValues[0]) && !paramConfig.rejectedValues[0].test(testObject))
                        paramTest.set('passed', true);
                }
            }
        } catch (e) {
            Log.error(e.message);
        }
    }

    static testArray(paramConfig, paramTest, passedArgument, testObject) {
        let typeAccepted;

        try {
            typeAccepted = TypeDefinitions.getTypeAccepted(`${paramTest.get('jsType')}=:${paramTest.get('subType')}`, testObject);
            paramConfig.subType = typeAccepted.subType;
            paramTest.set('typePassed', typeAccepted.typeAccepted);
            paramTest.set('subTypePassed', typeAccepted.subTypeAccepted);

            if (typeAccepted.typeAccepted && typeAccepted.subType !== 'N/A') {
                if (typeAccepted.subTypeAccepted) {
                    paramTest.set('passed', testObject.every(TypeDefinitions.typeTests[paramTest.get('subType')].typeFn));
                } else {
                    paramTest.set('passed', false);
                }
            } else if (typeAccepted.typeAccepted && typeAccepted.subType === 'N/A') {
                paramTest.set('passed', true);
            } else {
                paramTest.set('passed', (typeAccepted.typeAccepted && typeAccepted.subTypeAccepted));
            }
        } catch (e) {
            Log.error(e.message);
        }

        return paramTest.get('passed');
    }

    static testRequired(required, testObject) {
        if (!_.isArray(required) || _.isEmpty(testObject)) return false;
        let depthLevel = 0,
            propPath, propName, objectPath, objectQueryResponse;

        for (let i = 0; i < required.length; i++) {
            propPath = required[i].propName;
            objectPath = propPath.split('.');
            depthLevel = objectPath.length;

            propName = _.takeRight(objectPath)[0];
            objectQueryResponse = UtilMethods.queryObject(testObject, { property: propName, depth: depthLevel });
            if (objectQueryResponse) {
                Log.log(objectQueryResponse);
            } else {
                console.warn(`Object query did not find ${propName}`);
            }
        }

        return true;
    }

    static testObject(paramConfig, paramTest, passedArgument, testObject) {
        try {
            if (paramConfig.type === 'array') {
                this.testArray(paramConfig, paramTest, passedArgument, testObject);
                return;
            }

            // 1. Validate input parameters
            if (!Object.hasOwn(paramTest.json, 'jsType') || !Object.hasOwn(paramTest.json, 'subType')) {
                throw new Error('Missing required test parameters');
            }

            // 2. Determine accepted type
            const typeAccepted = TypeDefinitions.getTypeAccepted(
                `${paramTest.get('jsType')}=:${paramTest.get('subType')}`,
                testObject
            );
            paramTest.set('typeAccepted', typeAccepted);
            paramTest.set('passed', false);

            // 3. Process required items validation
            this.processRequiredItems(paramConfig, paramTest, passedArgument, testObject);

            // 4. Handle masking if needed
            this.handleMasking(paramConfig, paramTest, passedArgument, testObject);

            // TODO need to see if this is really needed anymore past the accumulator.
            paramTest.set('successCount', (_.isBoolean(paramTest.get('passed')) && paramTest.get('passed')) ? 1 : 0);
        } catch (error) {
            Log.error(`Validation error: ${error.message}`);
            paramTest.set('passed', false);
            // throw error; // Re-throw for caller handling
        }
    }

    static processRequiredItems(paramConfig, paramTest, passedArgument, testObject) {
        const requiredItems = this.getRequiredItems(paramConfig);
        let successCount = 0;
        const isOr = !Array.isArray(requiredItems[0]);

        for (const item of requiredItems) {
            const objectRef = this.getNestedValue(passedArgument, item.propName);
            if (!objectRef) continue; // Skip if path doesn't exist

            this.validateItem(item, objectRef);
            successCount++;
        }

        // Update test result based on validation
        if (successCount === requiredItems.length || (isOr && successCount > 0)) {
            paramTest.set('passed', true);
        }
    }

    static getRequiredItems(paramConfig) {
        const isOr = !Array.isArray(paramConfig.required[0]);
        return isOr ? paramConfig.required : paramConfig.required[0];
    }

    static getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            // if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, part)) {
            if (_.isEmpty(current) || (!current[part] && !Object.prototype.hasOwnProperty.call(current, part))) {
                return undefined;
            }
            current = current[part];
        }

        return current;
    }

    static validateItem(item, value) {
        // Handle regex, function, or value matching
        if (item.regex?.test(value)) return;
        if (typeof item.dynaFunc === 'function' && item.dynaFunc(value)) return;
        if (item.values.length > 0 && item.values.includes(value)) return;

        // Fallback type check
        TypeDefinitions.typeTests[item.type]?.typeFn(value);
    }

    static handleMasking(paramConfig, paramTest, passedArgument, testObject) {
        if (!paramConfig.maskValue || !paramTest.get('passed')) return;

        const objectPath = paramConfig.maskValue.propName.split('.');
        const value = this.getNestedValue(passedArgument, objectPath);
        if (typeof value === 'string') {
            const maskedValue = UtilMethods.maskValue(value, paramConfig.maskValue.maskCount);
            // Update nested property in passedArgument
            // (Implementation depends on how nested objects are handled)
        }
    }

    // Tune this: 16 = 1/16 calls, 32 = 1/32 calls, 64 = 1/64 calls
    static SAMPLE_RATE = 16;
    static _sampleCounter = 0;

    static shouldSample() {
        // Increment first call so can be skipped
        return (++this._sampleCounter & (this.SAMPLE_RATE - 1)) === 0;
    }

};
