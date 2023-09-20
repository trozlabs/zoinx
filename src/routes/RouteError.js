const { ResponseObj } = require('../core');
const { Log } = require('../log');
const { Worker } = require("worker_threads");
const path = require("path");
const {Telemetry} = require("../telemetry");

module.exports = async function (err, req, res, next) {
    Log.error(err.stack);
    let errorCode = err.statusCode ?? 500,
        status = {code: errorCode, message: err.message},
        telemetry = new Telemetry('RouteError', req, status);

    res.status(errorCode).json(ResponseObj.getJsonExMsg(err, errorCode));
    if (telemetry) telemetry.send();
};
