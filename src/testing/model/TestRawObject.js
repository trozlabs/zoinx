const { Model } = require('../../core');
const _ = require('lodash');

module.exports = class TestRawObject extends Model {

    constructor(jsonInputObj) {
        super().init(jsonInputObj);
    }

    fields = [
        {
            type: 'string',
            name: 'id'
        },
        {
            name: 'objectKey'
        },
        {
            name: 'objectValue'
        }
    ]

}
