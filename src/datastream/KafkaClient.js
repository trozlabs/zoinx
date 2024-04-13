const _ = require('lodash');
const { Kafka, logLevel } = require('kafkajs');
const Log = require('../log/Log');
const AppConfig = require('../util/AppConfig');
const StaticUtil = require('../util/StaticUtil');

module.exports = class KafkaClient {
    #logOptions = false;
    #clientId = '';
    #brokers = [];
    #kafkaClient;
    #producer;
    #producerIsConnected = false;
    #consumer;
    #connectionTimeout = 3000;
    #initialRetryTime = 10000;
    #retries = 3;

    constructor(clientId = 'ZoinxClient', brokers = ['localhost:9092'], env='dev',  logOptions = false) {
        this.logger = require('../logger/Logger').create({ name: this.constructor.name });

        if (!_.isEmpty(clientId) && _.isString(clientId)) this.#clientId = clientId;
        if (!_.isEmpty(brokers) && _.isArray(brokers)) this.#brokers = brokers;
        if (_.isEmpty(env)) env = 'dev';
        this.#logOptions = logOptions;

        try {
            if (!_.isEmpty(this.#clientId) && this.#brokers.length > 0) {
                if (this.#logOptions) {
                    Log.info('+++++++++ KafkaClient Constructor +++++++++');
                    Log.info(`clientId: ${this.#clientId}`);
                    Log.info(`brokers : ${this.#brokers}`);
                    Log.info('');
                }
            }
        } catch (e) {
            Log.error(e.message);
        }
    }

    async setClientConfig(varNamePrefix='DEFAULT_KAFKA', env='dev', ssl=true) {

        if (!_.isEmpty(varNamePrefix)) {
            try {
                if (_.isString(ssl)) ssl = StaticUtil.StringToBoolean(ssl);
                let mech = AppConfig.get(`${varNamePrefix}_MECHANISM_${env.toUpperCase()}`),
                    protocal = AppConfig.get(`${varNamePrefix}_PROTOCOL_${env.toUpperCase()}`),
                    user = AppConfig.get(`${varNamePrefix}_USER_${env.toUpperCase()}`),
                    pwd = AppConfig.get(`${varNamePrefix}_PWD_${env.toUpperCase()}`);

                mech = (_.isEmpty(mech) || mech === 'undefined') ? '' : mech;
                protocal = (_.isEmpty(protocal) || protocal === 'undefined') ? '' : protocal;
                user = (_.isEmpty(user) || user === 'undefined') ? '' : user;
                pwd = (_.isEmpty(pwd) || pwd === 'undefined') ? '' : pwd;

                let config = {
                    clientId: this.#clientId,
                    brokers: this.#brokers,
                    connectionTimeout: this.#connectionTimeout ,
                    retry: {
                        initialRetryTime: this.#initialRetryTime,
                        retries: this.#retries
                    },
                    logLevel: logLevel.ERROR,
                    ssl: ssl
                }

                if (!_.isEmpty(mech) && !_.isEmpty(protocal) && !_.isEmpty(user) && !_.isEmpty(pwd)) {
                    config.sasl = {
                        mechanism: mech,
                        protocol: protocal,
                        username: user,
                        password: pwd
                    }
                }

                // if (this.#logOptions) {
                //     this.logger.banner('KafkaClient Config', '+');
                //     this.logger.json(config);
                // }

                this.#kafkaClient = new Kafka(config);
            }
            catch (e) {
                this.logger.error(e);
            }
        }
    }

    async getBrokers() {
        this.logger.log(this.#kafkaClient.getBrokers());
    }

    #getSaslConfig(clusterName='', env='dev') {
        let sslConf = {};

        if (_.isEmpty(env)) env = 'dev';
        if (_.isEmpty(clusterName)) clusterName = '';

        if (clusterName.toLowerCase() === '') {
            if (['dev', 'test', 'prod'].includes(env.toLowerCase())) {
                sslConf.mechanism = AppConfig.get(`DEFAULT_KAFKA_MECHANISM_${env.toUpperCase()}`);
                sslConf.protocol = AppConfig.get(`DEFAULT_KAFKA_PROTOCOL_${env.toUpperCase()}`);
                sslConf.username = AppConfig.get(`DEFAULT_KAFKA_USER_${env.toUpperCase()}`);
                sslConf.password = AppConfig.get(`DEFAULT_KAFKA_PWD_${env.toUpperCase()}`);
            }
        }

        return sslConf;
    }

    async #createProducer() {
        try {
            if (_.isObject(this.#kafkaClient)) {
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

    async sendMessage(message = { value: 'Hello KafkaJS user!' }, topicName = 'dev-topic') {
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

    get producerIsConnected() {
        return this.#producerIsConnected;
    }

    async sendMessageBatch(topicMessages=[], topicName='dev-topic') {
        if (_.isEmpty(topicMessages) || !_.isArray(topicMessages)) {
            this.logger.warn('No topic messages provided.')
            return;
        }

        try {
            if (_.isEmpty(this.#producer)) await this.#createProducer();
            if (!this.#producerIsConnected) await this.connectProducer();

            await this.#producer.sendBatch({
                topicMessages: topicMessages
            });
        }
        catch (e) {
            this.logger.error(e);
        }
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

    async readMessage(topicName = 'dev-topic', fromBeginning = false) {
        try {
            await this.prepareConsumer(topicName, fromBeginning);

            await this.#consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    this.logger.log({
                        offset: message.offset,
                        key: message.key?.toString(),
                        value: message.value?.toString()
                    });
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
