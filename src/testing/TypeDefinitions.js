const _ = require('lodash');
const { Log } = require('../log');
const crypto = require('crypto');
const path = require('path');

module.exports = class TypeDefinitions {

    static get primitives() {
        return [
            'string',
            'number',
            'bigint',
            'boolean',
            'symbol',
            'undefined',
            'null'
        ];
    }

    static get objects() {
        return [
            'object',
            'array',
            'function',
            'date',
            'event'
        ]
    }

    static get otherTypes () {
        return [];
    }

    static get typeTests() {
        return {
            'string':       {typeFn: _.isString,    convertFn: _.toString},
            'number':       {typeFn: _.isNumber,    convertFn: _.toNumber},
            'bigint':       {typeFn: this.isBigInt, convertFn: _.toNumber},
            'boolean':      {typeFn: _.isBoolean,   convertFn: this.toBoolean},
            'symbol':       {typeFn: _.isSymbol,    convertFn: this.toSymbol},
            'undefined':    {typeFn: _.isUndefined, convertFn: Function(`return undefined;`)},
            'null':         {typeFn: _.isNull,      convertFn: Function(`return null;`)},
            'object':       {typeFn: _.isObject,    convertFn: JSON.parse},
            'array':        {typeFn: _.isArray,     convertFn: JSON.parse},
            'function':     {typeFn: _.isFunction,  convertFn: this.toFunction},
            'date':         {typeFn: _.isDate,      convertFn: this.toDate},
            'regexp':       {typeFn: _.isRegExp,    convertFn: this.toRegExp},
            'dynaFunc':     {typeFn: _.isFunction,  convertFn: this.toDynaFunction}
        }
    }

    static toSymbol(value) {
        return (_.isString(value)) ? Symbol(value) : undefined;
    }

    static toBoolean(value) {
        const regex=/^\s*(true|1|on|yes)\s*$/i;
        return regex.test(value);
    }

    static toFunction(value) {
        return undefined;
    }

    static toDynaFunction(value) {
        // based on a string like /src/testing/UtilMethods.isIterable
        let funcStr = value.match(/\((.*)\)/),
            funcStrSplit, classPath, tmpReq, newFunc;
        if (_.isEmpty(funcStr[1])) return;

        funcStrSplit = funcStr[1].split('.');
        classPath = path.resolve(`${process.cwd()}${funcStrSplit[0]}`);
        try {
            tmpReq = require(classPath);
            newFunc = (funcStrSplit[1]) ? tmpReq[funcStrSplit[1]] : undefined;
        }
        catch (e) {
            newFunc = undefined;
        }
        return newFunc;
    }

    //TypeDefinitions.getFunctionType(function f() {})
    //TypeDefinitions.getFunctionType(class C {})
    //TypeDefinitions.getFunctionType(() => {})
    //TypeDefinitions.getFunctionType(async function () {})
    static getFunctionType(func) {
        let type = '';

        if (typeof func === 'function') {
            if (func.prototype) {
                type = (Object.getOwnPropertyDescriptor(func, 'prototype').writable) ? 'function' : 'class';
            }
            else {
                type = (func.constructor.name === 'AsyncFunction') ? 'async' : 'arrow';
            }
        }

        return type;
    }

    static isObjectClass(func) {
        return this.getFunctionType(func) === 'class';
    }

    static isFunctionAsync(func) {
        return this.getFunctionType(func) === 'async';
    }

    static toRegExp(value) {
        let regexParts = value.match(/\/(.*)\/([mgiyuvsd]*)/);
        if (_.isEmpty(regexParts[1])) return;
        return new RegExp(regexParts[1], regexParts[2]);
    }

    static toDate(value) {
        let tmpDate = new Date();
        try {
            tmpDate = new Date(value);
        }
        catch (ex) {
            console.error(ex);
        }
        return tmpDate;
    }

    static isPrimitive(value) {
        let type = typeof value;

        if (type === 'string') {
            return (!this.objects.includes(value) && !this.otherTypes.includes(value) && this.primitives.includes(value));
        }
        return this.primitives.includes(value);
    }

    static getTypeAccepted(type, testObj) {
        let returnObj = {},
            typeSplit, subType = 'N/A',
            rxCarrots = /\.?(\<.+\>)/gi;

        if (_.isEmpty(type) || !_.isString(type)) return returnObj;

        typeSplit = type.split('=:');
        if (typeSplit.length <= 1 && /<([^>]+)>/.test(type)) {
            let carrotsMatch = rxCarrots.exec(type);
            if (carrotsMatch.length > 0) {
                type = type.substring(0, carrotsMatch['index']);
                subType = carrotsMatch[0].substring(1, (carrotsMatch[0].length-1));
            }

            if (type === 'object' && _.isEmpty(subType))
                subType = 'json';
        }
        else {
            type = typeSplit[0].trim();
            if (type.indexOf(',') > 0) type = type.substring(0, type.indexOf(','))
            if (typeSplit.length > 1) subType = typeSplit[1].trim();
        }

        returnObj = {
            type: type,
            typeAccepted: false,
            subType: subType,
            subTypeAccepted: false,
        };

        if (this.primitives.includes(type.toLowerCase()))
            returnObj.typeAccepted = true;
        else if (this.objects.includes(type.split(':')[0].toLowerCase()))
            returnObj.typeAccepted = true;
        else if (this.otherTypes.includes(type.split(':')[0].toLowerCase()))
            returnObj.typeAccepted = true;

        if (!_.isEmpty(subType) && subType !== 'N/A' && (this.primitives.includes(subType) || this.objects.includes(subType)))
            returnObj.subTypeAccepted = true;

        if (!returnObj.typeAccepted) Log.error(`Datatype is not an accepted type for function testing: ${type}. ${testObj}`);
        return returnObj;
    }

    static isObjectLike(value) {
        return typeof value === 'object' && value !== null;
    }

    static getTag(value) {
        if (value == null) {
            return value === undefined ? '[object Undefined]' : '[object Null]';
        }
        return toString.call(value);
    }

    static isBigInt(value) {
        return typeof value === 'bigint' ||
            (TypeDefinitions.isObjectLike(value) && TypeDefinitions.getTag(value) === '[object BigInt]');
    }

    static isPrime(p) {
        for (let i = 2n; i * i <= p; i++) {
            if (p % i === 0n) return false;
        }
        return true
    }

    // Takes a BigInt value as an argument, returns nth prime number as a BigInt value
    static nthPrime(nth) {
        let maybePrime = 2n,
            prime = 0n
        while (nth >= 0n) {
            if (this.isPrime(maybePrime)) {
                nth--
                prime = maybePrime
            }
            maybePrime++
        }
        return prime
    }

    static getRandomPrimitive(primitiveType) {
        primitiveType = primitiveType?.toLowerCase();
        if (TypeDefinitions.primitives.includes(primitiveType)) {

            if (primitiveType === 'number' || primitiveType === 'bigint') {
                if (primitiveType === 'bigint')
                    return BigInt( Math.floor(Math.random()*10000000000) );
                else {
                    let makeInt = (Math.random() * 100 > 49),
                        tmpNumb = Math.random() * 100;

                    if (makeInt)
                        return tmpNumb = Math.floor(tmpNumb);
                    else
                        return tmpNumb;
                }
            }
            else if (primitiveType === 'string' || primitiveType === 'symbol') {
                let tmpLength = Math.floor(Math.random()*100);
                if (primitiveType === 'symbol')
                    Symbol(crypto.randomBytes(tmpLength).toString('hex'));
                else
                    return crypto.randomBytes(tmpLength).toString('hex');
            }
            else if (primitiveType === 'boolean') {
                return (Math.random() * 100 > 49);
            }
            else if (primitiveType === 'null') {
                return null;
            }

        }
        return undefined;
    }

}
