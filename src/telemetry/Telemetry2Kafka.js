const { Log } = require('../log');
const APIError = require('../core/APIError');
const _ = require('lodash');
const { workerData, parentPort } = require('worker_threads');
const {randomUUID} = require("crypto");
const path = require('path');

try {
    if (parentPort) {
        runit(workerData);
        // parentPort.postMessage(total);
    }
}
catch (e) {
    Log.warn(e.message);
}

async function runit(workerData) {
    // await require("../util/StaticUtil").sleep(1500);
    const KafkaClient = require(path.resolve(`${workerData.runningAppPath}/lib/kafka/KafkaClient.js`));

    try {
        let kafkaClient = new KafkaClient('FogLightTelemetry', [process.env.TELEMETRY_MESSAGE_SERVERS]);
        await kafkaClient.sendMessage({key: randomUUID(), value: JSON.stringify(workerData.telemetryModel)}, 'Telemetry');
    }
    catch (e) {
        Log.error(e);
    }
}
