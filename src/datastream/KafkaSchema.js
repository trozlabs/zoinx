const _ = require('lodash');
const Log = require('../log/Log');
const KafkaStatics = require('./KafkaStatics');
const { SchemaRegistryClient,
    ClientConfig,
    SerdeType,
    AvroSerializer,
    AvroDeserializer,
    JsonSerializer,
    JsonDeserializer,
    ProtobufSerializer,
    ProtobufDeserializer,
    RuleMode } = require("@confluentinc/schemaregistry");
const ProtobufHandler = require('./ProtobufHandler');


module.exports = class KafkaSchema {

    #registry
    #schema
    #schemaCache
    #piiFields

    constructor(schemaRegistryUrl, auth={}) {
        if (_.isEmpty(schemaRegistryUrl)) {
            Log.warn('Schema Registry URL must be provided');
            return;
        }

        const clientConfig = {
            baseURLs: [schemaRegistryUrl],
            createAxiosDefaults: {timeout: 10000},
            cacheCapacity: 512,
            cacheLatestTtlSecs: 60,
        };
        if (_.isObject(auth) && !_.isEmpty(auth))
            clientConfig.basicAuthCredentials = auth;

        this.#registry = new SchemaRegistryClient(clientConfig)
        this.#schemaCache = new Map();
    }

    get piiFields() {
        return this.#piiFields;
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

            if (_.isEmpty(this.#schema))
                this.#schema = (version === 'latest') ? await this.#registry.getLatestSchemaMetadata(subject) : await this.#registry.getSchemaMetadata(subject, version);
            let validatorFn, serializer, deserializer;

            this.#piiFields = await this.extractPIIFields(JSON.parse(this.#schema.schema));

            switch (this.#schema.schemaType) {
                case undefined:
                {
                    serializer = new AvroSerializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    deserializer = new AvroDeserializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    let [avroType, deps] = await serializer.toType(this.#schema);
                    validatorFn = (message) => {
                        let valid = avroType.isValid(message);
                        if (!valid) {
                            Log.warn('Message does not conform to AVRO schema');
                        }
                        return valid;
                    };
                }
                    break;

                case 'JSON':
                {
                    // This validation seems to allow properties that are not defined
                    // but if defined properties are absent, it will fail validation
                    serializer = new JsonSerializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    deserializer = new JsonDeserializer(this.#registry, SerdeType.VALUE, { useLatestVersion: true });
                    const validate = await serializer.toValidateFunction(this.#schema);
                    validatorFn = async (message) => {
                        let valid = validate(message);
                        try {
                            if (validate != null && !valid) {
                                Log.warn(`Message does not conform to JSON schema`);
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
                    const pbh = await ProtobufHandler.create(this.#schema.schema);
                    serializer = pbh;
                    deserializer = pbh;
                    validatorFn = (message) => {
                        let valid = pbh.validate(message);
                        try {
                            if (!valid) {
                                Log.warn(`Message does not conform to PROTOBUF schema`);
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
                    Log.warn(`Unsupported schema type: ${this.#schema.schemaType}`);
            }

            this.#schemaCache.set(this.#schema.id, {
                schema: this.#schema,
                validator: validatorFn,
                serializer: serializer,
                deserializer: deserializer,
                topic: topic,
                subject: subject
            });
            return this.#schema.id;
        }
        catch (e) {
            Log.error(e);
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
                Log.error(e);
            }
        }
        else
            Log.warn('A topic name must be supplied to find a schema by topic.');

        return undefined;
    }

    async initByTopic(topic, options = {}) {
        const { isKey = false, version = 'latest' } = options;
        const subject = KafkaStatics.inferSubjectName(topic, isKey);
        const schemaId = await this.#getSchemaIdByTopicFromCache(topic);
        if (schemaId) {
            return schemaId;
        }
        else {
            return await this.#loadSchema(topic, subject, version);
        }
    }

    async isMessageValid(schemaId, message={}){
        try {
            if (!_.isNumber(schemaId)) {
                Log.warn(`schemaId must be a number to check validity: ${schemaId}`);
            }
            else {
                const cachedSchema = this.#schemaCache.get(schemaId);
                return await cachedSchema.validator(message);
            }
        }
        catch (e) {
            Log.error(e);
        }

        return false;
    }

    async serializeMessage(schemaId, message={}){
        let serialized;

        try {
            if (!_.isNumber(schemaId)) {
                Log.warn('schemaId must be a number to serialize.')
            }
            else {
                const cachedSchema = this.#schemaCache.get(schemaId);
                serialized = await cachedSchema.serializer.serialize(cachedSchema.topic, message);
            }
        }
        catch (e) {
            Log.error(e);
        }

        return serialized;
    }

    async deserializeMessage(schemaId, serializedMessage=[]){
        let deserialized;

        try {
            if (!_.isNumber(schemaId)) {
                Log.warn('schemaId must be a number to deserialize.')
            }
            else {
                const cachedSchema = this.#schemaCache.get(schemaId);
                deserialized = await cachedSchema.deserializer.deserialize(cachedSchema.topic, serializedMessage);
            }
        }
        catch (e) {
            Log.error(e);
        }

        return deserialized;
    }

    async extractPIIFieldsTopLevel(schema) {
        if (_.isEmpty(schema?.fields)) return [];

        return schema.fields
            .filter(f => f.tags && f.tags.includes('PII'))
            .map(f => f.name)
    }

    async extractPIIFields(schema, prefix = '') {
        let piiPaths = []

        if (!schema.fields) return piiPaths

        for (const field of schema.fields) {
            const fieldPath = prefix ? `${prefix}.${field.name}` : field.name

            // If this field itself is tagged as PII
            if (field.tags && field.tags.includes('PII')) {
                piiPaths.push(fieldPath)
            }

            // If this field is a nested record type
            if (typeof field.type === 'object') {
                // Avro "record"
                if (field.type.type === 'record') {
                    piiPaths = piiPaths.concat(
                        extractPIIFields(field.type, fieldPath)
                    )
                }

                // Avro "array" of records
                if (field.type.type === 'array' && typeof field.type.items === 'object') {
                    if (field.type.items.type === 'record') {
                        piiPaths = piiPaths.concat(
                            extractPIIFields(field.type.items, fieldPath + '[]')
                        )
                    }
                }

                // Avro "map" of records
                if (field.type.type === 'map' && typeof field.type.values === 'object') {
                    if (field.type.values.type === 'record') {
                        piiPaths = piiPaths.concat(
                            extractPIIFields(field.type.values, fieldPath + '{}')
                        )
                    }
                }
            }
        }

        return piiPaths
    }
}
