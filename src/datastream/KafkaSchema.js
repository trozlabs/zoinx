const _ = require('lodash');
const { Logger } = require('../logger');
const KafkaStatics = require('./KafkaStatics');
const { SchemaRegistryClient,
    SerdeType,
    AvroSerializer,
    AvroDeserializer,
    JsonSerializer,
    JsonDeserializer,
    ProtobufSerializer,
    ProtobufDeserializer
} = require("@confluentinc/schemaregistry");
const ProtobufHandler = require('./ProtobufHandler');


module.exports = class KafkaSchema {

    logger = Logger.create({ name: 'KafkaSchema' });
    static testConfig = {};

    #registry
    #schemaCache

    constructor(schemaRegistryUrl) {
        if (_.isEmpty(schemaRegistryUrl)) {
            this.logger.warn('Schema Registry URL must be provided');
            return;
        }
        this.#registry = new SchemaRegistryClient({
            baseURLs: [schemaRegistryUrl]
        })
        this.#schemaCache = new Map();
    }

    async #loadSchema(topic, subject, version = 'latest') {
        try {
            if (!_.isEmpty(version) && _.isString(version)) {
                version = 'latest';
            }
            else {
                version = parseInt(version)
                version = (_.isNaN(version)) ? -1 : version;
            }

            const schema = (version === 'latest') ? await this.#registry.getLatestSchemaMetadata(subject) : await this.#registry.getSchemaMetadata(subject, version);
            let validatorFn, serializer, deserializer;

            switch (schema.schemaType) {
                case undefined:
                {
                    serializer = new AvroSerializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    deserializer = new AvroDeserializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    let [avroType, deps] = await serializer.toType(schema);
                    validatorFn = (message) => {
                        let valid = avroType.isValid(message);
                        if (!valid) {
                            this.logger.warn('Message does not conform to AVRO schema');
                        }
                        return valid;
                    };
                }
                    break;

                case 'JSON':
                {
                    // This validation seems to allow properties that are not defined
                    // but if defined properties absent, it will fail validation
                    serializer = new JsonSerializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    deserializer = new JsonDeserializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    const validate = await serializer.toValidateFunction(schema);
                    validatorFn = async (message) => {
                        let valid = validate(message);
                        try {
                            if (validate != null && !valid) {
                                this.logger.warn(`Message does not conform to JSON schema`);
                            }
                        }
                        catch (e) {
                            console.log(e);
                            valid = false;
                        }
                        return valid;
                    };
                }
                    break;

                case 'PROTOBUF':
                {
                    const pbh = await ProtobufHandler.create(schema.schema);
                    serializer = pbh;
                    deserializer = pbh;
                    validatorFn = (message) => {
                        let valid = pbh.validate(message);
                        try {
                            if (!valid) {
                                this.logger.warn(`Message does not conform to PROTOBUF schema`);
                            }
                        }
                        catch (e) {
                            console.log(e);
                            valid = false;
                        }
                        return valid;
                    };
                }
                    break;

                default:
                    this.logger.warn(`Unsupported schema type: ${schema.schemaType}`);
            }

            this.#schemaCache.set(schema.id, {
                schema: schema,
                validator: validatorFn,
                serializer: serializer,
                deserializer: deserializer,
                topic: topic,
                subject: subject
            });
            return schema.id;
        }
        catch (e) {
            this.logger.error(e);
        }

        return undefined;
    }

    async #getSchemaIdByTopicFromCache(topic) {
        if (!_.isEmpty(topic) && _.isString(topic)) {
            try {
                if (this.#schemaCache.size > 0) {
                    for await (const item of this.#schemaCache) {
                        if (this.#schemaCache.get(item[0]).topic === topic) {
                            return item[0];
                        }
                    }
                }
            }
            catch (e) {
                this.logger.error(e);
            }
        }
        else
            this.logger.warn('A topic name must be supplied to find a schema by topic.');

        return undefined;
    }

    async initByTopic(topic, options = {}) {
        const { isKey = false, version = 'latest' } = options;
        const subject = KafkaStatics.inferSubjectName(topic, isKey);
        const schemaId = await this.#getSchemaIdByTopicFromCache(topic);
        if (schemaId)
            return schemaId;
        else
            return await this.#loadSchema(topic, subject, version);
    }

    async isMessageValid(schemaId, message={}){
        try {
            if (!_.isNumber(schemaId)) {
                this.logger.warn('schemaId must be a number to check validity.')
            }
            else {
                const cachedSchema = this.#schemaCache.get(schemaId);
                return cachedSchema.validator(message);
            }
        }
        catch (e) {
            this.logger.error(e);
        }

        return false;
    }

    async serializeMessage(schemaId, message={}){
        let serialized;

        try {
            if (!_.isNumber(schemaId)) {
                this.logger.warn('schemaId must be a number to serialize.')
            }
            else {
                const cachedSchema = this.#schemaCache.get(schemaId);
                serialized = cachedSchema.serializer.serialize(cachedSchema.topic, message);
            }
        }
        catch (e) {
            this.logger.error(e);
        }

        return serialized;
    }

    async deserializeMessage(schemaId, serializedMessage=[]){
        let deserialized;

        try {
            if (!_.isNumber(schemaId)) {
                this.logger.warn('schemaId must be a number to deserialize.')
            }
            else {
                const cachedSchema = this.#schemaCache.get(schemaId);
                deserialized = cachedSchema.deserializer.deserialize(cachedSchema.topic, serializedMessage);
            }
        }
        catch (e) {
            this.logger.error(e);
        }

        return deserialized;
    }

}
