'use strict'

const { Domain } = require('zoinx/core');
const mongoose = global.mongoosePool;
const { randomUUID } = require('crypto');

const InputOutputConfig = mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    testObject: {
        type: Object
    },
    isOptional: {
        type: Boolean,
        defaultValue: false
    },
    passed: {
        type: Boolean,
        defaultValue: false
    },
    jsType: {
        type: String,
        trim: true
    },
    typePassed: {
        type: Boolean,
        defaultValue: false
    },
    subType: {
        type: String,
        trim: true
    },
    subTypePassed: {
        type: Boolean,
        defaultValue: false
    },
    resultMessage: {
        type: String,
        trim: true
    },
    testExceptionProps: {
        type: Array,
        defaultValue: []
    },
    isElement: {
        type: Boolean,
        defaultValue: false
    },
    isTextNode: {
        type: Boolean,
        defaultValue: false
    },
    isIterable: {
        type: Boolean,
        defaultValue: false
    },
    isEmpty: {
        type: Boolean,
        defaultValue: false
    },
    isFunction: {
        type: Boolean,
        defaultValue: false
    },
    testParamConfigStr: {
        type: String,
        trim: true
    },
    testParamConfigStrDisplay: {
        type: String,
        trim: true
    },
    successCount: {
        type: Number,
        defaultValue: 0
    }
});

const ExecutionDetails = mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    testObject: {
        type: Object
    },
    isOptional: {
        type: Boolean,
        defaultValue: false
    },
    passed: {
        type: Boolean,
        defaultValue: false
    },
    type: {
        type: String,
        trim: true
    },
    typePassed: {
        type: Boolean,
        defaultValue: false
    },
    subType: {
        type: String,
        trim: true
    },
    subTypePassed: {
        type: Boolean,
        defaultValue: false
    },
    resultMessage: {
        type: String,
        trim: true
    },
    testParamConfigStr: {
        type: String,
        trim: true
    },
    expectedOut: {
        type: String,
        trim: true
    }
});

const schema = mongoose.Schema(
    {
        className: {
            type: String,
            required: true,
            trim: true
        },
        methodName: {
            type: String,
            required: true,
            trim: true
        },
        methodSignature: {
            type: String,
            required: true,
            trim: true
        },
        testedParams: {
            type: Array,
            defaultValue: []
        },
        untestedParams: {
            type: Array,
            defaultValue: []
        },
        passedArguments: {
            type: Array,
            defaultValue: []
        },
        argumentsCount: {
            type: Number,
            defaultValue: 0
        },
        paramsCount: {
            type: Number,
            defaultValue: 0
        },
        paramsPassedTestCount: {
            type: Number,
            defaultValue: 0
        },
        passed: {
            type: Boolean,
            defaultValue: false
        },
        resultMessage: {
            type: String,
            trim: true
        },
        callerClassName: {
            type: String,
            trim: true
        },
        callerMethodName: {
            type: String,
            trim: true
        },
        callerSignature: {
            type: String,
            trim: true
        },
        testDate: {
            type: Date,
            immutable: true,
            index: true,
            default: () => Date.now()
        },
        classExcluded: {
            type: Boolean,
            defaultValue: false
        },
        methodExcluded: {
            type: Boolean,
            defaultValue: false
        },
        testTimeToSec: {
            type: String,
            trim: true
        },
        stopWatchStart: {
            type: Date,
            immutable: true
        },
        stopWatchEnd: {
            type: Date,
            immutable: true
        },
        runningTimeMillis: {
            type: Number,
            defaultValue: 0
        },
        isUserTriggered: {
            type: Boolean,
            defaultValue: false
        },
        doArgumentCountsMatch: {
            type: Boolean,
            defaultValue: false
        },
        testParamConfig: {
            type: InputOutputConfig
        },
        testParamConfigStr: {
            type: String,
            trim: true
        },
        testOutputConfig: {
            type: InputOutputConfig
        },
        testOutputConfigStr: {
            type: String,
            trim: true
        },
        executionResult: {
            type: ExecutionDetails
        },
        executionPassed: {
            type: Boolean,
            defaultValue: false
        },
        executionPassedTestCount: {
            type: Number,
            defaultValue: 0
        },
        distinctParamNames: {
            type: Array,
            defaultValue: []
        },
        notes: {
            type: String,
            trim: true
        },
        created_user: {
            type: String,
            default: 'SYSTEM',
            required: true,
            immutable: true,
            minlength: 3,
            maxlength: 50,
            trim: true
        },
        updated_user: {
            type: String,
            default: 'SYSTEM',
            required: true,
            minlength: 3,
            maxlength: 50,
            trim: true
        }
    },
    {
    timestamps: {
        createdAt: 'create_timestamp',
        updatedAt: 'updated_timestamp'
     }
});

module.exports = class TestingResultsRealtimeDomain extends Domain {

    constructor() {
        super(mongoose.model('TestingResultsRealtime', schema, 'test.resultsRealtime'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }

}
