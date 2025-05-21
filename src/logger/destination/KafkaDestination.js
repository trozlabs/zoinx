// const debug = util.debuglog('timber');
const Destination = require('./Destination');
const KafkaClient = require('../../datastream/KafkaClient');
const StaticUtil = require('../../util/StaticUtil');
const _ = require('lodash');
const { randomUUID } = require('crypto');
const Network = require("../../util/Network");
const lsfService = require("../../routes/loggingSendFails/service");
const {Log} = require("../../log");
const Encryption = require('../../util/Encryption');

/**
 * @example
 *  new WorkerDestination({
 *      name: 'kafka-destination',
 *      config: {
 *          topic: 'log',
 *          brokers: ['kafka:9082'],
 *          clientId: 'kafka-logger'
 *      }
 *  })
 */
module.exports = class KafkaDestination extends Destination {
    type = 'kafka';
    env
    #enabled

    /**
     * @param {Object} options
     * @param {Object} options.config
     * @param {string} options.config.topic
     * @param {string} options.config.clientId
     * @param {string[]} options.config.brokers
     */
    constructor(options = {}) {
        super(...arguments);
        this.#enabled = options.enabled;
        if (this.#enabled) {
            this.#createLoggerProducer().catch((err) => {
                console.error(err);
            });
        }
    }

    async #createLoggerProducer() {
        try {
            if (_.isUndefined(global.kafka)) global.kafka = {};
            if (_.isUndefined(global.kafka.LoggerProducer)) {
                this.env = process.env.LOGGER_ENV.toUpperCase();
                let kafkaClient = new KafkaClient('LoggerProducer', [process.env['LOGGER_MESSAGE_SERVERS']]);
                await kafkaClient.setClientConfig('LOGGER_KAFKA', this.env, process.env['LOGGER_USE_SSL']);
                global.kafka.LoggerProducer = kafkaClient;
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    async handle(data) {
        if (this.#enabled) {
            let logMsg = data?.plain,
                keyString = (process.env.SERVICE_NAME) ? process.env.SERVICE_NAME : 'DevApplication';

            try {
                if (!_.isEmpty(logMsg)) {
                    if (StaticUtil.StringToBoolean(process.env['LOGGER_ENCRYPT'])) {
                        logMsg = await Encryption.encrypt(logMsg, process.env['LOGGER_SECRET_KEY'], process.env['LOGGER_SECRET_IV']);
                    }

                    keyString += `.${data.level}.${data.logger.name}:${new Date().getTime()}`;
                    if (_.isEmpty(keyString))
                        keyString = randomUUID();

                    await global.kafka.LoggerProducer.sendMessage({
                        key: keyString,
                        value: JSON.stringify(logMsg)
                    }, process.env['LOGGER_TOPIC_NAME']);
                }
            } catch (e) {
                let loggingObj = {
                    key: keyString,
                    message: logMsg
                }
                await this.saveLoggingSendFail(loggingObj, e);
            }
        }
    }

    async saveLoggingSendFail(loggingObj={}, error) {
        try {
            let saveObj = {
                    send_to_server: process.env['LOGGER_MESSAGE_SERVERS'],
                    ip_address: Network.getHostAddress(),
                    logging_obj: JSON.stringify(loggingObj),
                    error_message: error.message
                },
                result;

            let service = new lsfService();
            result = await service.save(saveObj, {user: 'SYSTEM'});
        }
        catch (e) {
            Log.error(e);
        }
    }

}
