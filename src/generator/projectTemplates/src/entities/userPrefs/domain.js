'use strict'

const { Domain } = require('zoinx/core');
const mongoose = global.mongoosePool;

const schema = mongoose.Schema(
    {
        user_id: {
            type: String,
            required: true,
            minlength: 24,
            maxlength: 36,
            trim: true,
            index: true
        },
        component_name: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 500,
            trim: true,
            index: true
        },
        enabled: {
            type: Boolean,
            default: true
        },
        user_pref_json: {
            type: Object
        },
        version: {
            type: Number,
            default: 0.1
        },
        created_user: {
            type: String,
            default: 'SYSTEM',
            required: true,
            immutable: true,
            minlength: 6,
            maxlength: 200,
            trim: true
        },
        updated_user: {
            type: String,
            default: 'SYSTEM',
            required: true,
            minlength: 6,
            maxlength: 200,
            trim: true
        }
    },
    {
    timestamps: {
        createdAt: 'create_timestamp',
        updatedAt: 'updated_timestamp'
     }
});

schema.index({ user_id : 1, component_name : 1 }, { unique : true });

module.exports = class UserPrefsDomain extends Domain {

    constructor() {
        super(mongoose.model('UserPrefs', schema, 'user.prefs'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }

}
