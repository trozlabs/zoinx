// sibling
const { Log } = require('../log');

const auth = (req, res, next) => {
    Log.info('WHAAAAAAAAAAAAAAAAAA?');

    next();
}

module.exports = auth;
