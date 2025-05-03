const _ = require('lodash');
const { Logger } = require('../logger');
const KafkaStatics = require('./KafkaStatics');
const protobuf = require('protobufjs');

module.exports = class ProtobufHandler {

    logger = Logger.create({ name: 'ProtobufHandler' });

    #root
    #messagePaths
    #messageObjects = []

    constructor() {}

    static async create(schemaString) {
        const instance = new ProtobufHandler();
        await instance.initialize(schemaString);
        return instance;
    }

    async initialize(schemaString) {
        if (_.isEmpty(schemaString) || !_.isString(schemaString)) {
            this.logger.warn('A schemaString must be provided to use ProtobufHandler');
            return;
        }

        try {
            const parsed = protobuf.parse(schemaString);
            this.#root = parsed.root;
            this.#messagePaths = await KafkaStatics.getAllProtobufMessageNames(this.#root);
            for await (const path of this.#messagePaths) {
                let msgObj = await this.#root.lookupType(path);
                let required = await KafkaStatics.getRequiredFields(msgObj);
                this.#messageObjects.push({message: msgObj, required: required});
            }
        }
        catch (e) {
            this.logger.error(e.message);
        }
    }

    get root() {
        return this.#root;
    }

    get messageObjects() {
        return this.#messageObjects;
    }

    validate(json) {
        const errMsg = this.#messageObjects[0].message.verify(json);
        if (errMsg) {
            this.logger.error(`Validation error: ${errMsg}`);
            return false;
        }

        for (const field of  this.#messageObjects[0].required) {
            if (json[field] === undefined || json[field] === null || json[field] === '') {
                this.logger.error(`Missing required field: ${field}`);
                return false;
            }
        }
        return true;
    }

    // topic is here to match the signatures of the other schema formats
    serialize(topic, json) {
        if (this.validate(json)) {
            const message = this.#messageObjects[0].message.create(json);
            return this.#messageObjects[0].message.encode(message).finish();
        }
    }

    // topic is here to match the signatures of the other schema formats
    deserialize(topic, buffer) {
        const message = this.#messageObjects[0].message.decode(buffer);
        return this.#messageObjects[0].message.toObject(message, {
            defaults: true,
        });
    }
}
