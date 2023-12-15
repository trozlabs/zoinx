const { getTypeMeta, getArrayType, parseFunction, parseFunctionSignature, parseError, parseErrorStacktrace } = require('../inspect');

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
     * Safety net for infinite recursion.
     */
    static #MAX_RECURSION_DEPTH = 10;

    /**
     * Determines the max keys a object can have when it is seen as
     * SerialSafeValue object.
     */
    static #SERIAL_SAFE_PLACEHOLDER_KEY_LENGTH = 2;

    /**
     * When serializing will be parsed into a format that can
     * be rebuilt during deserialization.
     */
    static #SERIAL_SAFE_PLACEHOLDER_TYPES = [
        // excluded for now since the circular refs need to be handled after
        // placeholder types/values.
        // 'CircularRef',
        'Undefined',
        'Symbol',
        'Map',
        'Set',
        'BigInt',
        'GeneratorFunction',
        'AsyncFunction',
        'Function',
        'Class',
        'RegExp',
        'Int8Array',
        'Uint8Array',
        'Uint8ClampedArray',
        'Int16Array',
        'Uint16Array',
        'Int32Array',
        'Uint32Array',
        'Float32Array',
        'Float64Array',
        'BigInt64Array',
        'BigUint64Array',
        'ArrayBuffer',
        'Buffer',
        'Module',
        // 'global'
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
        // console.log('serialize', ...paths);
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
            case 'RegExp': {
                result = {
                    type: typeMeta.instanceOf,
                    data: {
                        source: value.source,
                        flags: value.flags
                    }
                };
                break;
            }
            case 'Undefined': {
                result = { type: typeMeta.instanceOf, data: 'undefined' };
                break;
            }
            case 'Symbol': {
                result = { type: typeMeta.instanceOf, data: value.description };
                break;
            }
            case 'BigInt': {
                result = { type: typeMeta.instanceOf, data: value.toString() };
                break;
            }
            case 'Function':
            case 'AsyncFunction':
            case 'GeneratorFunction': {
                result = {
                    type: typeMeta.type === 'Class' ? typeMeta.type : typeMeta.instanceOf,
                    data: typeMeta.name
                };
                break;
            }
            case 'Buffer': {
                result = { type: 'Buffer', data: [...value] };
                break;
            }
            case 'Int8Array':
            case 'Uint8Array':
            case 'Uint8ClampedArray':
            case 'Int16Array':
            case 'Uint16Array':
            case 'Int32Array':
            case 'Uint32Array':
            case 'Float32Array':
            case 'Float64Array':
            case 'BigInt64Array':
            case 'BigUint64Array': {
                result = {
                    type: typeMeta.instanceOf,
                    data: this.serialize(Array.from(value.values()), refs, paths)
                };
                break;
            }
            case 'ArrayBuffer': {
                result = {
                    type: typeMeta.instanceOf,
                    data: {
                        maxByteLength: value.maxByteLength,
                        byteLength: value.byteLength
                    }
                };
                break;
            }
            case 'Module': {
                result = {
                    type: typeMeta.instanceOf,
                    data: 'module'
                }
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
    static deserialize(obj, depth=1) {
        // console.log('deserialize', depth);

        if (this.isSerialSafePlaceholder(obj)) {
            return this.convertFromSerialSafePlaceholder(obj);
        }

        const objTypes = getTypeMeta(obj);

        if (objTypes.primitive === 'object') {
            const entries = obj?.entries ? obj.entries() : Object.entries(obj);

            for (let [key, val] of entries) {
                if (val && typeof val === 'object') {
                    obj[key] = this.deserialize(val, depth+1);
                }
            }
        }

        if (depth === 1) {
            obj = this.resolveCircularRefs(obj);
        }

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
    static convertToSerialSafePlaceholder(key, value) {
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
    static convertFromSerialSafeObject(obj, depth=1) {

        if (this.isSerialSafePlaceholder(obj)) {
            return this.convertFromSerialSafePlaceholder(obj);
        }

        const entries = obj?.entries ? obj.entries() : Object.entries(obj);

        for (let [key, val] of entries) {
            let valTypes = getTypeMeta(val);

            if (depth >= this.#MAX_RECURSION_DEPTH) {
                console.warn(`convertFromSerialSafeObject max recursion depth hit`, depth);
                continue;
            }

            if (valTypes.primitive === 'object') {
                let deserializedVal = this.convertFromSerialSafeObject(val, depth+1);

                if (obj instanceof Set) {
                    obj.delete(val);
                    obj.add(deserializedVal);
                }
                if (obj instanceof Map) {
                    obj.set(key, deserializedVal);
                }
                if (obj instanceof Object) {
                    obj[key] = deserializedVal;
                }
                if (obj instanceof Array) {
                    obj[key] = deserializedVal;
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
     *  console.log(DataObjectUtil.convertFromSerialSafePlaceholder(obj));
     *  {
     *      myBuffer: {
     *          type: 'Buffer',
     *          data: [ 72,101,108,108,111,44,32,66,117,102,102,101,114,33 ]
     *      },
     *      myBigInt: {
     *          type: 'BigInt',
     *          data: '123456789012345678901234567890'
     *      }
     *  }
     */
    static convertFromSerialSafePlaceholder(obj = {}) {
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
            case 'RegExp':
                val = new RegExp(data.source, data.flags);
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
                val = new Map(Object.entries(this.deserialize(data)));
                break;
            case 'Set':
                val = new Set(this.deserialize(data));
                break;
            case 'Buffer':
                val = Buffer.from(data);
                break;
            case 'Class':
                val = new Function(`return class ${data} {
                    constructor() {
                        throw new Error("Deserialization placeholder class");
                    }
                }`)();
                break;
            case 'GeneratorFunction':
                val = new Function(`return function *${data}() {
                    throw new Error("Deserialization placeholder generator function");
                }`)();
                break;
            case 'AsyncFunction':
                val = new Function(`return async function ${data}() {
                    throw new Error("Deserialization placeholder async function");
                }`)();
                break;
            case 'Function':
                val = new Function(`return function ${data}() {
                    throw new Error("Deserialization placeholder function");
                }`)();
                break;
            case 'Int8Array':
                val = Int8Array.from(data);
                break;
            case 'Uint8Array':
                val = Uint8Array.from(data);
                break;
            case 'Uint8ClampedArray':
                val = Uint8ClampedArray.from(data);
                break;
            case 'Int16Array':
                val = Int16Array.from(data);
                break;
            case 'Uint16Array':
                val = Uint16Array.from(data);
                break;
            case 'Int32Array':
                val = Int32Array.from(data);
                break;
            case 'Uint32Array':
                val = Uint32Array.from(data);
                break;
            case 'Float32Array':
                val = Float32Array.from(data);
                break;
            case 'Float64Array':
                val = Float64Array.from(data);
                break;
            case 'BigInt64Array':
                val = BigInt64Array.from(this.deserialize(data));
                break;
            case 'BigUint64Array':
                val = BigUint64Array.from(this.deserialize(data));
                break;
            case 'ArrayBuffer':
                val = new ArrayBuffer(data.byteLength, data);
                break;
            case 'Module':
                val = data;
                break;
            default:
                val = obj;
                break;
        }

        return val;
    }

    /**
     * Extract a value from an object using a object path string.
     * Paths can include Maps, Array, Sets, etc.
     *
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
        // console.log(path);
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
     * and the type is one of `ObjectUtil.#SERIAL_SAFE_PLACEHOLDER_TYPES`
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
        if (obj === undefined || obj === null) return false;

        let keys = Object.keys(obj);

        let hasLength2 = keys.length == (this.#SERIAL_SAFE_PLACEHOLDER_KEY_LENGTH ?? 2);
        if (!hasLength2) return false;

        let hasTypeAndData = obj?.hasOwnProperty('type') && obj?.hasOwnProperty('data');
        if (!hasTypeAndData) return false;

        let hasSerialPlaceholderSupportedType = this.#SERIAL_SAFE_PLACEHOLDER_TYPES.includes(obj?.type);
        if (!hasSerialPlaceholderSupportedType) return false;

        return true;
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
        if (!obj || typeof obj !== 'object') return obj;

        const entries = obj?.entries ? obj.entries() : Object.entries(obj);

        for (let [key, val] of entries) {

            // if val is an non null object
            //
            if (val !== null && typeof val === 'object') {

                // check refs if val has already be captured and if so
                // replace with a CircularRef placeholder.
                //
                if (refs.has(val)) {
                    obj[key] = { type: 'CircularRef', data: refs.get(val) };
                }
                // pass current object path down to recursive call
                // and any refs collected.
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
    static resolveCircularRefs(obj={}, source, depth=1) {
        if (!obj || typeof obj !== 'object') return obj;

        source = source ?? obj;

        const entries = obj?.entries ? obj.entries() : Object.entries(obj);

        for (let [key, val] of entries) {

            if (val !== null && typeof val === 'object') {

                // stop when max depth hit or else this
                // could go on forever.
                //
                if (depth >= this.#MAX_RECURSION_DEPTH) {
                    // console.warn(`resolveCircularRefs max recursion depth hit`, depth);
                    continue;
                }

                // replace { type: 'CircularRef', data: 'path.to.obj' }
                // with the object it references.
                //
                if (this.isCircularRefPlaceholder(val)) {
                    let ref = this.getObjectValueByKeyPath(val.data, source);
                    if (ref) val = ref;
                }

                // if it has nested values recursively resolve and
                // set the value to the object, array or map.
                //
                if (val && obj instanceof Map) {
                    obj.set(key, this.resolveCircularRefs(val, source, depth+1));
                }
                else if (val && obj instanceof Set) {
                    obj.add(this.resolveCircularRefs(val, source, depth+1));
                }
                else if (val && obj instanceof Array) {
                    obj[key] = this.resolveCircularRefs(val, source, depth+1);
                }
                else if (val && obj instanceof Object) {
                    obj[key] = this.resolveCircularRefs(val, source, depth+1);
                }
            }
        }

        return obj;
    }

    /**
     * Useful for dumping objects to console.
     * @param {any} obj - the value to inspect
     * @return {string}
     */
    static inspectObject(obj, options={}) {
        return require('util').inspect(obj, Object.assign({
            depth: 100,
            colors: true,
            compact: false,
            showHidden: false,
            maxArrayLength: null,
            sorted: false
        }, options));
    }
}
