const util = require('node:util');
const debug = util.debuglog('timber');
const Destination = require('./Destination');

module.exports = class FileDestination extends Destination {
    constructor() {
        super(...arguments);
    }
}