const crypto = require('node:crypto');
const regex = require('./regex.js');

function parseFunction(fn, fnArguments = [], scopeContext) {

    const parsedError = parseError(new Error())
    const parsedFn = parseFunctionSignature(fn)
    const args = new Map()
    const scope = scopeContext?.constructor.name ?? 'global';
    const fnSignature = parsedFn.signature
    const fnArgumentsSignature = fnSignature.split(regex.FUNCTION_SIGNATURE)[0].split(regex.BETWEEN_BANANAS)[2]
    const fnArgumentsSignatureList = fnArgumentsSignature.match(regex.FUNCTION_ARGUMENTS_SIGNATURES)
    const fnArgumentsMaxLength = Math.max(fnArguments.length, fnArgumentsSignatureList.length)

    const stack = parsedError.stacktrace.slice(1, parsedError.stacktrace.length-1)

    for (let fnArgumentIndex = 0; fnArgumentIndex < fnArgumentsMaxLength; fnArgumentIndex++) {

        const argumentSignature = fnArgumentsSignatureList[fnArgumentIndex] || ''
        const [ argumentName, argumentDefaultValueString ] = argumentSignature.split('=')

        const functionName = fn.name
        const signature = argumentSignature
        const index = fnArgumentIndex
        const name = (argumentName?.trim() || String(index)).replace('...', '');

        const defaultValueString = argumentDefaultValueString;
        const defaultValue = (new Function(` try { return ${argumentDefaultValueString}; } catch (e) { return "${defaultValueString}"; }`))()
        const defaultType = defaultValue?.constructor?.name
        const defaultPrimitive = typeof defaultValue

        const value = fnArguments[fnArgumentIndex] ?? defaultValue
        const valueType = value && value?.constructor?.name
        const valuePrimitive = typeof value

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

function parseFunctionSignature(fn) {

    const fnString = fn.toString()
    const singleLineFnString = fnString.replace(regex.EXCESSIVE_WHITESPACE, ' ')
    const [ match ] = singleLineFnString.match(regex.FUNCTION_METHOD_ARROW_SIGNATURE)

    if (!match) {
        throw new Error(`Unable to extract function signature from \n${fnString}`)
    }

    const name = fn.name
    const signature = match.trim()
    const source = fn.toString().replace(regex.EXCESSIVE_WHITESPACE, ' ')

    return {
        name,
        signature,
        source
    }
}

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

function getTypeMeta(value) {
    let tag = Object.prototype.toString.call(value);
    let type = tag.slice(8, -1);
    let instanceOf = value?.constructor?.name ?? null;
    let subType = null;
    let primitive = typeof value;
    let name = value?.name ?? instanceOf;

    switch(type) {
        case 'BigInt': {
            subType = 'Integer';
            break;
        }
        case 'Number': {
            let number = Number(value);
            let isNumber = !Number.isNaN(Number.parseFloat(number)) && !Number.isNaN(number - 0);
            let isInteger = isNumber && number % 1 === 0;
            subType = isNumber ? (isInteger ? 'Integer' : 'Float') : null;
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

module.exports = {
    parseFunction,
    parseFunctionSignature,
    parseError,
    parseErrorStacktrace,
    getTypeMeta
}
