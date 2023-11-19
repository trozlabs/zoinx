const _ = require('lodash');
const {randomUUID} = require("crypto");

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

    //TestFuncDetails

    constructor(testObj) {
        this.#testObj = testObj;
        this.#testingName = `${testObj.className}.${testObj.methodName}`;
        // this.#testingSendFailsService = new tsfService();
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

    async send(keyString=randomUUID()) {
        try {
            if (global.testingConfig?.sendResult2Kafka) {
                await this.#createTestMsgProducer();
                let testObj = JSON.stringify(this.#testObj);
                if (StaticUtil.StringToBoolean(process.env.TESTING_ENCRYPT)) {
                    testObj = await Encryption.encrypt(testObj, process.env.TESTING_SECRET_KEY, process.env.TESTING_SECRET_IV);
                }
// TODO work out kafka keys
                await global.kafka.TestMsgProducer.sendMessage({
                    key: keyString,
                    value: testObj
                }, process.env.TESTING_TOPIC_NAME);
            }
            else {
                if (global.testingConfig.consoleOut)
                    Log.info(this.#testObj);
            }
        }
        catch (e) {
            await this.#saveTestMsgSendFail(this.#testObj.json, e);
        }
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
