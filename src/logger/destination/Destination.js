const { debuglog } = require('../util');
const debug = debuglog('zoinx/log/destination')(false);
const { randomUUID } = require('node:crypto');
const ObjectUtil = require('../../util/ObjectUtil');

module.exports = class Destination {
    constructor({ id, name, type, enabled, config={}, transformers=[], filters=[] } = {}) {
        this.id = id ?? randomUUID();
        this.name = name ?? this.name;
        this.type = type ?? this.type;
        this.enabled = enabled ? enabled : true;

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

    run(data) {
        // console.debug(this.name, 'run');

        const isHandleCallable = typeof this.handle !== 'function';
        if (isHandleCallable) throw new Error(`Destination (${this.name}) is missing a 'handle' method.`);

        const isFiltered = this.getFilters().map(filterFn => filterFn(transformedLog)).includes(false);
        if (isFiltered) return; //console.debug('log is filtered');

        data = this.getTransformers().reduce((data, transformerFn, index) => {
            return transformerFn(data);
        }, data);

        try {
            debugger;
            this.handle(data);
        } catch(e) {
            throw new Error(`Destination Handler Error ${e.message}`, e);
        }
    }
}
