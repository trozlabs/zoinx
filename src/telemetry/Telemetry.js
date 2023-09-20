const { Log } = require('../log');
const _ = require('lodash');
const { Worker, SHARE_ENV, parentPort} = require("worker_threads");
const path = require("path");
const os = require('os');
const {randomUUID} = require("crypto");
const Network = require('../util/Network');
const TelemetryTraceModel = require('./TelemetryTraceModel');
const tsfService = require('../routes/telemetrySendFails/service');

module.exports = class Telemetry {

    #telemetryModel
    #telemetryName
    #telemetryStatus
    #telemetrySendFailsService

    constructor(telemetryName='No name provided', configObj, telemetryStatus) {
        this.#telemetryName = telemetryName;
        this.#telemetryStatus = telemetryStatus;
        this.#fillTelemetryFromRequest(configObj).catch(r => { console.log(r)});
        this.#telemetrySendFailsService = new tsfService();
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
                    events: req.telemetryEvents,
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
            const worker = new Worker(path.resolve(`${__dirname}/Telemetry2Kafka.js`), {
                workerData: {telemetryModel: this.#telemetryModel.json, runningAppPath: path.resolve(process.cwd()), libPath: __dirname}
            });
            worker.on('error', (error) => {
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
