// native
const { randomUUID } = require('crypto');
// external
const _ = require('lodash');
const { Log } = require('../log');

module.exports = class Model {
    #fieldNames = [];

    constructor() {}

    init(jsonInputObj) {
        let me = this;

        if (!_.isEmpty(jsonInputObj) && _.isObjectLike(jsonInputObj)) {
            me.setFieldsFromObject(jsonInputObj);
        }
        else {
            me.fields.forEach((field) => {
                if (field.name === 'id') field.value = randomUUID();
            });
        }
        me.#setFieldNames();
    }

    setFieldsFromObject(jsonInputObj) {
        let me = this;

        for (let i = 0; i < me.fields.length; i++) {
            let value = jsonInputObj[me.fields[i].name];

            if (this.fields[i].name === 'id' && _.isUndefined(value)) value = randomUUID();
            else {
                value = me.getValueDataTyped(me.fields[i].type, value);
                value = me.getFieldDefaultValue(me.fields[i], value);
            }

            this.fields[i].value = value;
        }
    }

    getModelType() {
        return this.constructor.name;
    }

    get(fieldName) {
        if (_.isUndefined(this.#fieldNames) || this.#fieldNames.length < 1) this.#setFieldNames();

        let value = this.#getValue(fieldName),
            defaultValue = this.getFieldDefaultValue(this.fields[this.#fieldNames.indexOf(fieldName)], value);
        if (_.isEmpty(value) && !_.isEmpty(defaultValue))
            value = defaultValue;

        return value;
    }

    #getValue(fieldName) {
        let value = undefined;
        for (let i = 0; i < this.fields.length; i++) {
            if (this.fields[i].name === fieldName) {
                value = this.fields[i].value;
                break;
            }
        }
        return value;
    }

    set(fieldName, value) {
        return this.#setValue(fieldName, value);
    }

    #setValue(fieldName, value) {
        let me = this;

        for (let i = 0; i < me.fields.length; i++) {
            if (this.fields[i].name === fieldName) {
                let type = me.fields[i].type;
                if (!_.isEmpty(me.fields[i].type)) {
                    try {
                        value = me.getValueDataTyped(type, value);
                        value = me.getFieldDefaultValue(me.fields[i], value);
                        this.fields[i].value = value;
                    } catch (ex) {
                        Log.error(`Value passed ${value} does not match data type ${type}.`);
                    }
                } else {
                    this.fields[i].value = value;
                }
                break;
            }
        }
    }

    getValueDataTyped(type, value) {
        try {
            if (type === 'int') {
                value = parseInt(value);
            } else if (type === 'float') {
                value = parseFloat(value);
            } else if (type === 'array') {
                if (!_.isArray(value)) value = [value];
            } else if (type === 'object') {
                if (!_.isObject(value)) value = { converted: value };
            } else if (type === 'date') {
                if (!_.isDate(value) && _.isString(value)) value = Date.parse(value);
            } else if (type === 'boolean') {
                if (!_.isBoolean(value)) value = Boolean(value);
            }
        } catch (ex) {
            Log.error(`Value passed ${value} does not match data type ${type}.`);
        }

        return value;
    }

    getFieldDefaultValue(field, value) {
        if (_.isNull(value) || _.isUndefined(value) || _.isNaN(value)) {
            if (!_.isUndefined(field.defaultValue) && !_.isNull(field.defaultValue)) {
                if (_.isFunction(field.defaultValue)) {
                    value = field.defaultValue();
                }
                else
                    value = field.defaultValue;
            }
        }
        return value;
    }

    getData() {
        return this.#getJsonObj();
    }

    toJsonObj() {
        return this.#getJsonObj();
    }

    get json() {
        return this.#getJsonObj();
    }

    #getJsonObj(genEmpty = false) {
        let jsonObj = {};
        this.fields.forEach((field) => {
            let value = field.value;
            if (genEmpty && field.name !== 'id') {
                if (!_.isEmpty(field.defaultValue) || _.isArray(field.defaultValue) || _.isObject(field.defaultValue)) value = field.defaultValue;
            }

            // if (field.name === 'events')
            //     jsonObj[field.name] = Object.assign({}, {}, ...value);
            // else
            jsonObj[field.name] = value;
        });

        return jsonObj;
    }

    getFields(includeEmpty = true) {
        if (includeEmpty) {
            return this.fields;
        }
        const fields = []; //new Map();
        for (let key of this.fields.keys()) {
            let field = this.fields.get(key);
            if (field && field.value !== undefined) {
                fields.push(field);
            }
        }
        return fields;
    }

    getFieldNames() {
        return this.#fieldNames;
    }

    #setFieldNames(asObject = false) {
        if (asObject) {
            const fields = {};
            this.getFields().forEach((field) => (fields[field.name] = field.column));
            return fields;
        }
        this.#fieldNames = Array.from(this.getFields().values()).map((field) => field.name);
    }

    fields = [];
};
