const _ = require('lodash');
const { Log } = require('../log');
const TypeDefinitions = require('./TypeDefinitions');

module.exports = class ParseFunctionConfig {

    static rxCurlies = /\.?(\{.+\})/mi;
    static rxBrackets = /\.?(\[.+\])/mi;
    static rxBananas = /\.?(\(|.+\))/mi;
    static rxCarrots = /\.?(\<.+\>)/mi;
    static rxWacks = /\.?(\/.+\/)/mi;
    static rxRegExp = /\/(.*)\/([mgiyuvsd]*)/;
    static rxRejected = /\srejectedValues=:\[[^\]]+\]/;
    static rxFunction = /\[([^\]]+)\]/;

    static requiredPrefix = 'required=:';
    static acceptedPrefix = 'acceptedValues=:';
    static rejectedPrefix = 'rejectedValues=:';
    static expectedOutPrefix = 'expectedOut=:';
    static maskedPrefix = 'masked=:';

    static parse(inputStr, isOutputConfig=false) {
        let finalOutput = {type:'PARSE_ERROR'},
            initialSplit;

        if (!_.isEmpty(inputStr)) {
            initialSplit = inputStr.split('=>');
            if (initialSplit.length < 1) return finalOutput;
            if (initialSplit[0].includes("=")) {
                Log.error(`Looks like there are options configured but missing =>\n${inputStr}.`);
                return finalOutput;
            }

            finalOutput = this.getInitialTestConfig(initialSplit, inputStr);
            this.parseObjectTestConfig(finalOutput, initialSplit);
        }
        return finalOutput;
    }

    static getInitialTestConfig(initialSplit, inputStr = '') {
        if (!Array.isArray(initialSplit) || initialSplit.length === 0) {
            return undefined;
        }

        let rawName = initialSplit[0] ?? '';
        let paramOptional = rawName.includes('?');
        let maskValue = rawName.includes('*');

        const paramName = rawName.replace(/[?*]/g, '');

        // Base config factory
        const baseConfig = {
            name: paramName,
            type: 'string',
            subType: undefined,
            optional: paramOptional,
            maskValue,
            required: [],
            acceptedValues: [],
            rejectedValues: [],
            expectedOut: [],
            testParamConfigStr: inputStr
        };

        // No details provided → default string config
        if (!initialSplit[1]) {
            baseConfig.expectedOut = [undefined];
            baseConfig.constructor.type = 'parsedTestConfig';
            return baseConfig;
        }

        const details = initialSplit[1].trim();

        // Must be enclosed in <>
        if (!details.startsWith('<') || !details.endsWith('>')) {
            return {
                type: 'PARSE_ERROR',
                reason: 'Test config details must be enclosed in <>',
                confDetails: details
            };
        }

        // Strip < >
        const inner = details.slice(1, -1).trim();

        // Extract type + optional metadata
        const [paramType, ...rest] = inner.split(/\s+/);
        const detailsSplit = rest.join(' ') || undefined;

        // Resolve type
        let typeTest = TypeDefinitions.getTypeAccepted(paramType)
            || (detailsSplit && TypeDefinitions.getTypeAccepted(detailsSplit));

        if (!typeTest || !typeTest.typeAccepted) {
            return {
                type: 'PARSE_ERROR',
                reason: 'Unsupported parameter type',
                confDetails: details
            };
        }

        const parsedConfig = {
            ...baseConfig,
            type: typeTest.type,
            subType: typeTest.subType
        };

        parsedConfig.constructor.type = 'parsedTestConfig';
        return parsedConfig;
    }

    static parseObjectTestConfig(configObj, parseParts) {
        if (!Array.isArray(parseParts) || parseParts.length < 2) return;

        try {
            let part = parseParts[1];

            // ---- REQUIRED ----
            configObj.required = this.parseObjectPrefix(
                part,
                this.requiredPrefix
                // value => (configObj.required = value)
            );
            configObj.required = (configObj.required) ?? [];

            // ---- ACCEPTED ----
            configObj.acceptedValues = this.parseValueOrObjectPrefix(
                part,
                this.acceptedPrefix,
                configObj.type
            );
            configObj.acceptedValues = (configObj.acceptedValues) ?? [];

            // ---- REJECTED ----
            configObj.rejectedValues = this.parseValueOrObjectPrefix(
                part,
                this.rejectedPrefix,
                configObj.type
            );
            configObj.rejectedValues = (configObj.rejectedValues) ?? [];

            // ---- EXPECTED OUT ----
            configObj.expectedOut = this.parseValueOrObjectPrefix(
                part,
                this.expectedOutPrefix,
                configObj.type
            );
            configObj.expectedOut = (configObj.expectedOut) ?? [];

        }
        catch (ex) {
            console.error(ex);
        }
    }

    static parseObjectPrefix(str, prefix) {
        const idx = str.indexOf(prefix);
        if (idx === -1) return;

        let sub = str.substring(idx);
        sub = sub.substring(0, sub.indexOf('}]') + 2);
        return this.getAdvancedObjectConf(sub, prefix);
    }

    static parseValueOrObjectPrefix(str, prefix, type) {
        const idx = str.indexOf(prefix);
        if (idx === -1) return;

        let sub = str.substring(idx);
        const body = sub.split(prefix)[1];

        if (body.startsWith('[')) {
            sub = sub.substring(0, sub.indexOf(']>') + 1);
            return this.getAdvancedValueConf(sub, prefix, type);
        }
        else {
            sub = sub.substring(0, sub.indexOf('}]') + 2);
            return this.getAdvancedObjectConf(sub, prefix);
        }
    }

    static getAdvancedValueConf(configStr, configPrefix, type) {
        let tmpJson = [],
            tmpSplit, isOutputConfig=false;

        if (!_.isEmpty(configStr)) {
            try {
                tmpSplit = configStr.split(configPrefix);

                if (this.rxFunction.test(tmpSplit[1])) {
                    let tmpArrayStr = tmpSplit[1].substring(1, (tmpSplit[1].length - 1)),
                        tmpSplitArray = tmpArrayStr.split('|'),
                        parsedArray = [];

                    if (tmpSplit[1].includes('"${')) {
                        const tmpConf = tmpSplit[1].substring(2, (tmpSplit[1].length - 2));
                        parsedArray.push(tmpConf);
                    }
                    else {
                        if (this.rxRegExp.test(tmpSplitArray[0]) && tmpSplitArray[0].startsWith("/")) {
                            type = 'regexp';
                        }
                        else if (this.rxBananas.test(tmpSplitArray[0]) && tmpSplitArray[0].startsWith('(')) {
                            type = 'dynaFunc';
                        }

                        for (let i = 0; i < tmpSplitArray.length; i++) {
                            parsedArray.push(TypeDefinitions.typeTests[type].convertFn(tmpSplitArray[i]));
                            if (type === 'regexp' || type === 'dynaFunc') break;
                        }
                    }
                    tmpJson = parsedArray;
                }
            }
            catch (e) {
                Log.error(`${tmpSplit[0]} did not parse passed values: ${tmpSplit[1]}`, e);
                return finalOutput;
            }
        }

        return tmpJson;
    }

    static getAdvancedObjectConf(configStr, configPrefix) {
        let parsedJson = [],
            groupingArray = [],
            rawRequired, requiredObjects;

        if (configStr) {
            rawRequired = configStr.split(configPrefix)[1];

            try {
                requiredObjects = JSON.parse(rawRequired);
                if (!_.isArray(requiredObjects)) {
                    console.error('required=:[] must be an array');
                }
                else {
                    const isOr = (requiredObjects.length > 1);

                    for (let i=0; i<requiredObjects.length; i++) {
                        const reqObj = requiredObjects[i];
                        const configKeys = Object.keys(reqObj);

                        for (let j=0; j<configKeys.length; j++) {
                            let requiredObj = {
                                    propName: configKeys[j],
                                    values: [],
                                    regex: undefined
                                },
                                arrayTest, regexText, functionText, tmpArrayStr;

                            const propName = configKeys[j];
                            let value = reqObj[propName];
                            if (value.includes('*=')) {
                                requiredObj.maskValue = true;
                                value = value.replace('*=', '=');
                            }
                            else {
                                requiredObj.maskValue = false;
                            }
                            reqObj[propName] = value;

                            arrayTest   = this.rxBrackets.exec(reqObj[propName]);
                            regexText   = this.rxWacks.exec(reqObj[propName]);
                            functionText= this.rxFunction.exec(reqObj[propName]);

                            if (!_.isEmpty(arrayTest) && _.isEmpty(regexText)) {
                                requiredObj.type = reqObj[propName].substring(0, arrayTest['index']-1);
                                tmpArrayStr = arrayTest[0];
                                if (this.rxFunction.test(tmpArrayStr)) {
                                    tmpArrayStr = tmpArrayStr.substring(1, (tmpArrayStr.length-1));
                                    requiredObj.values = tmpArrayStr.split('|');
                                }
                            }
                            else if (!_.isEmpty(functionText) && functionText[1].endsWith(')')) {
                                requiredObj.type = reqObj[propName].substring(0, functionText['index']-1);
                                tmpArrayStr = functionText[1];
                                requiredObj.dynaFunc = TypeDefinitions.toDynaFunction(tmpArrayStr);
                            }
                            else if (!_.isEmpty(regexText)) {
                                requiredObj.type = reqObj[propName].substring(0, regexText['index']-2);
                                tmpArrayStr = regexText[0];
                                requiredObj.regex = TypeDefinitions.toRegExp(reqObj[propName]);
                            }
                            else {
                                requiredObj.type = reqObj[propName];
                            }

                            groupingArray.push(requiredObj);
                        }

                        if (isOr) {
                            parsedJson.push(groupingArray[0]);
                            groupingArray = [];
                        }
                        else {
                            parsedJson.push(groupingArray);
                        }
                    }
                }
            }
            catch (ex) {
                Log.error(`${configPrefix} input is invalid: ${rawRequired}`)
            }
        }

        return parsedJson;
    }

    static createAccurateVtcOutput(configObj={}) {

        try {
            if (!_.isEmpty(configObj)) {
                let required = configObj.required,
                    accepted = configObj.acceptedValues,
                    rejected = configObj.rejectedValues,
                    expectedOut = configObj.expectedOut,
                    tmpArray, assignTo;

                if (_.isArray(required) && required.length > 0) {
                    for (let i = 0; i < required.length; i++) {
                        for (let j = 0; j < required[i].length; j++) {
                            let regex = required[i][j].regex,
                                dynaFunc = required[i][j].dynaFunc;
                            if (regex) {
                                configObj.required[i][j].regex = regex.toString();
                            }
                            else if (dynaFunc) {
                                configObj.required[i][j].function = required[i][j].dynaFunc.name;
                            }
                        }
                    }
                }
                {
                    if (_.isArray(accepted) && accepted?.length > 0) {
                        tmpArray = accepted;
                        assignTo = configObj.acceptedValues;
                        configObj.rejectedValues = [];
                    }
                    else if (_.isArray(rejected) && rejected.length > 0) {
                        tmpArray = rejected;
                        assignTo = configObj.rejectedValues;
                        configObj.acceptedValues = [];
                    }

                    for (let i = 0; i < tmpArray.length; i++) {
                        let value = tmpArray[i];
                        if (_.isRegExp(tmpArray[i])) {
                            assignTo[i] = value.toString();
                        }
                        else if (_.isFunction(tmpArray[i])) {
                            assignTo[i] = `Function: ${value.name}`;
                        }
                    }
                }
            }
        }
        catch (e) {
            Log.error(e.message);
        }

        return configObj;
    }

}
