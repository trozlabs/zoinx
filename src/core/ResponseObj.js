// native
const os = require('os');
// external
const _ = require('lodash');

module.exports = class ResponseObj {
    static getJson(data = [], statusMsg = 'OK', statusCode = 200, serverInstance = '', errors = []) {
        if (data && !_.isArray(data)) {
            if (Object.keys(data).length > 0) data = [data];
            else data = [];
        } else if (!data) data = [];
        let dataCount = data.length;

        if (!serverInstance) serverInstance = os.hostname();

        let returnObj = {
            statusCode: statusCode,
            statusMsg: statusMsg,
            dataCount: dataCount,
            data: data,
            svrInstance: serverInstance
        };

        if (errors && !_.isArray(errors)) {
            if (Object.keys(errors).length > 0) errors = [errors];
            else errors = [];
        } else if (!errors) errors = [];
        if (errors.length > 0) {
            returnObj.errorCount = errors.length;
            returnObj.errors = errors;
        }

        return returnObj;
    }

    static getJsonMsgOnly(statusMsg = 'OK', statusCode = 200, errors = []) {
        let serverInstance = os.hostname();
        let returnObj = {
            statusCode: statusCode,
            statusMsg: statusMsg,
            dataCount: 0,
            data: [],
            svrInstance: serverInstance
        };

        if (errors && !_.isArray(errors)) {
            if (Object.keys(errors).length > 0) errors = [errors];
            else errors = [];
        } else if (!errors) errors = [];
        if (errors.length > 0) {
            returnObj.errorCount = errors.length;
            returnObj.errors = errors;
        }

        return returnObj;
    }

    static getJsonExMsg(exception, statusCode = 400) {
        let statusMsg = 'Exception Error';
        if (exception.message) statusMsg = exception.message.toString();
        else if (_.isString(exception)) statusMsg = exception;

        let serverInstance = os.hostname();
        let returnObj = {
            statusCode: statusCode,
            statusMsg: statusMsg,
            dataCount: 0,
            data: [],
            svrInstance: serverInstance
        };

        return returnObj;
    }

    static omitProperties(objectList = [], subDoc, removeProps = ['']) {
        let newObjectList = [];
        if (objectList && !_.isArray(objectList)) {
            if (Object.keys(objectList).length > 0) {
                if (!subDoc) {
                    newObjectList.push(objectList);
                } else {
                    newObjectList = [objectList[subDoc]];
                }
            }
        } else if (!objectList) return objectList;
        else newObjectList = objectList;

        let objCount = newObjectList.length;

        for (let i = 0; i < newObjectList.length; i++) {
            newObjectList[i] = _.omit(newObjectList[i], removeProps);
        }

        if (newObjectList.length === 1) return newObjectList[0];

        return newObjectList;
    }
};
