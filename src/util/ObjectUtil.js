
/**
 * @typedef {object} SerialSafeValue
 * @property {string} type - The type of the value
 * @property {string|Array} data - The string compatible data (may be represented as array of strings)
 */

/**
 * @example
 *
 * var serialized = ObjectUtil.serialize({
 *     myUndefined: undefined,
 *     myMap: new Map([
 *         ['undefined', undefined],
 *         ['buffer', Buffer.from('My Buffer', 'utf-8')],
 *         ['bigint', BigInt('123')],
 *         ['set', new Set([1, 2, 3])],
 *         ['class', class MyClass {}],
 *     ]),
 * });
 * // output
 * {
 *     myUndefined: { type: 'Undefined', data: 'undefined' },
 *     myMap: {
 *          type: 'Map',
 *          data: {
 *              undefined: { type: 'Undefined', data: 'undefined' },
 *              buffer: { type: 'Buffer', data: [ 77, 121, 32, 66, 117, 102, 102, 101, 114 ] },
 *              bigint: { type: 'BigInt', data: '123' },
 *              set: { type: 'Set', data: [ 1, 2, 3 ] },
 *              class: { type: 'Function', data: 'MyClass' }
 *          }
 *      }
 * }
 *
 * // returns object to original structure as closely as possible.
 * var deserialized = ObjectUtil.deserialize(serialized);
 * deserialized.myMap.get('set').get(2);
 * // output
 * 2
 */
module.exports = class ObjectUtil {

    /**
     * Determines the max keys a object can have when it is seen as
     * SerialSafeValue object.
     */
    static SERIAL_SAFE_PLACEHOLDER_KEY_LENGTH = 2;

    /**
     * When serializing will be parsed into a format that can
     * be rebuilt during deserialization.
     */
    static SERIAL_SAFE_PLACEHOLDER_TYPES = [
        // excluded for now since the circular refs need to be handled after
        // placeholder types/values.
        // 'CircularRef',
        'Undefined',
        'Symbol',
        'BigInt',
        'Map',
        'Set',
        'Buffer',
        'GeneratorFunction',
        'AsyncFunction',
        'Function'
    ];

    /**
     * Takes an object with Circular References, Symbols, Functions, BigInts,
     * etc. and makes safe for cloning, transfer, stringification without
     * loosing all information.
     *
     * @param {object} value - the object to serialize
     * @param {Map} refs - used by recursion
     * @param {Array} paths - used by recursion
     * @returns {object} - a data transfer compatible object.
     */
    static serialize(value, refs = new Map(), paths = []) {
        let typeMeta = getTypeMeta(value);
        let result;

        switch (typeMeta.instanceOf) {
            case 'Array': {
                const entries = Object.entries(value);
                const o = [];
                for (let [k, v] of entries) {
                    // circular check
                    if (typeof v == 'object') {
                        if (refs.has(v)) {
                            o[k] = { type: 'CircularRef', data: refs.get(v) };
                        }
                        else {
                            const subPaths = [...paths, k];
                            refs.set(v, subPaths.join('.'));
                            o[k] = this.serialize(v, refs, subPaths);
                        }
                    }
                    else {
                        o[k] = this.serialize(v, refs, paths);
                    }
                }
                result = o;
                break;
            }
            case 'Object': {
                const entries = Object.entries(value);
                const o = {};

                for (let [k, v] of entries) {
                    // circular check
                    if (typeof v == 'object') {
                        if (refs.has(v)) {
                            o[k] = { type: 'CircularRef', data: refs.get(v) };
                        }
                        else {
                            const subPaths = [...paths, k];
                            refs.set(v, subPaths.join('.'));
                            o[k] = this.serialize(v, refs, subPaths);
                        }
                    }
                    else {
                        o[k] = this.serialize(v, refs, paths);
                    }
                }
                result = o;
                break;
            }
            case 'Map': {
                const entries = value.entries();
                const o = { type: 'Map', data: {} };
                for (let [k, v] of entries) {
                    // circular check
                    if (refs.has(v)) {
                        o.data[k] = { type: 'CircularRef', data: refs.get(v) };
                    }
                    else {
                        const subPaths = [...paths, k];
                        refs.set(v, subPaths.join('.'));
                        o.data[k] = this.serialize(v, refs, subPaths);
                    }
                }
                result = o;
                break;
            }
            case 'Set': {
                const entries = Object.entries(Array.from(value));
                const o = { type: 'Set', data: [] };
                for (let [k, v] of entries) {
                    // circular check
                    if (typeof v == 'object') {
                        if (refs.has(v)) {
                            o.data[k] = { type: 'CircularRef', data: refs.get(v) };
                        }
                        else {
                            const subPaths = [...paths, k];
                            refs.set(v, subPaths.join('.'));
                            o.data[k] = this.serialize(v, refs, subPaths);
                        }
                    }
                    else {
                        o.data[k] = this.serialize(v, refs, paths);
                    }
                }
                result = o;
                break;
            }
            case 'Buffer': {
                result = { type: 'Buffer', data: [...value] };
                break;
            }
            case 'Undefined': {
                result = { type: typeMeta.instanceOf, data: 'undefined' };
                break;
            }
            case 'Symbol': {
                result = { type: typeMeta.instanceOf, data: typeMeta.name };
                break;
            }
            case 'BigInt': {
                result = { type: typeMeta.instanceOf, data: value.toString() };
                break;
            }
            case 'Function':
            case 'AsyncFunction':
            case 'GeneratorFunction': {
                result = { type: typeMeta.instanceOf, data: typeMeta.name };
                break;
            }
            default: {
                result = value;
                break;
            }
        }

        return result;
    }

    /**
     * Takes in an object previously serialized and rebuilds
     * the original object as closely as possible. Functions will be restored
     * using placeholder functions that are not intended to be used.
     *
     * @param {object} obj - object to be deserialized
     * @returns {object} - deserialized object
     */
    static deserialize(obj) {
        obj = this.convertFromSerialSafeObject(obj);
        obj = this.resolveCircularRefs(obj);
        return obj;
    }

    /**
     * Converts values not typically compatible for serialization or JSON.
     * If the value doesn't need to be transformed into a special structure
     * the original value is returned.
     *
     * @param {string?} key - to make compatible as JSON.stringify replacer
     * @param {any} value - the value to convert to {SerialSafeValue}
     * @returns {(SerialSafeValue|any)}
     */
    static convertToSerialSafeValue(key, value) {
        let { name, type, instanceOf } = getTypeMeta(value);

        let data;

        switch (instanceOf) {
            case undefined:
            case 'Undefined':
                data = 'undefined';
                break;
            case 'Symbol':
                data = name;
                break;
            case 'BigInt':
                data = value.toString();
                break;
            case 'Map':
                data = [...value.entries()];
                break;
            case 'Set':
                data = [ ...value.values() ];
                break;
            case 'Buffer':
            case 'Uint8Array':
                data = [ ...value ]
                break;
            case 'GeneratorFunction':
            case 'AsyncFunction':
            case 'Function':
                data = name;
                break;
            default:
                break;
        }

        return data ? { type, data } : value;
    }

    /**
     * Takes an object and finds any `SerialSafeValue`s.
     *
     * @param {object} obj - the serialization compatible object.
     * @returns {object} - the restored object.
     */
    static convertFromSerialSafeObject(obj) {
        let entries = obj?.entries ? obj.entries() : Object.entries(obj);

        for (let [key, val] of entries) {
            if (val !== null && typeof val === 'object') {
                if (this.isSerialSafePlaceholder(val)) {
                    obj[key] = this.convertFromSerialSafeValue(val);
                }
                else {
                    obj[key] = this.convertFromSerialSafeObject(val);
                }
            }
        }
        return obj;
    }

    /**
     * Restores `SerialSafeValue`s to their original type. (Functions get restored
     * with a placeholder).
     *
     * @param {SerialSafeValue} obj - the serialization compatible value.
     * @returns {any} - the restored typed value.
     * @example
     *  var obj = {
     *      myBuffer: Buffer.from('1st', 'utf-8'),
     *      myBigInt: 123456789012345678901234567890n,
     *  };
     *
     *  console.log(DataObjectUtil.convertFromSerialSafeValue(obj));
     *  //  {
     *  //      myBuffer: {
     *  //          type: 'Buffer',
     *  //          data: [ 72, 101, 108, 108, 111, 44, 32, 66, 117, 102, 102, 101, 114, 33 ]
     *  //      },
     *  //      myBigInt: {
     *  //          type: 'BigInt',
     *  //          data: '123456789012345678901234567890'
     *  //      }
     *  //  }
     */
    static convertFromSerialSafeValue(obj) {
        if (!this.isSerialSafePlaceholder(obj)) {
            console.warn('is not a converted value', obj);
            return obj;
        }

        let { type, data } = obj;
        let val;

        switch (type) {
            case 'Undefined':
                val = undefined;
                break;
            case 'Symbol':
                val = Symbol(data);
                break;
            case 'BigInt':
                val = BigInt(data);
                break;
            case 'Map':
                // since the map is it's self a serial safe value, BUT,
                // can contain serial safe values, let's convert those if any exist.
                val = new Map(Object.entries(this.convertFromSerialSafeObject(data)));
                break;
            case 'Set':
                // similar to Map, but we don't need to convert the data format.
                val = new Set(this.convertFromSerialSafeObject(data));
                break;
            case 'Buffer':
                val = Buffer.from(data);
                break;
            case 'GeneratorFunction':
                val = CLONED_GENERATOR_FUNCTION_PLACEHOLDER;
                break;
            case 'AsyncFunction':
                val = CLONED_ASYNC_FUNCTION_PLACEHOLDER;
                break;
            case 'Function':
                val = CLONED_FUNCTION_PLACEHOLDER;
                break;
            default:
                val = obj;
                break;
        }

        return val;
    }

    /**
     * Extract a value from an object using a object path string.
     * @param {string} path the path where the value can be found.
     * @param {obj} obj the object to extract the value from
     * @returns {any}
     * @example
     *  var obj = {
     *      name: 'root object',
     *      children: [{
     *          id: 100,
     *          grandchildren: [{
     *              id: 101,
     *              name: 'Grand Child 1'
     *          }]
     *      }, {
     *          id: 200,
     *          grandchildren: [{
     *              id: 201,
     *              name: 'Grand Child 2'
     *          }]
     *      }]
     *  };
     *  var nameOfGrandChild = ObjectUtil.getObjectValueByKeyPath(
     *      'children.1.grandchildren.0.name',
     *      obj
     *  );
     */
    static getObjectValueByKeyPath(path='', obj={}) {
        let keys = path.split('.');
        return keys.reduce((res, key) => {
            if (res instanceof Map) {
                return res.get(key);
            } else if (res?.hasOwnProperty(key)) {
                return res[key];
            }
        }, obj);
    }

    /**
     * Checks if a value is an object, has only two keys (type, data)
     * and the type is one of `ObjectUtil.SERIAL_SAFE_PLACEHOLDER_TYPES`
     * @param {any} obj - the value to test
     * @return {boolean}
     */
    static isCircularRefPlaceholder(obj) {
        return obj?.type === 'CircularRef';
    }

    /**
     * Checks if value is a {SerialSafeValue}
     * @param {any} obj - the value to test
     * @return {boolean}
     */
    static isSerialSafePlaceholder(obj = {}) {
        let keys = Object.keys(obj);

        let hasLength2 = keys.length == (this.SERIAL_SAFE_PLACEHOLDER_KEY_LENGTH ?? 2);
        if (!hasLength2) return false;

        let hasTypeAndData = obj?.hasOwnProperty('type') && obj?.hasOwnProperty('data');
        if (!hasTypeAndData) return false;

        let hasSerialPlaceholderSupportedType = this.SERIAL_SAFE_PLACEHOLDER_TYPES.includes(obj?.type);
        if (!hasSerialPlaceholderSupportedType) return false;

        return true;
    }

    /**
     * Useful for dumping objects to console.
     * @param {any} obj - the value to inspect
     * @return {string}
     */
    static inspectObject(obj) {
        return require('util').inspect(obj, {
            depth: 100,
            colors: true,
            compact: false,
            showHidden: false,
            maxArrayLength: null,
        })
    }

    /**
     * Replaces Circular References with a pointer to the original reference
     * `{ type: 'CircularRef', data: 'path.to.original.object' }` in
     * the `obj` object.
     *
     * @param {object} obj - the object to be modified
     * @param {Map<object, string>?} refs - used by recursion
     * @param {string[]?} paths - used by recursion
     *
     * @returns {object} the input object
     */
    static removeCircularRefs(obj={}, refs=new Map(), paths=[]) {
        if (!obj) return obj;

        let objMeta = getTypeMeta(obj);
        let entries = objMeta.type === 'Map' ? obj.entries() : Object.entries(obj);

        for (let [key, val] of entries) {
            if (val !== null && typeof val === 'object') {
                if (refs.has(val)) {
                    obj[key] = { type: 'CircularRef', data: refs.get(val) };
                }
                else {
                    const subPaths = [...paths, key];
                    refs.set(val, subPaths.join('.'));
                    obj[key] = this.removeCircularRefs(val, refs, subPaths);
                }
            }
        }
        return obj;
    }

    /**
     * Resolves circular references found when the value contains
     * `{ type: 'CircularRef', data: 'path.to.original.object' }`
     *
     * @param {object} obj - object to resolve ciricular references
     * @param {object} source - used by recursion to allow nested objects to have access to root object
     * @returns {object} - input object resolved
     */
    static resolveCircularRefs(obj={}, source) {
        source = source ?? obj;

        let entries = obj?.entries ? obj.entries() : Object.entries(obj);

        for (let [key, val] of entries) {

            if (val !== null && typeof val === 'object') {

                if (val.type === 'CircularRef' && val.data) {
                    if (obj instanceof Map) {
                        obj.set(key, this.getObjectValueByKeyPath(val.data, source));
                    }
                    else {
                        obj[key] = this.getObjectValueByKeyPath(val.data, source);
                    }
                }
                else {
                    if (obj instanceof Map) {
                        obj.set(key, this.resolveCircularRefs(val, source));
                    }
                    else {
                        obj[key] = this.resolveCircularRefs(val, source);
                    }
                }
            }
        }
        return obj;
    }
}

/**
 * Might need to be moved to another sub package.
 */
function getTypeMeta(value) {
    let tag = Object.prototype.toString.call(value);
    let type = tag.slice(8, -1);
    let instanceOf = value?.constructor?.name ?? type;
    let subType = '';
    let primitive = typeof value;
    let name = value?.name ?? instanceOf;

    switch(type) {
        case 'Null': {
            // name = 'Null';
            break;
        }
        case 'Undefined': {
            // name = 'Undefined';
            break;
        }
        case 'BigInt': {
            subType = 'Integer';
            break;
        }
        case 'Number': {
            let number = Number(value);
            let isNumber = !Number.isNaN(Number.parseFloat(number)) && !Number.isNaN(number - 0);
            let isInteger = isNumber && number % 1 === 0;
            subType = isNumber ? (isInteger ? 'Integer' : 'Float') : '';
            break;
        }
        case 'Symbol': {
            name = value?.description ?? '';
            break;
        }
        case 'Function': {
            let toString = String(value);
            type = toString.startsWith('class') ? 'Class' : 'Function';
            break;
        }
    }

    return {
        tag,
        name,
        type,
        subType,
        instanceOf,
        primitive
    };
}

function CLONED_FUNCTION_PLACEHOLDER() {
    throw new Error(`Deserialization placeholder function`);
}

function *CLONED_GENERATOR_FUNCTION_PLACEHOLDER() {
    throw new Error(`Deserialization placeholder generator function`);
}

async function CLONED_ASYNC_FUNCTION_PLACEHOLDER() {
    throw new Error(`Deserialization placeholder async function`);
}
