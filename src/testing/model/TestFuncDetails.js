const Model = require('../../core/Model');

module.exports = class TestFuncDetails extends Model {

    constructor(jsonInputObj) {
        super().init(jsonInputObj);
    }

    fields = [
        {
            type: 'string',
            name: 'id'
        },
        {
            type: 'string',
            name: 'className',
            defaultValue: '-'
        },
        {
            type: 'string',
            name: 'methodName',
            defaultValue: '-'
        },
        {
            type: 'string',
            name: 'methodSignature',
            defaultValue: '-'
        },
        {
            type: 'array',
            name: 'testedParams',
            defaultValue: []
        },
        {
            type: 'array',
            name: 'untestedParams',
            defaultValue: []
        },
        {
            type: 'array',
            name: "passedArguments",
            defaultValue: []
        },
        {
            type: 'int',
            defaultValue: 0,
            name: 'argumentsCount'
        },
        {
            type: 'int',
            defaultValue: 0,
            name: 'paramsCount'
        },
        {
            type: 'int',
            defaultValue: 0,
            name: 'paramsPassedTestCount'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'passed'
        },
        {
            type: 'string',
            defaultValue: '',
            name: 'resultMessage'
        },
        {
            type: 'string',
            name: 'callerClassName',
            defaultValue: '-'
        },
        {
            type: 'string',
            name: 'callerMethodName',
            defaultValue: '-'
        },
        {
            type: 'string',
            name: 'callerSignature',
            defaultValue: '-'
        },
        {
            type: 'string',
            name: 'testDate',
            defaultValue: new Date().getTime()
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'classExcluded'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'methodExcluded'
        },
        {
            type: 'string',
            name: 'testTimeToSec'
        },
        {
            type: 'date',
            name: 'stopWatchStart'
        },
        {
            type: 'date',
            name: 'stopWatchEnd'
        },
        {
            type: 'int',
            defaultValue: 0,
            name: 'runningTimeMillis'
        },
        {
            type: 'string',
            name: 'serverInstance'
        },
        {
            type: 'boolean',
            defaultValue: true,
            name: 'doArgumentCountsMatch'
        },
        {
            type: 'object',
            name: 'testParamConfig'
        },
        {
            name: 'testParamConfigStr',
            type: 'string'
        },
        {
            type: 'object',
            name: 'testOutputConfig'
        },
        {
            name: 'testOutputConfigStr',
            type: 'string'
        },
        {
            name: 'executionResult'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'executionPassed'
        },
        {
            type: 'int',
            defaultValue: 0,
            name: 'executionPassedTestCount'
        },
        {
            name: 'distinctParamNames',
            defaultValue: []
        },
        {
            name: 'notes',
            type: 'string'
        }
    ]

}
