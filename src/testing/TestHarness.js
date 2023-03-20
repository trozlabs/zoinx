const _ = require('lodash');
const { Log } = require('../log');
// const { Test, UtilMethods } = require('./index');
const Test = require('./Test');
const UtilMethods = require('./UtilMethods');
const callerMap = {}

function trackFunctionCall(options = {}, testConfig={}) {
    return function(target, thisArg, argumentsList) {

        let newTestRec,
            targetName = '',
            retVal, updatedTestConfig;

        if (!global.testingConfig.isTestingEnabled) {
            retVal = target.apply(thisArg, argumentsList);
        }
        else {
            updatedTestConfig = UtilMethods.getUpdatedTestConfig(target, thisArg, testConfig);
            targetName = updatedTestConfig?.targetName;

            if (!_.isEmpty(updatedTestConfig?.updatedTestConfig[targetName]))
                newTestRec = Test.setupFuncTest(thisArg,
                    target,
                    argumentsList,
                    new Error().stack.split('\n'),
                    updatedTestConfig?.updatedTestConfig,
                    targetName);

            let start = Date.now(),
                end;
            // Executes actual method and catches returned output
            retVal = target.apply(thisArg, argumentsList);
            end = Date.now();

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

function trackPropertySet(options = {}, testConfig) {
    return function set(target, prop, value, receiver) {
        const { trackCaller, trackCount, stdout, filter } = options;
        const error = trackCaller && new Error();
        const caller = 'WHATTTTT'; // getCaller(error);
        const contextName = target.constructor.name === 'Object' ? '' : `${target.constructor.name}.`;
        const name = `${contextName}${prop}`;
        const hashKey = `set_${name}`;
        if (trackCount) {
            if (!callerMap[hashKey]) {
                callerMap[hashKey] = 1;
            } else {
                callerMap[hashKey]++;
            }
        }
        let output = `${name} is being set`;
        if (trackCaller) {
            output += ` by ${caller.name}`;
        }
        if (trackCount) {
            output += ` for the ${callerMap[hashKey]} time`;
        }
        let canReport = true;
        if (filter) {
            canReport = filter({
                type: 'get',
                prop,
                name,
                caller,
                count: callerMap[hashKey],
                value,
            });
        }
        if (canReport) {
            if (stdout) {
                stdout(output);
            } else {
                console.log(output);
            }
        }
        return Reflect.set(target, prop, value, receiver);
    };
}

function trackPropertyGet(options = {}, testConfig) {
    return function get(target, prop, receiver) {
        const { trackCaller, trackCount, stdout, filter } = options;
        if (typeof target[prop] === 'function' || prop === 'prototype') {
            return target[prop];
        }
        const error = trackCaller && new Error();
        const caller = 'Boom Digity'; // getCaller(error);
        const contextName = target.constructor.name === 'Object' ? '' : `${target.constructor.name}.`;
        const name = `${contextName}${prop}`;
        const hashKey = `get_${name}`;

        if (trackCount) {
            if (!callerMap[hashKey]) {
                callerMap[hashKey] = 1;
            } else {
                callerMap[hashKey]++;
            }
        }
        let output = `${name} is being get`;
        if (trackCaller) {
            output += ` by ${caller.name}`;
        }
        if (trackCount) {
            output += ` for the ${callerMap[hashKey]} time`;
        }
        let canReport = true;
        if (filter) {
            canReport = filter({
                type: 'get',
                prop,
                name,
                caller,
                count: callerMap[hashKey],
            });
        }
        if (canReport) {
            if (stdout) {
                stdout(output);
            } else {
                console.log(output);
            }
        }
        return target[prop];
    };
}

function proxyFunctions(trackedEntity, options) {
    if (typeof trackedEntity === 'function') return;
    Object.getOwnPropertyNames(trackedEntity).forEach((name) => {
        if (typeof trackedEntity[name] === 'function') {
            trackedEntity[name] = new Proxy(trackedEntity[name], {
                apply: trackFunctionCall(options),
            });
        }
    });
}

function trackObject(obj, testConfig, options = {}) {
    const { trackFunctions, trackProps } = options;
//debugger;
    let resultObj = obj;
    if (trackFunctions) {
        proxyFunctions(resultObj, testConfig, options);
    }
    if (trackProps) {
        resultObj = new Proxy(resultObj, {
            // get: trackPropertyGet(options, testConfig),
            // set: trackPropertySet(options, testConfig),
        });
    }
    return resultObj;
}

const defaultOptions = {
    trackFunctions: true,
    trackProps: true,
    trackTime: true,
    trackCaller: true,
    trackCount: true,
    filter: null,
};


function trackClass(cls, testConfig, options = {}) {
    cls.prototype = trackObject(cls.prototype, testConfig, options);
    cls.prototype.constructor = cls;

    return new Proxy(cls, {
        apply: trackFunctionCall(options, testConfig)
    });
}

module.exports = function(entity, testConfig={}, options = defaultOptions) {
    if (typeof entity === 'function') return trackClass(entity, testConfig, options);
    return trackObject(entity, testConfig, options);
}
