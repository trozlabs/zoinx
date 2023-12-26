const os = require('os');
const _ = require('lodash');
const { Log } = require('../log');
const TypeDefinitions = require('./TypeDefinitions');
const UtilMethods = require('./UtilMethods');
const { TestFuncDetails, TestParamDetails, TestExecutionDetails} = require('./model');
const TestMsgProducer = require('./TestMsgProducer');
const AppCache = require('../core/AppCache');
const path = require('path');

module.exports = class ZoinxTest {

    static setupTestConfigCache() {
        if (!global.testing) global.testing = {};
        if (!global.testing.configCache) {
            global.testing.configCache = new AppCache(
                {
                    stdTTL: 300,
                    checkperiod: 100,
                    maxKeys: 5000
                }
            );
        }
    }

    static setupFuncTest(clazz, func, passedArguments, errorStack, testConfig, targetName, notes='') {
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

        try {
            if (!_.isUndefined(clazz) && !_.isNull(clazz) && !_.isEmpty(passedArguments)) {
                newFuncRec = this.createMethodTest(clazz, func, passedArguments, errorStack, methodInput, methodOutput, testConfig);
                newFuncRec.set('notes', notes);
            }
            else Log.info('Class and arguments must be supplied to setup test.');
        }
        catch (e) {
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

            funcTestConfig.className = className;
            funcTestConfig.methodName = methodName;
            funcTestConfig.passedArguments = UtilMethods.getPassedParamsTypes(passedArguments);
            funcTestConfig.argumentsCount = UtilMethods.getRealArgumentsCount(passedArguments);

            funcTestConfig.methodSignature = UtilMethods.getMethodSignature(func);
            funcTestConfig.paramsCount = UtilMethods.getSignatureParamsCount(funcTestConfig.methodSignature);
            funcTestConfig.serverInstance = os.hostname();

            if ( !_.isString(methodInput) || methodInput.toLowerCase() !== 'trace')
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
            Log.error('No test record provided to run.')
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
                                if (tmpResult.constructor.name === 'Promise')
                                    tmpResult = await tmpResult;
                                tmpResult = await UtilMethods.getJsonWithoutCirculars(tmpResult, 4);
                            }
                        }
                        testRec.set(key, tmpResult);
                    }
                }
            }

            if (_.isEmpty(testRec)) {
                UtilMethods.logTestResult('noclass', 'nomethod', 'No matching test record found.');
            }
            else {
                if (_.isDate(testRec.get('stopWatchStart')) && _.isDate(testRec.get('stopWatchEnd')))
                    testRec.set('runningTimeMillis', (+testRec.get('stopWatchEnd') - +testRec.get('stopWatchStart')));
                else if (_.isInteger(testRec.get('stopWatchStart')) && _.isInteger(testRec.get('stopWatchEnd')))
                    testRec.set('runningTimeMillis', (testRec.get('stopWatchEnd') - testRec.get('stopWatchStart')));
                await this.functionTest(clazz, func, passedArguments, testRec);
            }
        }
        catch (e) {
            Log.info('execFuncTest failed:\n', e);
            return false;
        }

        return true;
    }

    static async functionTest(clazz, func, passedArguments, testRec) {

        if (global.testingConfig.isTestingEnabled) {
            try {
                if (testRec.get('distinctParamNames').length > 0) {
                    this.execParamTests(clazz, func, passedArguments, testRec);
                    this.execOutputTest(clazz, func, passedArguments, testRec);
                    UtilMethods.setFuncTestPassed(testRec);
                    if (!testRec.get('passed')) {
                        let resultMessage = '';
                        if (testRec.get('paramsPassedTestCount') !== testRec.get('paramsCount')) {
                            resultMessage = `********** Function parameters for ${testRec.get('methodName')} passed ${testRec.get('paramsPassedTestCount')} of ${testRec.get('paramsCount')} tests. **********`;
                        }
                        else if (!testRec.get('executionPassed')) {
                            resultMessage = `********** Function output test for ${testRec.get('methodName')} failed. **********`;
                        }

                        testRec.set('resultMessage', resultMessage);
                        UtilMethods.logTestResult(testRec.get('className'), testRec.get('methodName'), testRec.get('resultMessage'));
                    }
                }
                else if (testRec.get('distinctParamNames').length < 1) {
                    testRec.set('paramsCount', 0);
                    testRec.set('paramsPassedTestCount', 0);
                    testRec.set('passed', true);
                    testRec.set('resultMessage', 'Function trace');
                    this.execOutputTest(clazz, func, passedArguments, testRec);
                }

                testRec = await UtilMethods.getTestObjectWithoutModels(testRec);
                testRec = await UtilMethods.getJsonWithoutCirculars(testRec.json, 6);
                new TestMsgProducer(testRec).send();
                return testRec;
            }
            catch (e) {
                console.error('functionTest failed:\n', e);
            }
        }
    }

    static execParamTests(clazz, func, passedArguments, funcDetails) {
        let paramConfig = funcDetails.get('testParamConfig'),
            paramDetails = [],
            currentParamName = '',
            passedArgIdx = -1,
            testObject;

        for (let i=0; i<paramConfig.length; i++) {
            if (paramConfig[i].name !== currentParamName) {
                currentParamName = paramConfig[i].name;
                passedArgIdx++;
            }

            //see if param is required
            //see if param is correct type
            //see if param has correct value, if configured

            testObject = passedArguments[passedArgIdx];
            let paramTest = new TestParamDetails({
                jsType: paramConfig[i].type,
                subType: paramConfig[i].subType,
                name: currentParamName,
                testObject: testObject,
                isOptional: paramConfig[i].optional,
                maskValue: paramConfig[i].maskValue,
                passed: false,
                typePassed: false,
                subTypePassed: true
            });

            if ((!_.isUndefined(testObject) && !_.isNull(testObject)) || paramTest.get('isOptional') ) {

                // Use static def typeTests to easily test declared data type
                let tmpFn = TypeDefinitions.typeTests[paramTest.get('jsType')].typeFn;

                if (_.isString(tmpFn)) paramTest.set('typePassed', require(tmpFn)(testObject));
                else paramTest.set('typePassed', tmpFn(testObject));

                if (TypeDefinitions.primitives.includes(paramTest.get('jsType'))) {
                    this.testPrimitive(paramConfig[i], paramTest, passedArguments[i], testObject);
                }
                else if (TypeDefinitions.objects.includes(paramTest.get('jsType'))) {
                    this.testObject(paramConfig[i], paramTest, passedArguments[i], testObject);
                }
                else if (TypeDefinitions.otherTypes.includes(paramTest.get('jsType'))) {
                    this.testOthers(paramConfig[i], paramTest, passedArguments[i], testObject);
                }

                if (UtilMethods.areRejectedInAccepted(paramConfig[i])) {
                    UtilMethods.logTestResult(clazz, passedArguments, 'Rejected values were found in accepted values from test config.');
                    paramTest.set('passed', false);
                }

                if (paramTest.get('isOptional')) paramTest.set('passed', true);
            }

            paramTest.set('testParamConfigStr', paramConfig[i].testParamConfigStr);
            // Set the final booleans to help best understand what was tested
            paramTest.set('isEmpty', _.isEmpty(testObject));
            paramTest.set('isElement', _.isElement(testObject));
            paramTest.set('isTextNode', UtilMethods.isTextNode(testObject));
            paramTest.set('isIterable', UtilMethods.isIterable(testObject));
            paramTest.set('isFunction', _.isFunction(testObject));
            paramTest.set('successCount', (_.isBoolean(paramTest.get('passed')) && paramTest.get('passed')) ? 1 : 0);

            if (paramTest.get('maskValue') && _.isString(testObject))
                paramTest.set('testObject', UtilMethods.maskString(testObject, 2));

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
        let outputConfig = funcDetails.get('testOutputConfig'),
            outDetails = [],
            successCount = 0,
            testObject,
            execTest = {};

        for (let i=0; i<outputConfig.length; i++) {
            testObject = funcDetails.get('executionResult');
            execTest = {
                name: (outputConfig[i].name) ? outputConfig[i].name : 'None Supplied',
                isOptional: outputConfig[i].optional
            };

            let typeTest = TypeDefinitions.getTypeAccepted(outputConfig[0].type, testObject);

            funcDetails.set('passedArguments', passedArguments);
            execTest.type = typeTest.type;
            execTest.typePassed = typeTest.typeAccepted;
            execTest.subType = typeTest.subType;
            execTest.subTypePassed = typeTest.subTypeAccepted;
            execTest.testParamConfigStr = outputConfig[i].testParamConfigStr;
            execTest.expectedOut = outputConfig[i].expectedOut;

            if (execTest.typePassed && (outputConfig[i].type === "undefined" || outputConfig[i].type === "null")) {
                execTest.passed = true;
            }
            else {
                if (TypeDefinitions.primitives.includes(outputConfig[i].type.toLowerCase())) {

                    if (outputConfig[i].expectedOut.length > 0) {
                        if (~_.isEmpty(outputConfig[i].expectedOut)) {
                            let testValue = UtilMethods.getConfiguredOutput(outputConfig[i].expectedOut,
                                funcDetails.get('distinctParamNames'),
                                funcDetails.get('passedArguments'));


                            if (testValue === funcDetails.get('executionResult')) {
                                execTest.passed = true;
                                execTest.resultMessage = testValue;
                            }
                            else
                                execTest.passed = false;
                        }
                        else {
                            execTest.resultMessage = funcDetails.get('executionResult');
                            if (funcDetails.get('executionResult') === outputConfig[i].expectedOut[0]) {
                                execTest.passed = true;
                            }
                            else {
                                execTest.passed = false;
                            }
                        }
                    }
                    else {
                        execTest.passed = false;
                        if (execTest.typePassed && TypeDefinitions.typeTests[outputConfig[0].type].typeFn(testObject)) {
                            execTest.passed = true;
                            execTest.resultMessage = funcDetails.get('executionResult');
                        }
                    }
                }
                else {
                    // still doesn't seem correct but works for now.
                    let testOutputConfig = new TestParamDetails(funcDetails.get('testOutputConfig')[0]);
                    testOutputConfig.set('jsType', execTest.type);
                    this.testObject(funcDetails.get('testOutputConfig')[0], testOutputConfig, testObject, testObject);
                    execTest.passed = testOutputConfig.get('passed');
                }
            }

            if (!execTest.passed) execTest.resultMessage = 'No matching output found.';

            outDetails.push(new TestExecutionDetails(execTest));
        }

        //successCount = [...new Set(outDetails.map(x => x.get('typePassed')))].length;
        successCount = outDetails.reduce((accumulator, currentVal) => {
            if (typeof currentVal.get('passed') === 'boolean' && currentVal.get('passed')) accumulator += 1;
            return accumulator;
        }, 0);
        funcDetails.set('executionPassedTestCount', successCount);
        funcDetails.set('testedOutput', outDetails);
        funcDetails.set('executionPassed', execTest.passed);
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
                    }
                    else if (_.isFunction(paramConfig.acceptedValues[0])) {
                        let passed = TypeDefinitions.toBoolean(paramConfig.acceptedValues[0](testObject));
                        paramTest.set('passed', passed);
                    }
                }
            }
            else if (paramConfig.rejectedValues.length > 0) {
                if (paramConfig.rejectedValues.includes(testObject)) {
                    paramTest.set('passed', false);
                    if (_.isRegExp(paramConfig.rejectedValues[0]) && !paramConfig.rejectedValues[0].test(testObject))
                        paramTest.set('passed', true);
                }
            }
        }
        catch (e) {
            console.error(e.message);
        }
    }

    static testObject(paramConfig, paramTest, passedArgument, testObject) {
        let typeAccepted;

        if (paramConfig.type === 'array') {
            this.testArray(paramConfig, paramTest, passedArgument, testObject);
        }
        else {
            typeAccepted = TypeDefinitions.getTypeAccepted(`${paramTest.get("jsType")}=:${paramTest.get("subType")}`, testObject);
            paramTest.set('typePassed', typeAccepted.typeAccepted);
            paramTest.set('passed', false);

            try {
                let successCount = 0,
                    isOr = true,
                    requiredItems = paramConfig.required;

                if (_.isArray(paramConfig.required[0])) {
                    requiredItems = paramConfig.required[0];
                    isOr = false;
                }

                for (let j = 0; j < requiredItems.length; j++) {
                    let objectPath = requiredItems[j].propName.split('.'),
                        objectRef = passedArgument;

                    // get the value of the property referred by dot notation i.e. object.someProp.toCheck
                    for (let k = 0; k < objectPath.length; k++) {
                        if (!_.isEmpty(objectRef[objectPath[k]]) || objectRef.hasOwnProperty(objectPath[k])) {
                            objectRef = objectRef[objectPath[k]];
                        } else {
                            objectRef = undefined;
                            break;
                        }
                    }

                    let regexTest = requiredItems[j].regex?.test(objectRef),
                        funcTest = undefined,
                        dynaFunc = requiredItems[j].dynaFunc;

                    if (dynaFunc && _.isFunction(dynaFunc)) {
                        let idx = global.testingConfig.functionExclusionList.indexOf(dynaFunc.name);
                    }

                    if (requiredItems[j].values.length > 0 && requiredItems[j].values.includes(objectRef)) {
                        successCount++;
                    }
                    else if (regexTest) {
                        successCount++;
                    }
                    else if (funcTest) {
                        successCount++;
                    }
                    else if (requiredItems[j].values.length < 1 && _.isUndefined(regexTest) && _.isUndefined(funcTest) && TypeDefinitions.typeTests[requiredItems[j].type].typeFn(objectRef)) {
                        successCount++;
                    }

                    if (requiredItems[j].maskValue && _.isString(objectRef)) {
                        let endsCharCount = (objectPath.includes('password')) ? 0 : 1,
                            maskRef = UtilMethods.maskString(objectRef, endsCharCount),
                            tmpObj = passedArgument;

                        for (let i = 0; i < objectPath.length - 1; i++) {
                            const key = objectPath[i];
                            if (!tmpObj[key]) {
                                tmpObj[key] = {};
                            }
                            tmpObj = tmpObj[key];
                        }
                        tmpObj[objectPath[objectPath.length - 1]] = maskRef;
                        // console.log(passedArgument);
                    }
                }
                if (successCount === requiredItems.length || (isOr && successCount > 0)) {
                    paramTest.set('passed', true);
                }

            }
            catch (e) {
                console.error(e.message);
            }
        }
    }

    static testArray(paramConfig, paramTest, passedArgument, testObject) {
        let typeAccepted;

        try {
            typeAccepted = TypeDefinitions.getTypeAccepted(`${paramTest.get("jsType")}=:${paramTest.get("subType")}`, testObject);
            paramConfig.subType = typeAccepted.subType;
            paramTest.set('typePassed', typeAccepted.typeAccepted);
            paramTest.set('subTypePassed', typeAccepted.subTypeAccepted);

            if (typeAccepted.typeAccepted && typeAccepted.subType !== 'N/A') {
                if (typeAccepted.subTypeAccepted)
                    paramTest.set('passed', testObject.every(TypeDefinitions.typeTests[paramTest.get("subType")].typeFn))
                else
                    paramTest.set('passed', false);
            }
            else if (typeAccepted.typeAccepted && typeAccepted.subType === 'N/A') {
                paramTest.set('passed', true);
            }
            else {
                paramTest.set('passed', (typeAccepted.typeAccepted && typeAccepted.subTypeAccepted));
            }
        }
        catch (e) {
            console.error(e.message);
        }

        return paramTest.get('passed');
    }

    static testRequired(required, testObject) {
        if (!_.isArray(required) || _.isEmpty(testObject)) return false;
        let depthLevel = 0,
            propPath, propName, objectPath, objectQueryResponse;

        for (let i=0; i<required.length; i++) {
            propPath = required[i].propName;
            objectPath = propPath.split('.');
            depthLevel = objectPath.length;

            propName = _.takeRight(objectPath)[0];
            //options = Object.assign({ value: undefined, property: undefined, fn: undefined, results: [], path: [], depth: 1 }, (options || {}));
            objectQueryResponse = UtilMethods.queryObject(testObject, {property: propName, depth: depthLevel});
            if (objectQueryResponse) {
                console.log(objectQueryResponse);
            }
            else {
                console.warn(`Object query did not find ${propName}`);
            }
        }

        return true;
    }

}
