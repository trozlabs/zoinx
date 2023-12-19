const crypto = require('node:crypto');
const regex = require('./regex.js');

/**
 * @typedef {Object} ParsedFunction
 * @property {string} id - uuid
 * @property {string} timestamp
 * @property {string} scope - the name of the scope object
 * @property {null|ParsedErrorStacktraceLine} caller -
 * @property {null|ParsedErrorStacktraceLine} callee - if found, the calling function
 * @property {string} name -
 * @property {Map<string, ParsedFunctionArgument>} args
 * @property {string} fnSignature
 * @property {ParsedErrorStacktrace} stack
 */

/**
 * @typedef {Object} ParsedFunctionArgument
 * @property {string} name - the name of the argument
 * @property {number} index - index it appeared
 * @property {string} signature - the raw string
 * @property {string} functionName - the function name it belongs
 * @property {any} defaultValue - when a default value is defined
 * @property {any} defaultType - assumes type based on default value
 * @property {any} defaultPrimitive - primtive type of default value
 * @property {any} value - the actual value or the default value
 * @property {any} valueType - the type of the value
 * @property {any} valuePrimitive - the primitive type of the value.
 */

/**
 * @typedef {Object} ParsedFunctionSignature
 * @property {string} name
 * @property {string} signature
 * @property {string} source
 */


/**
 * Parses a function reference into an object. If you pass in
 * the function arguments or an array of args it will match those
 * to the argument names.
 *
 * @param {Function} fn
 * @param {(Arguments|Array)} fnArguments
 * @param {Object} scopeContext
 * @returns {ParsedFunction}
 */
function parseFunction(fn, fnArguments = [], scopeContext) {
    const parsedError = parseError(new Error())
    const parsedFn = parseFunctionSignature(fn)
    const args = new Map()
    const scope = scopeContext?.constructor.name ?? 'global';
    const fnSignature = parsedFn?.signature ?? '';
    const fnArgumentsSignature = fnSignature.split(regex.FUNCTION_SIGNATURE)[0].split(regex.BETWEEN_BANANAS)[2];
    const fnArgumentsSignatureList = fnArgumentsSignature?.match(regex.FUNCTION_ARGUMENTS_SIGNATURES) ?? [];
    const fnArgumentsMaxLength = Math.max(fnArguments.length, fnArgumentsSignatureList.length)

    const stack = parsedError.stacktrace.slice(1, parsedError.stacktrace.length-1)

    for (let fnArgumentIndex = 0; fnArgumentIndex < fnArgumentsMaxLength; fnArgumentIndex++) {

        const argumentSignature = fnArgumentsSignatureList[fnArgumentIndex] || '';
        const [ argumentName, argumentDefaultValueString ] = argumentSignature.split('=');

        const functionName = fn.name;
        const signature = argumentSignature;
        const index = fnArgumentIndex;
        const name = (argumentName?.trim() || String(index)).replace('...', '');

        const defaultValueString = argumentDefaultValueString;
        const defaultValue = (new Function(` try { return ${argumentDefaultValueString}; } catch (e) { return "${defaultValueString}"; }`))();
        const defaultType = defaultValue?.constructor?.name;
        const defaultPrimitive = typeof defaultValue;

        const value = fnArguments[fnArgumentIndex] ?? defaultValue;
        const valueType = value && value?.constructor?.name;
        const valuePrimitive = typeof value;

        // if the argument index is less than the number of arguments in
        // the function signature then we consider it expected.
        //const isExpected = fnArgumentIndex < fnArgumentsSignatureList.length
        // if there's a default value assigned to the argument then we
        // infer the expected type from the default value. If the type is undefined
        // then expected type is any type.
        //const isExpectedType = defaultType != undefined ? value == defaultValue : true;
        //const isExpectedPrimitive = defaultPrimitive != 'undefined' ? valuePrimitive == defaultPrimitive : true;

        args.set(name, {
            name,
            index,
            signature,
            functionName,
            defaultValue,
            defaultType,
            defaultPrimitive,
            value,
            valueType,
            valuePrimitive
        })
    }

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const callee = stack[1] ?? null;
    const caller = stack[2] ?? null;
    const name = parsedFn.name;

    return {
        id,
        timestamp,
        scope,
        caller,
        callee,
        name,
        args,
        fnSignature,
        stack,
        toString() {
            return JSON.stringify(this, (key, val) => {
                if (val instanceof Map) {
                    const obj = {};
                    for (let [k,v] of val.entries()) {
                        obj[k] = v;
                    }
                    return obj;
                }
                return val;
            }, 4);
        }
    }
}

/**
 * Extracts the name and arguments from a function reference.
 *
 * @param {Function} fn
 * @returns {ParsedFunctionSignature}
 */
function parseFunctionSignature(fn) {
    // console.log(fn);
    const fnString = String(fn);
    // console.log(fnString);
    const singleLineFnString = fnString.replace(regex.EXCESSIVE_WHITESPACE, ' ');
    const [ match ] = (singleLineFnString?.match(regex.FUNCTION_METHOD_ARROW_SIGNATURE) ?? []);

    if (!match) {
        // throw new Error(`Unable to extract function signature from \n${fnString}`);
        return console.warn(`Unable to extract function signature from \n${fnString}`);
    }

    const name = fn.name;
    const signature = match.trim();
    const source = fn.toString().replace(regex.EXCESSIVE_WHITESPACE, ' ')

    return {
        name,
        signature,
        source
    }
}

/**
 * @typedef {object} ParsedError
 * @property {string} name
 * @property {string} message
 * @property {ParsedError} cause
 * @property {ParsedErrorStacktrace} stacktrace
 */

/**
 * @typedef {ParsedErrorStacktraceLine[]} ParsedErrorStacktrace
 */

/**
 * @typedef {object} ParsedErrorStacktraceLine
 * @property {string} function
 * @property {string} filename
 * @property {number} line
 * @property {number} column
 */

/**
 * Parses an error into a structured object.
 *
 * @param {Error} error - the error instance
 * @returns {ParsedError}
 */
function parseError(error) {
    if (!error) return null;

    const name = error?.name;
    const message = error?.message;
    const stack = error?.stack;
    const cause = parseError(error?.cause);
    const stacktrace = parseErrorStacktrace(stack);

    return {
        name,
        message,
        stacktrace,
        cause
    }
}

/**
 * Parses a error's stacktrace string into an array of objects.
 *
 * @param {string} stack - the error stacktrace
 * @returns {ParsedErrorStacktrace}
 */
function parseErrorStacktrace(stack='') {
    if (!stack) return null;

    const lines = stack.split("\n");
    return lines.map(line => {
        const parts = line.match(regex.ERROR_STACKTRACE_LINE);
        return (!parts) ? null : {
            function: parts[1],
            filename: parts[2],
            line: parseInt(parts[3], 10),
            column: parseInt(parts[4], 10)
        }
    }).filter(obj => {
        return obj && !obj.filename.startsWith('node:internal');
    });
}


/**
 * @typedef {Object} TypeMeta
 * @property {string} name
 * @property {string} type
 * @property {string} subType
 * @property {string} instanceOf
 * @property {string} primitive
 */


/**
 * Get different type data about a value. Since the concept of a type
 * in javascript can be a little fuzzy the goal is satisfy the needs of
 * most use cases.
 *
 * @param {any} value - the value to get type info
 * @return {TypeMeta}
 *
 * @example
 * console.log(getTypeMeta(1.1));
 * {
 *   tag: '[object Number]',
 *   name: 'Number',
 *   type: 'Number',
 *   subType: 'Float',
 *   instanceOf: 'Number',
 *   primitive: 'number'
 * }
 *
 * console.log(getTypeMeta([]));
 * {
 *   tag: '[object Array]',
 *   name: 'Array',
 *   type: 'Array',
 *   subType: '',
 *   instanceOf: 'Array',
 *   primitive: 'object'
 * }
 */
function getTypeMeta(value) {
    let tag = Object.prototype.toString.call(value);
    let type = tag.slice(8, -1);
    let instanceOf = value?.constructor?.name || type;
    let subType = '';
    let primitive = typeof value;
    let name = value?.name ?? instanceOf;

    /**
     * handle special conditions
     */
    switch(type) {
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
            if (!name) name = 'Anonymous';
            break;
        }
        case 'Array': {
            subType = getArrayType(value);
            break;
        }
        case 'Object': {
            if (String(value?.constructor) == 'class {}') {
                instanceOf = 'Anonymous';
            }
            break;
        }
    }

    return {
        name,
        type,
        subType,
        instanceOf,
        primitive
    };
}

/**
 * Will check and array's children to determine a type. If multiple
 * types are found 'Mixed' will be returned
 *
 * @param {Array} array - the array to check content types
 * @return {string} the type determined or 'Mixed'
 */
function getArrayType(array) {
    const uniqueItems = [ ...new Set(array) ];
    const uniqueItemsTypes = uniqueItems.map(v => getTypeMeta(v).type);
    const uniqueTypes = [ ...new Set(uniqueItemsTypes) ];
    const arrayType = (uniqueTypes.length > 1 ? 'Mixed' : uniqueTypes[0]) ?? 'Mixed';
    return arrayType;
}

module.exports = {
    parseFunction,
    parseFunctionSignature,
    parseError,
    parseErrorStacktrace,
    getTypeMeta,
    getArrayType
}
