const _ = require('lodash');
const { Worker, SHARE_ENV, parentPort} = require("worker_threads");
const path = require("path");
const os = require('os');
const {randomUUID} = require("crypto");

const { Log } = require('../log');
const Network = require('../util/Network');
const TelemetryTraceModel = require('./TelemetryTraceModel');
const tsfService = require('../routes/telemetrySendFails/service');
const KafkaClient = require('../datastream/KafkaClient');
const StaticUtil = require('../util/StaticUtil');
const Encryption = require('../util/Encryption');

module.exports = class Telemetry {

    #telemetryModel
    #telemetryName
    #telemetryStatus
    #telemetrySendFailsService

    constructor(telemetryName='No name provided', configObj, telemetryStatus) {
        this.#telemetryName = telemetryName;
        this.#telemetryStatus = telemetryStatus;
        if (!_.isUndefined(configObj)) {
            if (configObj.constructor.name === 'IncomingMessage') {
                this.#fillTelemetryFromRequest(configObj).catch(r => {
                    Log.log(r)
                });
            }
            else if (configObj.constructor.name === 'TelemetryTraceModel') {
                this.#telemetryModel = configObj;
            }
            this.#telemetrySendFailsService = new tsfService();
        }
    }

    async #createTelemetryProducer() {
        try {
            if (_.isUndefined(global.kafka)) global.kafka = {};
            if (_.isUndefined(global.kafka.TelemetryProducer)) {
                let kafkaClient = new KafkaClient('TelemetryProducer', [process.env.TELEMETRY_MESSAGE_SERVERS]);
                await kafkaClient.setClientConfig('TELEMETRY_KAFKA', process.env.TELEMETRY_ENV, process.env.TELEMETRY_USE_SSL);
                global.kafka.TelemetryProducer = kafkaClient;
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #fillTelemetryFromRequest(req) {
        try {
            if (!_.isEmpty(req)) {
                let traceId = req.get('trace_id') ?? randomUUID(),
                    reqAttributes = {};

                if (!_.isEmpty(req.verifiedAuth)) {
                    reqAttributes.preferred_username = req.verifiedAuth.preferred_username;
                    reqAttributes.oid = req.verifiedAuth.oid;
                    reqAttributes.ip_address = Network.getHostAddress();
                    reqAttributes.user_agent = req.verifiedAuth.user_agent;
                }
                else {
                    reqAttributes.preferred_username = 'No user perms';
                }
                reqAttributes.route_method = req.method;
                reqAttributes.route_path = req.originalUrl;
                reqAttributes.params = req.params;
                reqAttributes.body = req.body;

                if (_.isEmpty(this.#telemetryStatus)) {
                    this.#telemetryStatus =  {
                        code: req.res.apiResponse.statusCode,
                        message: req.res.apiResponse.statusMessage
                    }
                }

                this.#telemetryModel = new TelemetryTraceModel({
                    application_name: process.env.TELEMETRY_APPLICATION_NAME,
                    name: this.#telemetryName,
                    serverInstance: os.hostname(),
                    trace_id: traceId,
                    span_id: randomUUID(),
                    start_time: req._startTime,
                    end_time: new Date(),
                    events: req.telemetryEvents ?? [],
                    attributes: reqAttributes,
                    status: this.#telemetryStatus
                });
            }
        }
        catch (e) {
            throw e;
        }
    }

    async send() {
        try {
            await this.#createTelemetryProducer();
            let telemetryMsg = JSON.stringify(this.#telemetryModel.json),
                keyString = (process.env.SERVICE_NAME) ? process.env.SERVICE_NAME : 'DevApplication';

            if (StaticUtil.StringToBoolean(process.env.TELEMETRY_ENCRYPT)) {
                telemetryMsg = await Encryption.encrypt(telemetryMsg, process.env.TELEMETRY_SECRET_KEY, process.env.TELEMETRY_SECRET_IV);
            }

            keyString += `.${this.#telemetryModel.get('name')}:${new Date().getTime()}`;
            if (_.isEmpty(keyString))
                keyString = randomUUID();

            await global.kafka.TelemetryProducer.sendMessage({
                key: keyString,
                value: telemetryMsg
            }, process.env.TELEMETRY_TOPIC_NAME);
        }
        catch (e) {
            await this.saveTelemetrySendFail(this.#telemetryModel.json, e);
        }
    }

    async sendViaWorker() {
        try {
            const worker = new Worker(path.resolve(`${__dirname}/Telemetry2Kafka.js`), {
                workerData: {
                    telemetryModel: this.#telemetryModel.json,
                    zoinxPath: __dirname,
                    runningAppPath: path.resolve(process.cwd()),
                    libPath: __dirname,
                    env: process.env
                }
            });
            worker.on('error', (error) => {
                delete error.workerData.env;
                this.saveTelemetrySendFail(error.workerData, error);
            });
            // worker.on("exit", (code) =>
            //     console.log(`Worker stopped with exit code ${code}`)
            // );
        }
        catch (e) {
            Log.error(e);
        }
    }

    async saveTelemetrySendFail(telemetryModel, error) {
        try {
            let saveObj = {
                    send_to_server: process.env.TELEMETRY_MESSAGE_SERVERS,
                    ip_address: Network.getHostAddress(),
                    telemetry_obj: telemetryModel,
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
