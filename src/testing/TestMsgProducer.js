const _ = require('lodash');
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");

const Log = require('../log/Log');
const tsfService = require('../routes/testingSendFails/service');
const { StaticUtil, Encryption, Network } = require('zoinx/util');

module.exports = class TestMsgProducer {

    #testObj
    #testingName
    #testingSendFailsService

    constructor(testObj) {
        this.#testObj = testObj;
        this.#testingName = `${testObj.className}.${testObj.methodName}`;
    }

    async send() {
        let keyString = (process.env.SERVICE_NAME) ? process.env.SERVICE_NAME : 'DevApplication';
        try {
            if (global.testingConfig?.sendResult2Kafka && global.kafka?.TestMsgProducer) {
                if (_.isEmpty(this.#testObj) || !_.isObject(this.#testObj)) {
                    keyString = randomUUID();
                }
                else {
                    keyString += `.${this.#testObj.className}.${this.#testObj.methodName}`; //:${this.#testObj.stopWatchStart}`;
                }

                delete this.#testObj.passedArguments;
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
                await this.#saveTestMsgSendFail(this.#testObj, e);
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

    async #saveTestMsgSendFail(testingObj, error) {
        try {
            let saveObj = {
                    send_to_server: process.env.TESTING_MESSAGE_SERVERS,
                    ip_address: Network.getHostAddress(),
                    testing_obj: testingObj,
                    error_message: error.message
                },
                result;

            let service = new tsfService();

            result = await service.save(saveObj, {user: 'SYSTEM'});
            // Log.info(result);
        }
        catch (e) {
            Log.error(e);
        }
    }
}
