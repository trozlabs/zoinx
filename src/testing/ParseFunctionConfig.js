const _ = require('lodash');
const { Log } = require('../log');
const TypeDefinitions = require('./TypeDefinitions');

module.exports = class ParseFunctionConfig {

    static rxCurlies = /\.?(\{.+\})/gi;
    static rxBrackets = /\.?(\[.+\])/gi;
    static rxBananas = /\.?(\(|.+\))/gi; ///\.?(\(|\))/gi;
    static rxCarrots = /\.?(\<.+\>)/gi;
    static rxWacks = /\.?(\/.+\/)/gi;

    static requiredPrefix = 'required=:';
    static acceptedPrefix = 'acceptedValues=:';
    static rejectedPrefix = 'rejectedValues=:';
    static expectedOutPrefix = 'expectedOut=:';

    static parse(inputStr, isOutputConfig=false) {
        let me = this,
            finalOutput = {type:'PARSE_ERROR'},
            paramType, paramSubType='', paramName, paramOptional = false, initialSplit, detailsSplit = [];

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

    static getInitialTestConfig(initialSplit, inputStr='') {
        if (_.isEmpty(initialSplit) || !_.isArray(initialSplit)) return undefined;

        let parsedConfig,
            paramName,
            paramOptional = false,
            paramType,
            detailsSplit;

        if (initialSplit[0].includes('?')) {
            initialSplit[0] = initialSplit[0].replace('?', '');
            paramOptional = true;
        }
        paramName = initialSplit[0];

        if (_.isEmpty(initialSplit[1])) {
            parsedConfig = {
                name: paramName,
                type: 'string',
                optional: paramOptional,
                required: [],
                acceptedValues: [],
                rejectedValues: [],
                expectedOut: [undefined],
                testParamConfigStr: ''
            };
            parsedConfig.constructor.type = 'parsedTestConfig';
            return parsedConfig;
        }

        // See if details are contained in <>, if not return error
        // if (!this.rxCarrots.test(initialSplit[1])) return {type:'PARSE_ERROR', reason: 'Test config details must with <>', confDetails: initialSplit[1]};
        if (!initialSplit[1].startsWith('<') || !initialSplit[1].endsWith('>')) return {type:'PARSE_ERROR', reason: 'Test config details must with <>', confDetails: initialSplit[1]};;

        let tmpObjStr = initialSplit[1].slice();
        paramType = tmpObjStr.substring(1, (tmpObjStr.length-1))
        if (paramType.includes(' '))
            paramType = paramType.substr(0, tmpObjStr.indexOf(' '));

        if (_.isEmpty(paramType) && !_.isEmpty(initialSplit[1])) {
            if (initialSplit[1].includes('<'))
                paramType = initialSplit[1].substr(0, initialSplit[1].indexOf('<'));
            else
                paramType = initialSplit[1];
        }
        else {
            if (initialSplit[1].indexOf(' ') >= 0) {
                detailsSplit = initialSplit[1].substring(initialSplit[1].indexOf(' '), initialSplit[1].length).trim();
                if (detailsSplit.endsWith('>'))
                    detailsSplit = detailsSplit.slice(0, -1);
            }
        }

        let typeTest;
        typeTest = TypeDefinitions.getTypeAccepted(paramType);
        if (_.isEmpty(typeTest))
            typeTest = TypeDefinitions.getTypeAccepted(detailsSplit);

        if (!typeTest.typeAccepted) return finalOutput;

        parsedConfig = {
            name: paramName,
            type: typeTest.type,
            subType: (typeTest.subType) ? typeTest.subType : paramSubType,
            optional: paramOptional,
            required: [],
            acceptedValues: [],
            rejectedValues: [],
            expectedOut: [],
            testParamConfigStr: inputStr
        };
        parsedConfig.constructor.type = 'parsedTestConfig';
        return parsedConfig;
    }

    static parseObjectTestConfig(configObj, parseParts) {

        if (!_.isEmpty(parseParts) && _.isArray(parseParts)) {
            try {
                if (parseParts.length > 1) {

// TODO make work like accepted
                    let requiredStr = '';
                    if (parseParts[1].indexOf(this.requiredPrefix) >= 0) {
                        requiredStr = parseParts[1].substring(parseParts[1].indexOf(this.requiredPrefix), parseParts[1].length);
                        requiredStr = requiredStr.substring(0, (requiredStr.indexOf('}]')+2));
                        configObj.required = this.getAdvancedObjectConf(requiredStr, this.requiredPrefix);
                    }

                    let acceptedStr = '';
                    if (parseParts[1].indexOf(this.acceptedPrefix) >= 0) {
                        acceptedStr = parseParts[1].slice().substring(parseParts[1].indexOf(this.acceptedPrefix), parseParts[1].length);
                        if (acceptedStr.split(this.acceptedPrefix)[1].startsWith('[')) {
                            acceptedStr = acceptedStr.substring(0, (acceptedStr.indexOf(']>') + 1));
                            configObj.acceptedValues = this.getAdvancedValueConf(acceptedStr, this.acceptedPrefix, configObj.type);
                        }
                        else {
                            acceptedStr = acceptedStr.substring(0, (acceptedStr.indexOf('}]') + 2));
                            configObj.acceptedValues = this.getAdvancedObjectConf(acceptedStr, this.acceptedPrefix);
                        }
                    }
// TODO make work like accepted
                    let rejectedStr = '';
                    if (parseParts[1].indexOf(this.rejectedPrefix) >= 0) {
                        rejectedStr = parseParts[1].slice().susubstringbstr(parseParts[1].indexOf(this.rejectedPrefix), parseParts[1].length);
                        if (rejectedStr.split(this.rejectedPrefix)[1].startsWith('[')) {
                            rejectedStr = rejectedStr.substring(0, (rejectedStr.indexOf(']>') + 1));
                            configObj.rejectedValues = this.getAdvancedValueConf(rejectedStr, this.rejectedPrefix, configObj.type);
                        }
                        else {
                            rejectedStr = rejectedStr.substring(0, (rejectedStr.indexOf('}]') + 2));
                            configObj.rejectedValues = this.getAdvancedObjectConf(rejectedStr, this.rejectedPrefix);
                        }
                    }
// TODO make work like accepted
                    let expectedOutStr = '';
                    if (parseParts[1].indexOf(this.expectedOutPrefix) >= 0) {
                        expectedOutStr = parseParts[1].slice().substr(parseParts[1].indexOf(this.expectedOutPrefix), parseParts[1].length);
                        if (expectedOutStr.split(this.expectedOutPrefix)[1].startsWith('[')) {
                            expectedOutStr = expectedOutStr.substring(0, (expectedOutStr.indexOf(']>') + 1));
                            configObj.expectedOut = this.getAdvancedValueConf(expectedOutStr, this.expectedOutPrefix, configObj.type);
                        }
                        else {
                            expectedOutStr = expectedOutStr.substring(0, (expectedOutStr.indexOf('}]') + 2));
                            configObj.expectedOut = this.getAdvancedObjectConf(expectedOutStr, this.expectedOutPrefix);
                        }
                    }
                }
            }
            catch (ex) {
                console.error(ex);
            }
        }
    }

    static getAdvancedValueConf(configStr, configPrefix, type) {
        let tmpJson = [],
            tmpSplit, isOutputConfig=false;

        if (!_.isEmpty(configStr)) {
            try {
                tmpSplit = configStr.split(configPrefix);

                if (/\[([^\]]+)\]/.test(tmpSplit[1])) {
                    let tmpArrayStr = tmpSplit[1].substring(1, (tmpSplit[1].length - 1)),
                        tmpSplitArray = tmpArrayStr.split('|'),
                        parsedArray = [];

                    if (tmpSplit[1].includes('"${')) {
                        const tmpConf = tmpSplit[1].substring(2, (tmpSplit[1].length - 2));
                        parsedArray.push(tmpConf);
                    }
                    else {
                        if (this.rxWacks.exec(tmpSplitArray[0]) && tmpSplitArray[0].startsWith("/")) {
                            type = 'regexp';
                        }

                        for (let i = 0; i < tmpSplitArray.length; i++) {
                            parsedArray.push(TypeDefinitions.typeTests[type].convertFn(tmpSplitArray[i]));
                            if (type === 'regexp') break;
                        }
                    }
                    tmpJson = parsedArray;
                }

                let tmpFn = TypeDefinitions.typeTests[type].typeFn;
                if (_.isString(tmpFn)) tmpFn = require(tmpFn);

                if (!isOutputConfig) {
                    let doesTypeMatch = tmpJson.every(x => (tmpFn(x)));
                    if (!doesTypeMatch) Log.info(`Values in ${tmpSplit[0]} are not all of type ${type}.`);
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
            rawRequired, requiredObjects;

        if (!_.isEmpty(configStr)) {

            rawRequired = configStr.split(configPrefix)[1];
            try {
                requiredObjects = JSON.parse(rawRequired);
                if (!_.isArray(requiredObjects)) {
                    console.error('required=:[] must be an array');
                }
                else {

                    if (configPrefix === 'acceptedValues=:')
                        console.log('debug');

                    for (let i=0; i<requiredObjects.length; i++) {
                        let configKeys = Object.keys(requiredObjects[i]);

                        for (let j=0; j<configKeys.length; j++) {
                            let arrayTest = this.rxBrackets.exec(requiredObjects[i][configKeys[j]]),
                                regexText = this.rxWacks.exec(requiredObjects[i][configKeys[j]]),
                                requiredObj = {
                                    propName: configKeys[j],
                                    values: [],
                                    regex: undefined
                                },
                                tmpArrayStr;

                            if (!_.isEmpty(arrayTest)) {
                                requiredObj.type = requiredObjects[i][configKeys[j]].substr(0, arrayTest['index']-1);
                                tmpArrayStr = arrayTest[0];
                                if (/\[([^\]]+)\]/.test(tmpArrayStr)) {
                                    tmpArrayStr = tmpArrayStr.substring(1, (tmpArrayStr.length-1));
                                    requiredObj.values = tmpArrayStr.split('|');
                                }
                            }
                            else if (!_.isEmpty(regexText)) {
                                requiredObj.type = requiredObjects[i][configKeys[j]].substr(0, regexText['index']-1);
                                tmpArrayStr = regexText[0];
                                if (/\/([^\/]+)\//.test(tmpArrayStr)) {
                                    let rxSplit = regexText['input'].substr(regexText['index']).split('/');
                                    if (rxSplit.length > 1) {
                                        requiredObj.regex = new RegExp(rxSplit[1], (_.isEmpty(rxSplit[2]) ? '' : rxSplit[2]));
                                    }
                                }
                            }
                            else {
                                requiredObj.type = requiredObjects[i][configKeys[j]];
                            }

                            requiredObj.isOr = (i > 0);
                            parsedJson.push(requiredObj);
                        }
                    }
                }
            }
            catch (ex) {
                console.error(`${configPrefix} input is invalid: ${rawRequired}`)
            }
        }

        return parsedJson;
    }


}
