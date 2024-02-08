const _ = require('lodash');
const { Logger } = require('zoinx/logger');
const { TestHarness } = require('zoinx/testing');

module.exports = TestHarness(class AppStatics {

    static logger = Logger.create({ name: 'AppStatics' });

    static testConfig = {
        'StringToBoolean': {
            input: [
                'value?=><string>',
                'defaultReturn?=><boolean>'
            ],
            output: ['result=><boolean>']
        },
        'ObjectsDiff': {
            input: [
                'initialObj=><object>',
                'changedOjb=><object>',
                'returnChangedDiff?=><boolean>'
            ],
            output: ['result=><object>']
        }
    }

    static StringToBoolean(value=false, defaultReturn=false) {
        if (value && _.isString(value)) {
            value = value.toLowerCase();
            if (['true', 'false'].includes(value)) {
                try {
                    value = JSON.parse(value);
                }
                catch (e) {
                    value = defaultReturn;
                }
            }
            else
                value = defaultReturn;
        }
        else if (!_.isBoolean(value)) {
                value = defaultReturn;
        }
        return value;
    }

    static ObjectsDiff(initialObj, changedOjb, returnChangedDiff=true) {
        if (!_.isObject(initialObj)) initialObj = {};
        if (!_.isObject(changedOjb)) changedOjb = {};
        returnChangedDiff = this.StringToBoolean(returnChangedDiff);

        let leftObj = initialObj,
            rightObj = changedOjb,
            diff;

        try {
            if (returnChangedDiff) {
                leftObj = changedOjb;
                rightObj = initialObj;
            }
            function changes(leftObj, rightObj) {
                let diffs =  _.transform(leftObj, function(result, value, key) {
                    if (!_.isEqual(value, rightObj[key])) {
                        result[key] = (_.isObject(value) && _.isObject(rightObj[key])) ? changes(value, rightObj[key]) : value;
                    }
                });
                return diffs;
            }
            diff = changes(leftObj, rightObj);
        }
        catch (e) {
            this.logger.warn(e.message);
        }

        return diff;
    }
});
