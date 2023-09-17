const { Log } = require('../log');
const _ = require('lodash');
const {Worker} = require("worker_threads");
const path = require("path");
const os = require('os');
const {randomUUID} = require("crypto");
const Network = require('../util/Network');
const TelemetryTraceModel = require('./TelemetryTraceModel');

module.exports = class Telemetry {

    #telemetryModel
    #telemetryName

    constructor(telemetryName='No name provided', configObj) {
        this.#telemetryName = telemetryName;
        if (configObj?.constructor.name === 'IncomingMessage') {
            this.#fillTelemetryFromRequest(configObj).catch(r => { console.log(r)});
        }
        else if (configObj?.constructor.name === 'APIError') {
            Log.info('Got an APIError in telemetry.')
        }
        // else if (configObj.self.toString().match(/extends Controller/)) {
        //
        // }
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
                    reqAttributes = {name: 'none'}
                }
                reqAttributes.route_method = req.method;
                reqAttributes.route_path = req.originalUrl;
                reqAttributes.params = req.params;
                reqAttributes.body = req.body;

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
                    status: {
                        code: req.res.apiResponse.statusCode,
                        message: req.res.apiResponse.statusMessage
                    }
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
                workerData: {telemetryModel: this.#telemetryModel.json, runningAppPath: path.resolve(process.cwd())}
            });
            // worker.on("message", (total) => {
            //     console.log(`Total from thred: ${total}`);
            // });
            // worker.on('error', (error) => {
            //     console.log(error);
            // });
        }
        catch (e) {
            Log.error(e);
        }
    }
}
