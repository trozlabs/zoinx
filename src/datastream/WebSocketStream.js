const { Writable } = require('stream');
const _ = require('lodash');
const Logger = require('../logger/Logger');

module.exports = class WebSocketStream extends Writable {

    logger = Logger.create({ name: 'WebSocketStream' });
    ws

    constructor(ws) {
        super();
        this.ws = ws;
    }

    _write(chunk, encoding, callback) { //"utf8"
        try {
            this.ws.send(chunk.toString());
            if (_.isFunction(callback))
                callback();
        }
        catch (e) {
            this.logger.warn(e.message);
        }
    }

}
