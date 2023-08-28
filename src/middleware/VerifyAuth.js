// sibling
const { Log } = require('../log');

const VerifyAuth = (req, res, next) => {
    Log.info('WHAAAAAAAAAAAAAAAAAA?');

    next();
}

module.exports = VerifyAuth;
