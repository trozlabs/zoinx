const util = require('node:util');
const debug = util.debuglog('timber');
const Destination = require('./Destination');
const ObjectUtil = require('../../util/ObjectUtil');

module.exports = class ConsoleDestination extends Destination {
    name = 'console-destination';
    type = 'stdout';
    debug = false;

    #console;

    constructor(options={}) {
        super(...arguments);

        this.#console = new console.Console({
            stdout: process.stdout,
            stderr: process.stderr,
            colorMode: 'auto'
        });
    }

    handle(data) {
        if (this.debug) console.debug(this.name, 'destination handle', this);

        const method = this.#console[data.method];

        if (method) {
            method.apply(this, [ data.line, ...data?.args ]);
        } else {
            debug(`${data.level} method does not exist on this.#console`);
            this.#console.log(...data.args);
        }
    }
}
