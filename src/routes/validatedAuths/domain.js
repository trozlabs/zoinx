'use strict'

const { Domain } = require('../../core');
const mongoose = global.mongoosePool;

const schema = mongoose.Schema(
    {
        user_oid: {
            type: String,
            required: true,
            index: true,
            trim: true
        },
        expires: {
            type: Date,
            required: true,
            index: true,
            trim: true
        },
        preferred_username: {
            type: String,
            required: true,
            trim: true
        },
        ip_address: {
            type: String,
            required: true,
            trim: true
        },
        user_agent: {
            type: String,
            trim: true
        },
        jwt_token: {
            type: String,
            required: true,
            trim: true
        },
        jwt_parsed: {
            type: Object,
            required: true
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

module.exports = class ValidatedAuthsDomain extends Domain {

    constructor() {
        super(mongoose.model('ValidatedAuths', schema, 'security.validatedAuths'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }

}
