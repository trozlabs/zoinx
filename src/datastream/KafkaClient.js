const _ = require('lodash');
const { Logger } = require('../logger');
const { StaticUtil } = require('../util');
const KafkaStatics = require('./KafkaStatics');
const KafkaSchema = require('./KafkaSchema');
const { Kafka,
    logLevel,
    CompressionTypes
} = require("@confluentinc/kafka-javascript").KafkaJS;

module.exports = class KafkaClient {

    logger = Logger.create({ name: 'KafkaClient' });

    #logOptions = false;
    #clientId = '';
    #brokers = [];
    #config = {};
    #schemaServer;
    #schemaServerAuth;
    #kafkaClient;
    #producer;
    #producerIsConnected = false;
    #consumer;
    #connectionTimeout = 3000;
    #initialRetryTime = 10000;
    #retries = 3;

    constructor(clientId = 'ZoinxClient', brokers = ['localhost:9092'], env = 'dev', logOptions = false) {
        if (!_.isEmpty(clientId) && _.isString(clientId)) this.#clientId = clientId;
        if (!_.isEmpty(brokers) && _.isArray(brokers)) this.#brokers = brokers;
        if (_.isEmpty(env)) env = 'DEV';
        this.#logOptions = logOptions;
    }

    async setSchemaConfig(schemaServer='http://localhost:8081', auth={}, logOptions = false){
        if(StaticUtil.isHttpURI(schemaServer)) {
            if (!_.isEmpty(auth) && _.isObject(auth)) this.#schemaServerAuth = auth;
            this.#schemaServer = new KafkaSchema(schemaServer);
        }
        else
            this.logger.warn(`URL to Schema Server is invalid: ${schemaServer}`);
    }

    async setClientConfig(varNamePrefix='DEFAULT_KAFKA', env='DEV', ssl=true) {

        if (_.isEmpty(varNamePrefix) || _.isEmpty(env)) {
            this.logger.warn('Must supply a topic prefix for the ENV vars and supply an environment name.');
        }
        else {
            try {
                if (_.isString(ssl)) ssl = StaticUtil.StringToBoolean(ssl);
                let { mech, protocol, user, pwd} = KafkaStatics.getKafkaSSLProps(varNamePrefix, env);

                let kafkaJS = {
                    brokers: this.#brokers,
                    clientId: this.#clientId,
                    ssl: ssl,
                    retry: {
                        initialRetryTime: this.#initialRetryTime,
                        retries: this.#retries
                    },
                    logLevel: logLevel.ERROR,
                    connectionTimeout: this.#connectionTimeout,
                    authenticationTimeout: 1000,
                    allowAutoTopicCreation: false,
                    acks: 1,
                    compression: CompressionTypes.GZIP
                }

                if (!_.isEmpty(mech) && !_.isEmpty(protocol) && !_.isEmpty(user) && !_.isEmpty(pwd)) {
                    kafkaJS.sasl = {
                        mechanism: mech,
                        protocol: protocol,
                        username: user,
                        password: pwd
                    }
                }

                if (this.#logOptions) {
                    this.logger.banner('KafkaClient Config', '+');
                    this.logger.json(kafkaJS);
                }

                this.#kafkaClient = new Kafka({kafkaJS});
                this.#config = kafkaJS;
            }
            catch (e) {
                this.logger.error(e);
            }
        }
    }


    async getBrokers() {
        return this.#kafkaClient.getBrokers();
    }


    async #createProducer() {
        try {
            if (_.isObject(this.#kafkaClient) && !this.#producerIsConnected) {
                this.#producer = await this.#kafkaClient.producer();
            }
        } catch (e) {
            this.logger.error(e.message);
        }
    }

    async connectProducer() {
        try {
            await this.#producer.connect();
            this.#producerIsConnected = true;
        }
        catch (e) {
            this.logger.error(e.message);
            throw e;
        }
    }

    async disconnectProducer() {
        await this.#producer.disconnect();
        this.#producerIsConnected = false;
    }

    async sendMessage(message = { value: 'Hello Kafka user!' }, topicName = 'dev-topic') {
        try {
            if (_.isEmpty(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();

            await this.#producer.send({
                topic: topicName,
                messages: [message]
            });
        }
        catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

    async sendValidatedMessage(message = { value: 'Hello Kafka user!' }, topicName = 'dev-topic') {
        try {
            if (_.isEmpty(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();

            const schemaId = await this.#schemaServer.initByTopic(topicName);
            if (_.isNumber(schemaId) && await this.#schemaServer.isMessageValid(schemaId, message)) {
                let serializedMsg = await this.#schemaServer.serializeMessage(schemaId, message);
                return await this.#producer.send({
                    topic: topicName,
                    messages: [{ value: serializedMsg } ]
                });
            }
            else
                this.logger.warn(`Message failed schema validation on topic: ${topicName} or has an incorrect schemaId: ${schemaId}.`);
        }
        catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

    get producerIsConnected() {
        return this.#producerIsConnected;
    }

    async sendMessageBatch(messages=[], topicName='dev-topic') {
        if (_.isEmpty(messages) || !_.isArray(messages)) {
            this.logger.warn('No topic messages provided.')
            return;
        }

        try {
            if (_.isEmpty(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();

            const kafkaMessages = messages.map((message) => {
                return {
                    value: JSON.stringify(message)
                }
            })

            const topicMessages = {
                topic: topicName,
                messages: kafkaMessages
            }

            const batch = {
                topicMessages: [topicMessages]
            }

            return await this.#producer.sendBatch(batch);
        }
        catch (e) {
            this.logger.error(e);
        }
    }

    async sendValidatedMessageBatch(messages=[], topicName='dev-topic', idProp='id') {
        if (_.isEmpty(messages) || !_.isArray(messages)) {
            this.logger.warn('No topic messages provided.')
            return;
        }

        let batchResults = '';

        try {
            if (_.isEmpty(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();

            let sendResults = {
                success: [],
                failure: []
            };

            for await (const msg of messages) {
                try {
                    await this.sendValidatedMessage(msg, topicName);
                    sendResults.success.push(msg[idProp]);
                }
                catch (e) {
                    sendResults.failure.push({
                        message: msg,
                        error_code: e.errno,
                        error_msg: e.message
                    })
                }
            }

            await this.#producer.flush({timeout: 5000});
            batchResults = sendResults;
        }
        catch (e) {
            this.logger.error(e.message);
        }

        return batchResults;
    }

    async #createConsumer() {
        try {
            if (_.isObject(this.#kafkaClient)) {
                this.#consumer = this.#kafkaClient.consumer({ groupId: this.#clientId });
            }
        } catch (e) {
            this.logger.error(e.message);
        }
    }

    get consumer() {
        return this.#consumer;
    }

    async prepareConsumer(topicName = 'dev-topic', fromBeginning = false) {
        if (_.isEmpty(this.#consumer)) await this.#createConsumer();
        await this.#consumer.connect();
        await this.#consumer.subscribe({ topic: topicName, fromBeginning: fromBeginning });
        return this.#consumer;
    }

    async readMessage(topicName, calllbackFunc, fromBeginning = false) {
        let msgObj = {},
            payload;
        try {
            if (_.isEmpty(topicName) || !_.isFunction(calllbackFunc)) {
                this.logger.warn(`No topic name or callback provided for consumer,  ${this.#clientId}`);
                return;
            }

            await this.prepareConsumer(topicName, fromBeginning);

            this.#consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    this.msgObj = {
                        offset: message.offset,
                        key: message.key?.toString(),
                        value: message.value?.toString(),
                        headers: message.headers
                    }

                    if (this.#logOptions)
                        this.logger.log(JSON.stringify(this.msgObj));

                    if (_.isFunction(calllbackFunc))
                        calllbackFunc(this.msgObj);
                    else
                        this.logger.warn('No callback function defined to process messages.');
                }
            });
        }
        catch (e) {
            this.logger.error(e.message);
        }
    }

    async disconnectConsumer(topicName = 'dev-topic') {
        await this.#consumer.disconnect(topicName);
    }

}
