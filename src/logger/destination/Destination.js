const { debuglog } = require('../util');
const debug = debuglog('zoinx/log/destination')(false);
const { randomUUID } = require('node:crypto');
const ObjectUtil = require('../../util/ObjectUtil');

module.exports = class Destination {

    /**
     * @constructor
     * @param {object} options
     * @param {string} options.id
     * @param {string} options.name
     * @param {string} options.type
     * @param {boolean} options.enabled
     * @param {object} options.config
     * @param {Array<Function>} options.filters
     * @param {Array<Function>} options.transformers
     */
    constructor({ id, name, type, enabled, debug, config={}, transformers=[], filters=[] } = {}) {
        this.id = id ?? randomUUID();
        this.name = name ?? this.name;
        this.type = type ?? this.type;
        this.enabled = enabled ? enabled : true;
        this.debug = debug;

        this.#config = config ?? {};
        this.#filters = filters;
        this.#transformers = transformers;
        this.#initialized = true;
    }

    id;
    name;
    type;
    enabled;

    /**
     * @private
     * @property {boolean} initialized called when the constructor has finished.
     */
    #initialized = false;

    get initialized() {
        return this.#initialized;
    }

    /**
     * @private
     * @property {object<string, any>} config Use the config object to pass in instance specific options. This prevents conflicts with parent class properties.
     */
    #config = {};

    getConfig() {
        return this.#config;
    }
    setConfig(config={}) {
        Object.assign(this.#config, config);
    }

    /**
     * An array of functions used to determine if a log should not get
     * handled by the destination. if any function returns false it will prevent
     * the handle method from getting called.
     * @private
     * @property {function[]} filters
     */
    #filters = [];

    getFilters() {
        return this.#filters;
    }
    addFilter(fn) {
        this.#filters.push(fn);
    }

    #transformers = [];

    getTransformers() {
        return this.#transformers;
    }
    addTransformer(fn) {
        this.#transformers.push(fn);
    }

    run(log) {
        // console.debug(this.name, 'run');
        const isHandleCallable = typeof this.handle !== 'function';
        if (isHandleCallable) throw new Error(`Destination (${this.name}) is missing a 'handle' method.`);

        const isFiltered = this.getFilters().map(filterFn => filterFn(log)).includes(false);
        if (isFiltered) return; //console.debug('log is filtered');

        log = this.getTransformers().reduce((data, transformerFn, index) => {
            return transformerFn(data);
        }, log);

        try {
            this.handle(log);
        } catch(e) {
            throw new Error(`Destination Handler Error ${e.message}`, e);
        }
    }
}
