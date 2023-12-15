const util = require('node:util');
const debug = util.debuglog('timber');
const { Worker } = require('node:worker_threads');
const Destination = require('./Destination');

module.exports = class WorkerDestination extends Destination {
    constructor({ config={ workerOptions: {}, file: '' } } = options = {}) {
        super(...arguments);

        if (config.file) {
            console.log('config.file', config.file);

            this.#worker = new Worker(config.file, config.workerOptions ?? {});
            this.#worker.on('online', this.onConnection.bind(this));
            this.#worker.on('connection', this.onConnection.bind(this));
            this.#worker.on('message', this.onMessage.bind(this));
            this.#worker.on('messageerror', this.onError.bind(this));
            this.#worker.on('error', this.onError.bind(this));
            this.#worker.on('close', this.onClose.bind(this));
        }
    }

    type = 'worker';
    #worker;

    handle(data) {
        console.debug(this.name, 'handle', { data });
        this.#worker.postMessage(JSON.stringify(data));
    }

    onConnection() {
        console.debug(this.name, 'onConnection', { arguments });
    }

    onError(reason, code) {
        console.debug(this.name, 'onError', { reason, code });
    }

    onClose() {
        console.debug(this.name, 'onClose', { arguments });
    }

    onMessage(buffer) {
        console.debug(this.name, 'onMessage', buffer.toString());
    }
}
