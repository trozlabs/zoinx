const _ = require('lodash');
const Log = require('../log');
const fs = require('fs');

module.exports = class UtilMethods {
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
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

    static getPrimitive(obj) {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        return _.isArray(obj) ? 'array' : typeof obj;
    }

    //this.queryObject(this.getJsonWithoutCirculars(automation.data, 8), {property: 'id'})
    static queryObject(obj, options) {
        options = Object.assign({ value: undefined, property: undefined, fn: undefined, results: [], path: [], depth: 1 }, options || {});

        let { value, property, fn, results, path, depth } = options;

        const array = Object.keys(this.getPrimitive(obj) === 'array' || this.getPrimitive(obj) === 'object' ? obj : {});

        for (let key of array) {
            const val = obj[key];
            const type = this.getPrimitive(val);

            if (type === 'array' || type === 'object') {
                results = this.queryObject(val, {
                    results,
                    value,
                    property,
                    path: path.concat(_.isNumber(key) ? `[${key}]` : `${key}`),
                    depth: depth + 1
                });
            } else {
                let useFn = typeof fn === 'function';
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

    static getJsonWithoutCirculars(obj, depth = 0) {
        let visitedMark = Symbol('VISITED_MARK'),
            MAX_CLEANUP_DEPTH = 10;

        if (_.isEmpty(obj)) return obj;

        // Skip condition - either object is falsy, was visited or we go too deep
        const shouldSkip = !obj || obj[visitedMark] || depth > MAX_CLEANUP_DEPTH;

        // Copy object (we copy properties from it and mark visited nodes)
        const originalObj = obj;
        let result = {};

        Object.keys(originalObj).forEach((entry) => {
            const val = originalObj[entry];

            if (!shouldSkip) {
                if (typeof val === 'object') {
                    // Value is an object - run object sanitizer
                    originalObj[visitedMark] = true; // Mark current node as "seen" - will stop from going deeper into circulars
                    const nextDepth = depth + 1;

                    let nextResult = this.getJsonWithoutCirculars(val, nextDepth);
                    if (!_.isEmpty(nextResult) && nextResult !== 'CIRCULAR' && nextResult !== 'SYMBOL ERROR') {
                        try {
                            nextResult = Object.fromEntries(Object.entries(nextResult).sort());
                        } catch (e) {
                            // sort() this a symbol inside larger browser objects, not certain yet how to best handle
                            // so this is a temporary catch to ensure the UI shows data and doesn't lag.
                            nextResult = 'SYMBOL ERROR';
                        }
                    }
                    result[entry] = nextResult;
                } else {
                    result[entry] = val;
                }
            } else {
                result = 'CIRCULAR';
            }
        });

        return result;
    }

    static readdirAsync(path) {
        return new Promise(function (resolve, reject) {
            fs.readdir(path, function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    static isRunningCLI(logOptions = false) {
        const [binaryPath, modulePath] = process.argv;
        const result = modulePath.includes('/.bin/');

        if (logOptions) {
            console.log('+++++++++++++++++++++++++++++++++++++++++');
            console.log({ binaryPath, modulePath });
            console.log(result ? 'Running as Shell Script' : 'Running as Application');
            console.log('+++++++++++++++++++++++++++++++++++++++++');
        }

        return result;
    }
};
