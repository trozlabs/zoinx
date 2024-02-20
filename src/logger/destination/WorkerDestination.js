// const debug = util.debuglog('timber');
const util = require('node:util');
const { Worker } = require('node:worker_threads');
const Destination = require('./Destination');

/**
 * @example
 * new WorkerDestination({
 *  name: 'my-worker-destination',
 *  config: {
 *      file: 'my-worker.js',
 *      workerOptions: {
 *          workerData: {...}
 *      }
 *  }
 * })
 */
module.exports = class WorkerDestination extends Destination {

    /**
     * @constructor
     * @param {Object} [options={}]
     * @param {string} options.name='worker-destination'
     * @param {object} options.config
     * @param {string} options.config.file=''
     * @param {object} options.config.workerOptions={}
     */
    constructor({ name='worker-destination', config={ workerOptions: {}, file: '' } } = {}) {
        super(...arguments);

        this.name = name;

        if (config.file) {

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
        // console.debug(this.name, 'handle', { data });
        this.#worker.postMessage(JSON.stringify(data));
    }

    onConnection() {
        // console.debug(this.name, 'onConnection', { arguments });
    }

    onError(reason, code) {
        // console.debug(this.name, 'onError', { reason, code });
    }

    onClose() {
        // console.debug(this.name, 'onClose', { arguments });
    }

    onMessage(buffer) {
        // console.debug(this.name, 'onMessage', buffer.toString());
    }
}
