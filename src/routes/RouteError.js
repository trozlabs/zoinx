const { ResponseObj } = require('../core');
const { Log } = require('../log');

module.exports = function (err, req, res, next) {
    Log.error(err.stack);
    let errorCode = err.code === 500 ? 500 : 400;
    res.status(errorCode).json(ResponseObj.getJsonExMsg(err, err.code));
};
