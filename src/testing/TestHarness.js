const _ = require('lodash');
const Test = require('./Test');
const UtilMethods = require('./UtilMethods');
const { Log } = require('../log');
const TypeDefinitions = require('./TypeDefinitions');

class TestHarness {

    static execFunctionCall(testConfig={}) {


        return function(target, thisArg, argumentsList) {

            let newTestRec,
                targetName = '',
                retVal, updatedTestConfig;

            if (!global.testingConfig.isTestingEnabled || !UtilMethods.shouldBeTested(UtilMethods.getClassName(thisArg), target.name)) {
                retVal = target.apply(thisArg, argumentsList);
            }
            else {
                updatedTestConfig = UtilMethods.getUpdatedTestConfig(target, thisArg, testConfig);
                targetName = updatedTestConfig?.targetName;

                if (!_.isEmpty(updatedTestConfig?.updatedTestConfig[targetName])) {
                    newTestRec = Test.setupFuncTest(thisArg,
                        target,
                        argumentsList,
                        new Error().stack.split('\n'),
                        updatedTestConfig?.updatedTestConfig,
                        targetName);
                }

                let start = Date.now();
                // Executes actual method and catches returned output
                retVal = target.apply(thisArg, argumentsList);
                let end = Date.now();

                if (!_.isUndefined(newTestRec)) {
                    let optionalVals = {
                        stopWatchStart: start,
                        stopWatchEnd: end,
                        executionResult: retVal
                    }
                    // Delays test processing so actual functionality can proceed and not be waiting for test results.
                    setImmediate((newTestRec, optionalVals) => {
                        Test.execFuncTest(thisArg, target, argumentsList, newTestRec, optionalVals);
                    }, newTestRec, optionalVals);
                }
            }
            return retVal;
        };
    }

    static proxyFunctions(trackedEntity, testConfigs) {
        // let normalFuncs = Object.getOwnPropertyNames(trackedEntity).filter(name => typeof trackedEntity[name] === 'function'),
        let staticFuncs = Object.getOwnPropertyNames(trackedEntity.constructor).filter(name => typeof trackedEntity.constructor[name] === 'function'),
            testConfig = (trackedEntity.constructor.testConfig) ? Object.keys(trackedEntity.constructor.testConfig) : [];

        if (testConfig?.length > 0) {
            for (let i=0; i<testConfig.length; i++) {
                let objRef = trackedEntity;
                if (staticFuncs.includes(testConfig[i])) {
                    objRef = trackedEntity.constructor;
                }

                if (_.isFunction(objRef[testConfig[i]])) {
                    objRef[testConfig[i]] = new Proxy(objRef[testConfig[i]], {
                        apply: this.execFunctionCall(testConfigs),
                    });
                }
                else {
                    Log.log('\n===============================');
                    Log.warn(`${testConfig[i]} might be a private function`);
                    Log.log('===============================\n');
                }
            }
        }
    }

    static prepareObject(obj, testConfig, options = {}) {
        const { trackFunctions } = options;
        if (trackFunctions) {
            this.proxyFunctions(obj, testConfig);
        }
        return obj;
    }

    static prepareClass(clazz, testConfig, options = {}) {
        TestHarness.prepareObject(clazz.prototype, testConfig, options);
        clazz.prototype.constructor = clazz;
        return new Proxy(clazz, {
            apply: this.execFunctionCall(testConfig)
        });
    }

    static handleFunction(trackedEntity, testConfig) {
        if (typeof trackedEntity === 'function' && TypeDefinitions.getFunctionType(trackedEntity) !== 'class') {
            trackedEntity = new Proxy(trackedEntity, {
                apply: this.execFunctionCall(testConfig),
            });
        }
        else {
            TestHarness.proxyFunctions(trackedEntity, testConfig);
        }
    }
}

module.exports = function(entity, testConfig={}, options = {trackFunctions: true}) {
    if (typeof entity === 'function' && TypeDefinitions.getFunctionType(entity) !== 'class')
        return TestHarness.handleFunction(entity, testConfig);
    else if (typeof entity === 'function')
        return TestHarness.prepareClass(entity, testConfig, options);

    return TestHarness.prepareObject(entity, testConfig, options);
}
