const _ = require('lodash');
const { Log } = require('../log');
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
    //UtilMethods.queryObject(UtilMethods.getJsonWithoutCirculars(passedArguments[0],8), {property: paramConfig[0].required[0].propName})
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
            Log.info('+++++++++++++++++++++++++++++++++++++++++');
            Log.info({ binaryPath, modulePath });
            Log.info(result ? 'Running as Shell Script' : 'Running as Application');
            Log.info('+++++++++++++++++++++++++++++++++++++++++');
        }

        return result;
    }

    static isEmail(emailAddr) {
        let regex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'm');
        if (_.isEmpty(emailAddr) || !_.isString(emailAddr)) return false;
        return regex.test(emailAddr);
    }

    static isUUID(uuid) {
        let regex = new RegExp(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/, 'm');
        if (_.isEmpty(uuid) || !_.isString(uuid)) return false;
        return regex.test(uuid);
    }
    static isHttpURI(uri) {
        let regex = new RegExp(/^(https?:\/\/)((localhost|((\d{1,3}\.){3}\d{1,3})|(\[[0-9a-fA-F:]+\])|([\w-]+\.)+[a-zA-Z]{2,}))(:\d{1,5})?(\/[^\s?#]*)?(\?[^\s#]*)?(#[^\s]*)?$/, 'mg');
        if (_.isEmpty(uri) || !_.isString(uri)) return false;
        return regex.test(uri);
    }

    static StringToBoolean(value='false') {
        if (!_.isBoolean(value)) {
            if (_.isEmpty(value) || !_.isString(value))
                value = false;
            if (['true', 'false'].includes(value.toLowerCase())) {
                try {
                    value = JSON.parse(value);
                }
                catch (e) {
                    value = false;
                }
            }
        }
        return value;
    }

    static convertMs2TimeUnits(ms, stringOut=false, excludeCalendar=true) {
        if ( !Number.isInteger(ms) ) {
            return null
        }

        const allocate = msUnit => {
            const units = Math.trunc(ms / msUnit)
            ms -= units * msUnit
            return units
        }

        let output = {
            weeks: allocate(604800000),
            days: allocate(86400000),
            hours: allocate(3600000),
            minutes: allocate(60000),
            seconds: allocate(1000),
            ms: ms
        }

        if (excludeCalendar) {
            delete output.weeks;
            delete output.days;
        }

        if (stringOut) {
            let msOutput = output.ms;
            if (output.ms < 10) msOutput = msOutput + '00';
            else if (output.ms < 100) msOutput = msOutput + '0';
            return `${(output.hours < 10)?0:''}${output.hours}:${(output.minutes < 10)?0:''}${output.minutes}:${(output.seconds < 10)?0:''}${output.seconds}.${msOutput}`;
        }
        else {
            return output;
        }
    }

    static appendTimestamp(prefix, date=new Date()) {
        let YYYY = String(date.getFullYear()).padStart(4, '0'),
            MM = String(date.getMonth() + 1).padStart(2, '0'),
            DD = String(date.getDate()).padStart(2, '0'),
            hh = String(date.getHours()).padStart(2, '0'),
            mm = String(date.getMinutes()).padStart(2, '0'),
            ss = String(date.getSeconds()).padStart(2, '0'),
            ts = `${YYYY}-${MM}-${DD}_${hh}.${mm}.${ss}`;

        return prefix ? `${prefix}_${ts}` : ts;
    }

    static generateRandomRangedInteger(min, max) {
        return Math.floor(min + Math.random()*(max - min + 1))
    }
};
