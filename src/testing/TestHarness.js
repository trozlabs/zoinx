const _ = require('lodash');
const Test = require('./Test');
const UtilMethods = require('./UtilMethods');
const { Log } = require('../log');
const TypeDefinitions = require('./TypeDefinitions');
const hrt = require('./HighResTimer');


const PROXIED = Symbol('proxied');
class TestHarness {

    static execFunctionCall(testConfig = {}) {
        return function(target, thisArg, argumentsList) {

            let newTestRec,
                targetName = '',
                retVal, updatedTestConfig;

            if (!global.testingConfig.isTestingEnabled ||
                !UtilMethods.shouldBeTested(UtilMethods.getClassName(thisArg), target.name)) {
                retVal = target.apply(thisArg, argumentsList);
            }
            else {
                updatedTestConfig = UtilMethods.getUpdatedTestConfig(target, thisArg, testConfig);
                targetName = updatedTestConfig?.targetName;

                let hrtTimer = new hrt(true);
                // Executes actual method and catches returned output
                if (TypeDefinitions.isFunctionAsync(target)) {
                    retVal = target.apply(thisArg, argumentsList).then();
                }
                else {
                    retVal = target.apply(thisArg, argumentsList);
                }
                hrtTimer.stop();

                if (!_.isEmpty(updatedTestConfig?.updatedTestConfig[targetName])) {
                    newTestRec = Test.setupFuncTest(thisArg,
                        target,
                        argumentsList,
                        new Error().stack.split('\n'),
                        updatedTestConfig?.updatedTestConfig,
                        targetName);

                    if (!_.isUndefined(newTestRec)) {
                        let optionalVals = {
                            stopWatchStart: hrtTimer.getStartTime(),
                            stopWatchEnd: hrtTimer.getEndTime(),
                            executionTimer: hrtTimer,
                            executionResult: retVal
                        }

                        // Delays test processing so actual functionality can proceed and not be waiting for test results.
                        setImmediate((newTestRec, optionalVals) => {
                            Test.execFuncTest(thisArg, target, argumentsList, newTestRec, optionalVals);
                        }, newTestRec, optionalVals);
                    }
                }
            }
            return retVal;
        };
    }

    static proxyFunctions(trackedEntity, testConfigs) {
        const staticFuncs = Object.getOwnPropertyNames(trackedEntity.constructor)
            .filter(name => typeof trackedEntity.constructor[name] === 'function');

        const testConfig = trackedEntity.constructor.testConfig
            ? Object.keys(trackedEntity.constructor.testConfig)
            : [];

        for (const fnName of testConfig) {
            let objRef = staticFuncs.includes(fnName)
                ? trackedEntity.constructor
                : trackedEntity;

            const fn = objRef[fnName];

            if (typeof fn !== 'function') {
                Log.warn(`${fnName} might be a private function`);
                continue;
            }

            if (fn[PROXIED]) continue;

            const proxy = new Proxy(fn, {
                apply: this.execFunctionCall(testConfigs)
            });

            proxy[PROXIED] = true;
            objRef[fnName] = proxy;
        }
    }

    static prepareObject(obj, testConfig, options = {}) {
        if (options.trackFunctions) {
            this.proxyFunctions(obj, testConfig);
        }
        return obj;
    }

    static prepareClass(clazz, testConfig, options = {}) {
        this.prepareObject(clazz.prototype, testConfig, options);
        clazz.prototype.constructor = clazz;

        return new Proxy(clazz, {
            apply: this.execFunctionCall(testConfig)
        });
    }

    static handleFunction(fn, testConfig) {
        if (fn[PROXIED]) return fn;

        const proxy = new Proxy(fn, {
            apply: this.execFunctionCall(testConfig)
        });

        proxy[PROXIED] = true;
        return proxy;
    }
}

module.exports = function (entity, testConfig = {}, options = { trackFunctions: true }) {
    if (typeof entity === 'function') {
        if (TypeDefinitions.getFunctionType(entity) !== 'class') {
            return TestHarness.handleFunction(entity, testConfig);
        }
        return TestHarness.prepareClass(entity, testConfig, options);
    }

    return TestHarness.prepareObject(entity, testConfig, options);
};
