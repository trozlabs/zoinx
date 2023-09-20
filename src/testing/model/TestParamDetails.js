const Model = require('../../core/Model');

module.exports = class TestParamDetails extends Model {

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
            name: 'name'
        },
        {
            name: 'testObject'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'isOptional'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'passed'
        },
        {
            type: 'string',
            name: 'jsType'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'typePassed'
        },
        {
            type: 'string',
            name: 'subType'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'subTypePassed'
        },
        {
            type: 'string',
            defaultValue: '',
            name: 'resultMessage'
        },
        {
            name: 'testExceptionProps',
            defaultValue: []
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'isElement'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'isTextNode'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'isIterable'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'isEmpty'
        },
        {
            type: 'boolean',
            defaultValue: false,
            name: 'isFunction'
        },
        {
            name: 'testParamConfigStr',
            type: 'string'
        },
        {
            name: 'testParamConfigStrDisplay',
            type: 'string'
        },
        {
            type: 'int',
            defaultValue: 0,
            name: 'successCount'
        }
    ]

}
