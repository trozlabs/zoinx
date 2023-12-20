const _ = require('lodash');
const util = require('node:util');
const fs = require('node:fs');
const os = require('node:os');


function debuglog(name) {
    return function enabled(isEnabled) {
        return function log(...args) {
            if (!isEnabled) return;
            console.debug(name, ...args);
        }
    }
}

function getIPv4Interfaces() {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = [];
    for (const interfaceName in networkInterfaces) {
        interfaces.push(...networkInterfaces[interfaceName]);
    }
    const results = interfaces.filter(i => (
        i.family === 'IPv4' && // Include IPv4
        i.address !== '127.0.0.1' && // Exclude loopback
        !i.address.startsWith('169.254.') // Exclude APIPA Address
    ));
    return results;
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getSystemInfo() {
    const [{ address }] = getIPv4Interfaces();
    return {
        address,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        freeMemory: formatBytes(os.freemem()),
    };
}

/**
 * Checks if an object has a property or not.
 * @param {object} obj
 * @param {string} key
 * @returns {boolean}
 */
function isObjectAndHasKey(obj, key) {
    return typeof obj === 'object' && obj?.hasOwnProperty(key) ? true : false;
}

/**
 * Makes sure all items in source are added to target when item
 * doesn't already exist.
 * @param {array} target
 * @param {array} source
 * @returns {void}
 */
function mergeArray(target=[], source=[]) {
    // console.log('mergeArray', { target, source });

    for (let index = 0; index < source.length; index++) {
        const sourceItem = source[index];
        const targetIndex = target.findIndex((targetItem) => targetItem == sourceItem);
        if (targetIndex < 0) {
            target.push(sourceItem);
        }
    }
}

/**
 * Merges objects inside an array by matching objects with matching
 * values in the property defined by `pk` param. If the object doesn't exist on
 * the target it will add the source arrays object to the target array.
 * @param {array} target - the array changes will be merged to
 * @param {array} source - the array changes will be merged from
 * @param {string} key - the property that should uniquely identify each object
 * @returns {void}
 */
function mergeArrayObjectsByKey(target, source, key='id') {
    for (let index = 0; index < source.length; index++) {
        const sourceItem = isObjectAndHasKey(source[index], key) ? source[index] : {};
        const targetItem = target.find((targetItem) =>
            isObjectAndHasKey(targetItem, key) && targetItem[key] === sourceItem[key]
        );

        if (targetItem) {
            Object.assign(targetItem, sourceItem);
        } else {
            target.push(sourceItem);
        }
    }
}

function deepMerge(target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                deepMerge(target[key], source[key]);
            }
            else if (Array.isArray(source[key])) {
                mergeArray(target[key], source[key]);
            }
            else {
                // If the key is not an object, update or add it to the target
                target[key] = source[key];
            }
        }
    }
    return target;
}

function watchConfigFile(filepath, target) {
    console.debug('[zoinx/log] watch config file...');

    try {
        const newConfig = readConfigFile(filepath);
        if (!_.isEqual(target, newConfig)) {
            deepMerge(target, newConfig);
            console.log(`[zoinx/log] Config loaded from ${filepath}:`, target);
        }
    } catch (err) {
        console.error(`[zoinx/log] Error reading or parsing ${filepath}:`, err);
    }

    // Watch for changes in the JSON file
    fs.watch(filepath, (eventType, filename) => {

        if (eventType === 'change') {
            console.debug(`[zoinx/log] Config file ${filename} changed.`);
            try {
                // Read and parse the updated JSON file
                const newConfig = readConfigFile(filepath);
                if (!_.isEqual(target, newConfig)) {
                    deepMerge(target, newConfig);
                    updateConfigFile(filepath, target);
                }
            } catch (err) {
                console.error(`Error reading or parsing ${filepath}:`, err);
            }
        }
    });
}

function readConfigFile(filepath) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function updateConfigFile(filepath, config={}) {
    try {
        const memoryConfig = config;
        const fileConfig = readConfigFile(filepath);

        if (!_.isEqual(memoryConfig, fileConfig)) {
            // return console.log(`Config in memory is the same as config in file.`, { memoryConfig, fileConfig });
            const json = JSON.stringify(memoryConfig, null, 4);
            fs.writeFileSync(filepath, json, { encoding: 'utf-8' });
        }
    }
    catch(e) {
        console.log(e);
    }
}

function diffObjects(a, b) {
    const diffs = {};

    function compareObjects(o1, o2, path = []) {
        for (const key in o1) {
            const currentPath = [...path, key];

            if (typeof o1[key] === 'object' && typeof o2[key] === 'object') {
                compareObjects(o1[key], o2[key], currentPath);
            } else {
                if (o1[key] !== o2[key]) {
                    diffs[currentPath.join('.')] = {
                        a: o1[key],
                        b: o2[key]
                    };
                }
            }
        }
        // Check for keys in b that are missing in a
        for (const key in o2) {
            const currentPath = [...path, key];

            if (o1[key] === undefined) {
                diffs[currentPath.join('.')] = {
                    a: undefined,
                    b: o2[key]
                };
            }
        }
    }

    compareObjects(a, b);

    return diffs;
}

module.exports = {
    debuglog,
    deepMerge,
    diffObjects,
    mergeArray,
    mergeArrayObjectsByKey,
    getIPv4Interfaces,
    formatBytes,
    getSystemInfo,
    watchConfigFile,
    updateConfigFile
};
