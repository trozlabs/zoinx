'use strict'

const { Domain } = require('../../core');
const mongoose = global.mongoosePool;

const schema = mongoose.Schema(
    {
        user_oid: {
            type: String,
            required: true,
            index: true
        },
        expires: {
            type: Date,
            required: true,
            index: true
        },
        preferred_username: {
            type: String,
            required: true
        },
        ip_address: {
            type: String,
            required: true
        },
        user_agent: {
            type: String,
            required: true
        },
        jwt_token: {
            type: String,
            required: true
        },
        jwt_parsed: {
            type: Object,
            required: true
        },
    },
    {
    timestamps: {
        createdAt: 'create_timestamp',
        updatedAt: 'updated_timestamp'
     }
});

module.exports = class CurrentAuthsDomain extends Domain {

    constructor() {
        super(mongoose.model('CurrentAuths', schema, 'security.currentAuths'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }

}
