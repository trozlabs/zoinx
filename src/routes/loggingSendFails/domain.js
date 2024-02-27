'use strict'

const { Domain } = require('zoinx/core');
const mongoose = global.mongoosePool;

const schema = mongoose.Schema(
    {
        send_to_server: {
            type: String,
            required: true,
            trim: true
        },
        resent: {
            type: Boolean,
            defaultValue: false
        },
        ip_address: {
            type: String,
            required: true,
            trim: true
        },
        logging_obj: {
            type: Object,
            required: true
        },
        error_message: {
            type: String,
            required: true,
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

module.exports = class LoggingSendFailsDomain extends Domain {

    constructor() {
        super(mongoose.model('LoggingSendFails', schema, 'log.sendFails'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }

}
