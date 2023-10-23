const Log = require('../log/Log');
const _ = require('lodash');
const { workerData, parentPort } = require('worker_threads');
const { randomUUID } = require("crypto");
const path = require('path');

try {
    if (parentPort) {
        runit(workerData);
    }
}
catch (e) {
    Log.warn(e.message);
}

async function runit(workerData) {
    // await require("../util/StaticUtil").sleep(1500);

    try {
        const KafkaClient = require(path.resolve(`${workerData.zoinxPath}/../datastream/KafkaClient`));
        let kafkaClient = new KafkaClient('TelemetryProducer', [workerData.env.TELEMETRY_MESSAGE_SERVERS]),
            telemetryMsg = JSON.stringify(workerData.telemetryModel);

        kafkaClient.setClientConfig('TELEMETRY_KAFKA', workerData.env.TELEMETRY_ENV, workerData.env.TELEMETRY_USE_SSL);

        if (require(path.resolve(`${workerData.zoinxPath}/../util/StaticUtil`)).StringToBoolean(workerData.env.TELEMETRY_ENCRYPT)) {
            telemetryMsg = await require(path.resolve(`${workerData.zoinxPath}/../util/Encryption`)).encrypt(telemetryMsg, workerData.env.TELEMETRY_SECRET_KEY, workerData.env.TELEMETRY_SECRET_IV);
        }

        await kafkaClient.sendMessage({
            key: randomUUID(),
            value: telemetryMsg
        }, workerData.env.TELEMETRY_TOPIC_NAME);
        kafkaClient.disconnectProducer();
    }
    catch (e) {
        e.workerData = workerData;
        throw e;
    }
}
