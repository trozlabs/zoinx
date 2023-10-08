'use strict';

const { Domain, SchemaOptions } = require('zoinx/core');
const mongoose = global.mongoosePool;

const schema = mongoose.Schema(
    {
        val: {
            type: String,
            minlength: 2,
            maxlength: 100,
            index: true,
            default: function () {
                if (this.val) {
                    return this.val;
                }
                return this._id;
            }
        },
        lbl: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 100,
            trim: true
        },
        desc: {
            type: String,
            minlength: 2,
            maxlength: 1000,
            trim: true
        },
        list_key: {
            type: String,
            required: true,
            minlength: 4,
            maxlength: 100,
            trim: true,
            index: true
        },
        enabled: {
            type: Boolean,
            default: true
        },
        locale: {
            type: String,
            maxlength: 10,
            trim: true,
            default: 'en'
        },
        sort_order: {
            type: Number,
            default: 0,
            index: true
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

schema.index({ list_key: 1, lang: 1, disabled: 1 });

module.exports = class PicklistsDomain extends Domain {
    constructor() {
        super(mongoose.model('Picklists', schema, 'static.picklists'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }
};
