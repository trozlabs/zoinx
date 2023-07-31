const crypto = require('node:crypto');
const regex = require('./regex.js');
const Type = require('../util/Type');

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

    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    const callee = stack[1] || {}
    const caller = stack[2] || {}
    const name = parsedFn.name

    return {
        id,
        timestamp,
        scope,
        caller,
        callee,
        name,
        args,
        fnSignature,
        stack
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
    const stack = error.stack
    const lines = stack.split("\n")
    const message = lines.shift()
    const stacktrace = lines.map(line => {
        // Each line is in the form "    at functionName (filename:lineNumber:columnNumber)"
        const parts = line.match(/^\s*at (.*?)\s*\((.*?):(\d+):(\d+)\)/)
        if (!parts) {
            return null
        }
        return {
            function: parts[1],
            filename: parts[2],
            line: parseInt(parts[3], 10),
            column: parseInt(parts[4], 10)
        }
    }).filter(Boolean)

    return {
        message,
        stacktrace
    }
}

module.exports = {
    parseFunction,
    parseFunctionSignature,
    parseError
}