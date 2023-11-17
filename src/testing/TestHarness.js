const _ = require('lodash');
const Test = require('./Test');
const UtilMethods = require('./UtilMethods');


class TestHarness {

    static execFunctionCall(options = {}, testConfig={}) {

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

    static proxyFunctions(trackedEntity, options) {
        if (typeof trackedEntity === 'function') return;
        Object.getOwnPropertyNames(trackedEntity).forEach((name) => {
            if (typeof trackedEntity[name] === 'function') {
                trackedEntity[name] = new Proxy(trackedEntity[name], {
                    apply: this.execFunctionCall(options),
                });
            }
        });
    }

    static prepareObject(obj, testConfig, options = {}) {
        const { trackFunctions } = options;
        if (trackFunctions) {
            this.proxyFunctions(obj, testConfig, options);
        }
        return obj;
    }

    static prepareClass(clazz, testConfig, options = {}) {
        TestHarness.prepareObject(clazz.prototype, testConfig, options);
        clazz.prototype.constructor = clazz;
        return new Proxy(clazz, {
            apply: this.execFunctionCall(options, testConfig)
        });
    }

}

module.exports = function(entity, testConfig={}, options = {trackFunctions: true, trackProps: false}) {
    if (typeof entity === 'function')
        return TestHarness.prepareClass(entity, testConfig, options);

    return TestHarness.prepareObject(entity, testConfig, options);
}
