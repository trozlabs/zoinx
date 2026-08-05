const _ = require('lodash');
const Log = require('../log/Log')
const StaticUtil = require('../util/StaticUtil');
const KafkaStatics = require('./KafkaStatics');
const KafkaSchema = require('./KafkaSchema');
const crypto = require("crypto");
const {
    Kafka,
    logLevel,
    CompressionTypes
} = require("@confluentinc/kafka-javascript").KafkaJS;

module.exports = class KafkaClient {

    #ProducerState = Object.freeze({
        INIT: 0,
        CONNECTING: 1,
        INITIALIZING_TRANSACTIONS: 2,
        INITIALIZED_TRANSACTIONS: 3,
        CONNECTED: 4,
        DISCONNECTING: 5,
        DISCONNECTED: 6,
    });

    #producerConnectPromise
    #logOptions = false
    #clientId = ''
    #brokers = []
    #config = {}
    #schemaServer
    #schemaServerAuth
    #kafkaClientConfig
    #kafkaClient
    #producer
    #producerConfig
    #producerIsConnected = false
    #consumer
    #consumerConfig
    #connectionTimeout = 30000
    #initialRetryTime = 10000
    #retries = 3

    constructor(clientId = 'ZoinxClient', brokers = ['localhost:9092'], env = 'dev', logOptions = false) {
        if (!_.isEmpty(clientId) && _.isString(clientId)) this.#clientId = clientId;
        if (!_.isEmpty(brokers) && _.isArray(brokers)) this.#brokers = brokers;
        if (_.isEmpty(env)) env = 'DEV';
        this.#logOptions = logOptions;
    }

    async setSchemaConfig(schemaServer = 'http://localhost:8081', auth = {}, logOptions = false) {
        if (StaticUtil.isHttpURI(schemaServer)) {
            if (!_.isEmpty(auth) && _.isObject(auth))
                this.#schemaServerAuth = auth;

            this.#schemaServer = new KafkaSchema(schemaServer, auth);
        } else
            Log.warn(`URL to Schema Server is invalid: ${schemaServer}`);
    }

    async sendMessages(topic, message = {}) {
        try {
            const res = []
            for (let i = 0; i < 1; i++) {
                res.push(this.#producer.send({
                    topic: topic,
                    messages: [
                        {
                            value: Buffer.from(JSON.stringify(message)),
                            key: crypto.randomUUID()
                        }
                    ]
                }));
            }
            await Promise.all(res);

            await this.#producer.disconnect();
            console.log("Disconnected successfully");
        }
        catch (e) {
            Log.error(e);
        }
    }

    async setClientConfig(varNamePrefix = 'DEFAULT_KAFKA', env = 'DEV', ssl = true) {
        if (_.isEmpty(varNamePrefix) || _.isEmpty(env)) {
            Log.warn('Must supply a topic prefix for the ENV vars and supply an environment name.');
        }
        else {
            try {
                if (_.isString(ssl)) ssl = StaticUtil.StringToBoolean(ssl);
                let {mech, protocol, user, pwd} = await KafkaStatics.getKafkaSSLProps(varNamePrefix, env);

                this.#kafkaClient = new Kafka();
                this.#kafkaClientConfig = {
                    'bootstrap.servers': this.#brokers,
                    'security.protocol': protocol,
                    'sasl.mechanisms': mech,
                    'sasl.username': user,
                    'sasl.password': pwd
                }

                this.#producerConfig = {
                    // Advanced Performance Optimization
                    'acks': 'all',                         // Complete consistency safety
                    'enable.idempotence': true,            // Guarantee no network message duplication
                    'compression.codec': 'zstd',           // Modern, rapid compression ratio
                    'linger.ms': 20,                       // Force 20ms of micro-batching lag
                    'batch.size': 131072,                  // Bump individual batch limit to 128 KB
                    'queue.buffering.max.messages': 500000 // Buffer more local memory backpressure
                }

                this.#consumerConfig = {
                    // Modern Group Management (KIP-848)
                    'group.id': this.#clientId,
                    'group.protocol': 'consumer',               // Unlocks next-gen server-side rebalancing
                    //'partition.assignment.strategy': 'cooperative-sticky', // Smooth partition handoffs

                    // Offset Management & Position Fallbacks
                    'auto.offset.reset': 'earliest',            // Read from start if no committed offset exists
                    'enable.auto.commit': true,                 // Background auto-commit enabled
                    'auto.commit.interval.ms': 5000,            // Flush offsets every 5 seconds

                    // Broker Fetch Optimization (Throughput Tuning)
                    'fetch.min.bytes': 65536,                   // Wait for 64KB of data before responding
                    'fetch.wait.max.ms': 500,                   // Or reply anyway after 500ms max
                    'max.poll.interval.ms': 300000              // Give eachMessage 5 mins to finish processing
                }
            }
            catch (e) {
                Log.error(e);
            }
        }
    }

    async getBrokers() {
        return this.#kafkaClient.getBrokers();
    }

    get brokers() {
        return this.#brokers;
    }

    async #createProducer() {
        try {
            if (_.isObject(this.#kafkaClient) && !this.#producerIsConnected) {
                this.#producer = this.#kafkaClient.producer(Object.assign({}, this.#kafkaClientConfig, this.#producerConfig));
            }
        } catch (e) {
            Log.error(e.message);
        }
    }

    async connectProducer() {
        try {
            if (_.isUndefined(this.#producerConnectPromise)) {
                this.#producerConnectPromise = this.#producer.connect();
            }
            await this.#producerConnectPromise;
            this.#producerIsConnected = true;
        } catch (e) {
            Log.error(e.message);
            throw e;
        }
    }

    async disconnectProducer() {
        this.#producer.disconnect();
        this.#producerIsConnected = false;
    }

    async sendMessage(message = {value: 'Hello Kafka user!'}, topicName = 'dev-topic', key = {}) {
        try {
            if (_.isUndefined(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();
            if (_.isEmpty(key)) key = crypto.randomUUID();

            await this.#producer.send({
                topic: topicName,
                messages: [
                    {
                        value: Buffer.from(JSON.stringify(message)),
                        key: key
                    }
                ]
            });
        }
        catch (e) {
            Log.error(e);
            throw e;
        }
    }

    async sendValidatedMessage(message = {value: 'Hello Kafka user!'}, topicName = 'dev-topic', key = {}) {
        try {
            if (_.isUndefined(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();
            if (_.isEmpty(key)) key = crypto.randomUUID();

            const schemaId = await this.#schemaServer.initByTopic(topicName);
            if (_.isNumber(schemaId) && await this.#schemaServer.isMessageValid(schemaId, message)) {
                let serializedMsg = await this.#schemaServer.serializeMessage(schemaId, message);
                return await this.#producer.send({
                    topic: topicName,
                    messages: [
                        {
                            value: serializedMsg,
                            key: key
                        }
                    ]
                });
            }
            else
                Log.warn(`Message failed schema validation on topic: ${topicName} or has an incorrect schemaId: ${schemaId}.`);
        } catch (e) {
            Log.error(e);
            throw e;
        }
    }

    get producerIsConnected() {
        return this.#producerIsConnected;
    }

    async sendMessageBatch(messages = [], topicName = 'dev-topic', idProp = 'id', validate=false) {
        if (_.isEmpty(messages) || !_.isArray(messages)) {
            Log.warn('No topic messages provided.')
            return;
        }

        try {
            if (_.isUndefined(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();
            const sendResults = [];
            const success = [];
            const failure = [];

            const batchPromises = messages.map(async (message) => {
                const id = crypto.randomUUID();
                sendResults.push({
                    id,
                    idProp: message[idProp],
                    message,
                    success: false
                });

                const msg = (_.isBoolean(validate) && validate) ? await this.#serializeMessage(message, topicName) : Buffer.from(JSON.stringify(message));

                return {
                    key: id ,
                    value: msg
                };
            });
            const batch = await Promise.all(batchPromises);

            try {
                const metadata = await this.#producer.send({
                    topic: topicName,
                    messages: batch
                });

                sendResults.forEach(res => {
                    success.push(res.idProp);
                });
            }
            catch (err) {
                sendResults.forEach(res => {
                    failure.push({
                        success: false,
                        message: res.message,
                        error_code: err.code,
                        error_msg: err.message
                    })
                }, err);
            }

            return {
                success,
                failure
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #serializeMessage(message='', topicName='dev-topic') {
        try {
            const schemaId = await this.#schemaServer.initByTopic(topicName);
            if (_.isNumber(schemaId) && await this.#schemaServer.isMessageValid(schemaId, message)) {
                return await this.#schemaServer.serializeMessage(schemaId, message);
            }
        }
        catch (e) {
            Log.error(e);
        }
        return message;
    }

    async #deserialzeMessage(message='', topicName='dev-topic') {
        try {
            const schemaId = await this.#schemaServer.initByTopic(topicName);
            if (_.isNumber(schemaId)) {
                return await this.#schemaServer.deserializeMessage(schemaId, message);
            }
        }
        catch (e) {
            Log.error(e);
        }
        return message;
    }

    async sendValidatedMessageBatch(messages = [], topicName = 'dev-topic', idProp = 'id') {
        if (_.isEmpty(messages) || !_.isArray(messages)) {
            Log.warn('No topic messages provided.')
            return;
        }

        try {
            return this.sendMessageBatch(messages, topicName, idProp, true);
        }
        catch (e) {
            Log.error(e.message);
        }

        return [];
    }

    async #createConsumer(fromBeginning = false) {
        try {
            if (_.isObject(this.#kafkaClient)) {
                this.#config.groupId = this.#clientId
                this.#config.fromBeginning = fromBeginning;
                delete this.#config.acks;
                delete this.#config.compression;
                this.#consumer = this.#kafkaClient.consumer(Object.assign({}, this.#kafkaClientConfig, this.#consumerConfig));
            }
        } catch (e) {
            Log.error(e.message);
        }
    }

    get consumer() {
        return this.#consumer;
    }

    async prepareConsumer(topicName = 'dev-topic', fromBeginning = false) {
        if (_.isEmpty(this.#consumer)) await this.#createConsumer(fromBeginning);
        await this.#consumer.connect();
        await this.#consumer.subscribe({topic: topicName, fromBeginning: fromBeginning});
        return this.#consumer;
    }

    async readMessage(topicName, calllbackFunc, fromBeginning = false) {
        let msgObj = {},
            payload;
        try {
            if (_.isEmpty(topicName) || !_.isFunction(calllbackFunc)) {
                Log.warn(`No topic name or callback provided for consumer,  ${this.#clientId}`);
                return;
            }

            await this.prepareConsumer(topicName, fromBeginning);

            this.#consumer.run({
                eachMessage: async ({topic, partition, message}) => {
                    message.value = await this.#deserialzeMessage(message.value, topicName);
                    this.msgObj = {
                        offset: message.offset,
                        key: message.key?.toString(),
                        value: message.value?.toString(),
                        headers: message.headers
                    }

                    if (this.#logOptions)
                        Log.log(JSON.stringify(this.msgObj));

                    if (_.isFunction(calllbackFunc))
                        calllbackFunc(this.msgObj);
                    else
                        Log.warn('No callback function defined to process messages.');
                }
            });
        } catch (e) {
            Log.error(e.message);
        }
    }

    async disconnectConsumer(topicName = 'dev-topic') {
        await this.#consumer.disconnect(topicName);
    }

}
