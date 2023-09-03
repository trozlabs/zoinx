'use strict'

const { Domain } = require('../../core');
const mongoose = global.mongoosePool;

const schema = mongoose.Schema(
    {
        enabled: {
            type: Boolean,
            default: true
        },
        username: {
            type: String,
            unique: true,
            required: true,
            index: true
        },
        password: {
            type: String,
            required: true,
            index: true
        },
        expires:  {
            type: Date
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

// schema.index({ username : 1, password : 1 }, { unique : true });

module.exports = class LocalAcctsDomain extends Domain {

    constructor() {
        super(mongoose.model('LocalAccts', schema, 'security.localAccts'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }

}
