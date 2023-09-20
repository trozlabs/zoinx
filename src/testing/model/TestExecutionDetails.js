const Model = require('../../core/Model');

module.exports = class TestExecutionDetails extends Model {

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
            name: 'type'
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
            name: 'resultMessage'
        },
        {
            type: 'string',
            name: 'testParamConfigStr'
        },
        {
            name: 'expectedOut'
        }
    ]

}
