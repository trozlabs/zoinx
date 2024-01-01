const _ = require('lodash');
const {randomUUID} = require("crypto");
const bcrypt = require("bcryptjs");

const { Log } = require('../log');
const Network = require('../util/Network');
const tsfService = require('../routes/testingSendFails/service');
const KafkaClient = require('../datastream/KafkaClient');
const StaticUtil = require('../util/StaticUtil');
const Encryption = require('../util/Encryption');

module.exports = class TestMsgProducer {

    #testObj
    #testingName
    #testingSendFailsService

    constructor(testObj) {
        this.#testObj = testObj;
        this.#testingName = `${testObj.className}.${testObj.methodName}`;
    }

    async #createTestMsgProducer() {
        try {
            if (_.isUndefined(global.kafka)) global.kafka = {};
            if (_.isUndefined(global.kafka.TestMsgProducer)) {
                let kafkaClient = new KafkaClient('TestMsgProducer', [process.env.TESTING_MESSAGE_SERVERS]);
                await kafkaClient.setClientConfig('TESTING_MESSAGE', process.env.TESTING_ENV, process.env.TESTING_USE_SSL);
                global.kafka.TestMsgProducer = kafkaClient;
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

    async send() {
        let keyString = (process.env.SERVICE_NAME) ? process.env.SERVICE_NAME : 'DevApplication';
        try {
            if (global.testingConfig?.sendResult2Kafka) {
                if (_.isEmpty(this.#testObj) || !_.isObject(this.#testObj)) {
                    keyString = randomUUID();
                }
                else {
                    keyString += `.${this.#testObj.className}.${this.#testObj.methodName}:${this.#testObj.stopWatchStart}`;
                }

                await this.#createTestMsgProducer();
                let testObj = JSON.stringify(this.#testObj);
                if (StaticUtil.StringToBoolean(process.env.TESTING_ENCRYPT)) {
                    testObj = await Encryption.encrypt(testObj, process.env.TESTING_SECRET_KEY, process.env.TESTING_SECRET_IV);
                }

                await global.kafka.TestMsgProducer.sendMessage({
                    key: keyString,
                    value: testObj
                }, process.env.TESTING_TOPIC_NAME);
            }
            else if (!global.testingConfig?.sendResult2Kafka && global.testingConfig?.consoleOut) {
                Log.info(this.#testObj);
            }
            else {
                let tmpArray = await this.getPassedArgumentsArray(),
                    hashedKey = await bcrypt.hash(JSON.stringify(tmpArray), global.testing.testResultCacheSalt);
                global.testing.testResultCache.setEntry(hashedKey, this.#testObj);
                global.eventBus.emit('ScenarioTestComplete', hashedKey);
            }
        }
        catch (e) {
            if (!global.testingConfig?.sendResult2Kafka && !global.testingConfig?.consoleOut)
                Log.warn(e.message, this.#testObj);
            else
                await this.#saveTestMsgSendFail(this.#testObj.json, e);
        }
    }

    async getPassedArgumentsArray() {
        let tmpArgs = this.#testObj.passedArguments,
            argKeys = Object.keys(tmpArgs),
            resultArray = [];

        for (let i=0; i<argKeys.length; i++) {
            resultArray.push(tmpArgs[argKeys[i]]);
        }

        return resultArray;
    }

    async #saveTestMsgSendFail(telemetryModel, error) {
        try {
            let tmpTestObj = this.#testObj;
            delete tmpTestObj.id;
            let saveObj = {
                    send_to_server: process.env.TESTING_MESSAGE_SERVERS,
                    ip_address: Network.getHostAddress(),
                    telemetry_obj: this.#testObj,
                    error_message: error.message
                },
                result;

            let service = new tsfService();

            result = await service.save(undefined, saveObj, {user: 'SYSTEM'});
            // Log.info(result);
        }
        catch (e) {
            Log.error(e);
        }
    }
}
