const { ResponseObj } = require('../core');
const { Log } = require('../log');
const { Worker } = require("worker_threads");
const path = require("path");
const {Telemetry} = require("../telemetry");

module.exports = async function (err, req, res, next) {
    Log.error(err.stack);
    let errorCode = err.statusCode ?? 500;
    const tel = new Telemetry(err);
    res.status(errorCode).json(ResponseObj.getJsonExMsg(err, errorCode));
};
