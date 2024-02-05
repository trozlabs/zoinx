const ObservableObject = require('../util/ObservableObject.js');
const StringUtil = require('../util/StringUtil.js');

const { mergeArrayObjectsByKey, diffObjects } = require('./util.js');
const Log = require('./Log.js');
const WatchedFile = require('./WatchedFile.js');
const { Color } = require('./Color.js');
const { ConsoleDestination, WorkerDestination, FileDestination, Destination } = require('./destination');

class Logger {
    static destinations = {
        ConsoleDestination,
        WorkerDestination,
        FileDestination,
        Destination
    };

    static Levels = {
        OFF     : -1,
        ERROR   :  0,
        WARN    :  1,
        DEBUG   :  2,
        INFO    :  3,
        LOG     :  4,
        JSON    :  50,
        BANNER  :  51,
        ALL     :  100
    }

    static #file;

    static #options = {
        loggers: {}
    };

    static #instances;

    static defaultConfig = {
        level: 'all',
        colors: true,
        loggers: {
            default: 'all'
        }
    }

    static defaultOptions = {
        id: null,
        app: 'zoinx',
        name: 'default',
        configFile: undefined,
        config: this.defaultConfig,
        filters: [],
        transformers: [],
        destinations: [
            new ConsoleDestination({
                id: 'default',
                name: 'default-console',
                type: 'stdout'
            })
        ]
    }

    /**
     * Set defaults inherited by all logger instances.
     *
     * @static
     * @method defaults
     */
    static defaults(options = Logger.defaultOptions) {

        mergeArrayObjectsByKey(options.filters      ?? [], this.#options.filters,       'id');
        mergeArrayObjectsByKey(options.transformers ?? [], this.#options.transformers,  'id');
        mergeArrayObjectsByKey(options.destinations ?? [], this.#options.destinations,  'id');

        Object.assign(this.#options, this.defaultOptions, options);

        if (this.#options.configFile) {
            // console.log('creating watched file:', this.#options.configFile);

            this.#file = new WatchedFile({
                name: this.#options.name,
                filepath: this.#options.configFile,
                initFileContent: JSON.stringify(this.#options.config, null, 4)
            });

            try {
                const parsedConfig = JSON.parse(this.#file.read());
                Object.assign(this.#options.config, parsedConfig);
            }
            catch (cause) {
                console.error(new Error(`Parsing JSON in configFile: ${this.#options.configFile} failed.`, { cause }))
            }

            this.#file.on('change', ({ filename, data }) => {
                console.debug('[zoinx/logger] config file change', filename);
                try {
                    const parsedConfig = JSON.parse(data);
                    const diffs = diffObjects(this.#options.config, parsedConfig);

                    if (Object.keys(diffs).length) {
                        console.log('configFile is different from config');
                        console.log(diffs);
                        Object.assign(this.#options.config, parsedConfig);
                    }
                }
                catch (cause) {
                    console.error(new Error(`Parsing JSON in ${filename} failed`, { cause }))
                }
            });
        }

        // Create default logger instance.
        return this.create();
    }

    static setLevel(level) {
        if (level) {
            this.#options.level = level;
        }
    }
    static getLevel() {
        return this.#options.level = level;
    }

    static get(name=this.#options.name) {
        if (this.#instances.has(name)) {
            return this.#instances.get(name);
        } else {
            // console.warn(`[zoinx/logger] Logger ${name} doesn't exist.`);
            return this.create({ name });
        }
    }
    static add(instance) {
        if (this.#instances.has(instance.name)) {
            return console.warn(`[zoinx/logger] Logger ${instance.name} already exists.`);
        }
        this.#instances.set(instance.name, instance);
        this.#options.config.loggers[instance.name] = this.#options.config.loggers[instance.name] ?? 'all';
    }
    static create(options={}) {
        return new this(options);
    }

    static {
        this.#instances = new Map();
        this.#options = this.defaultOptions;
        this.#options.config = new ObservableObject('config', this.defaultOptions.config);

        // When `options.config` changes...
        this.#options.config.events.on('config.loggers', (event) => {

            // console.log('Logger.options.config.loggers changed', event.newValue);
            if (this.#file) {
                try {
                    this.#file.write(JSON.stringify(this.#options.config, null, 4));
                }
                catch (error) {
                    console.error(new Error(`There was a problem writing config to configFile`, { cause: error }));
                }
            }
        });
    }

    constructor({ id, app, name, config={}, filters=[], transformers=[], destinations=[] } = {}) {
        const self = this.#self = this.constructor;

        // public
        this.id              = id           ?? crypto.randomUUID();
        this.app             = app          ?? self.#options.app;
        this.name            = name         ?? self.#options.name;
        // private
        this.#config         = Object.assign({}, self.#options.config, config);
        this.#filters        = filters      ?? [];
        this.#transformers   = transformers ?? [];
        this.#destinations   = destinations ?? [];

        self.add(this);
    }

    id;
    app;
    name;

    #self;
    #config;
    #filters;
    #transformers;
    #destinations;

    setLevel(level) {
        if (level) {
            this.#self.#options.config.loggers[this.name] = level;
        }
    }
    getConfig() {
        return this.#config;
    }
    getFilters() {
        return this.#filters;
    }
    getTransformers() {
        return this.#transformers;
    }
    getDestinations() {
        return this.#destinations;
    }

    #log(method, message, ...args) {
        message = StringUtil.normalizeMultiLineIndent(message);

        let LEVEL = method.toUpperCase();
        let level = method;

        let globalLevel = String(this.#self.#options.config.level ?? 'all').toUpperCase();
        let configLevel = String(this.#self.#options.config.loggers[this.name] ?? 'all').toUpperCase();

        // global config.level overrides the logger['name'] level
        //
        if ((Logger.Levels[LEVEL] ?? 100) <= (Logger.Levels[globalLevel] ?? 100) &&
            (Logger.Levels[LEVEL] ?? 100) <= (Logger.Levels[configLevel] ?? 100)) {

            let log = new Log({
                logger: this,
                method: level,
                level: LEVEL,
                config: this.#config,
                message: message,
                args: args,
            });

            /**
             * Run filters
             */
            const globalFilters = this.#self.#options.filters;
            const instanceFilters = this.#filters;
            const filters = [...globalFilters, ...instanceFilters];
            const filterResults = filters.map(filterFn => {
                if (typeof filterFn !== 'function') {
                    throw new Error(`Filter should be a function`, filterFn);
                }
                return filterFn.bind(this)(log);
            });
            const isFiltered = filterResults.includes(false);
            if (isFiltered) return; //console.debug(`log is filtered out`);

            /**
             * Run transformers
             */
            const globalTransformers = this.#self.#options.transformers;
            const instanceTransformers = this.#transformers;
            const transformers = [...globalTransformers, ...instanceTransformers];
            if (transformers.length) {
                log = transformers.reduce((log, transformerFn) => {
                    return transformerFn(log);
                }, log);
            }

            /**
             * Run destinations
             */
            const globalDestinations = this.#self.#options.destinations;
            const instanceDestination = this.#destinations;
            const destinations = [...globalDestinations, ...instanceDestination].filter(destination => {
                return destination.enabled;
            });

            if (!destinations.length) {
                console.warn('[zoinx/log/Logger instance]', this.name, 'No destinations enabled or defined');
            }

            for (let index = 0; index < destinations.length; index++) {
                const destination = destinations[index];
                destination.run(log);
            }
        }

        // (console[method] || console.log)(
        //     `[${timestamp}] ${app}/${name} [${level}] ${message}\n`,
        //     ...args
        // );
    }

    log(message, ...args) {
        this.#log('log', message, ...args);
    }
    info(message, ...args) {
        this.#log('info', message, ...args);
    }
    debug(message, ...args) {
        this.#log('debug', message, ...args);
    }
    warn(message, ...args) {
        this.#log('warn', message, ...args);
    }
    /**
     * @example
     * logger.error('message');
     * logger.error('message', new Error('Error message'));
     * logger.error(new Error('Error Message'));
     * logger.error(new Error('Error Message'), 1, 'a', true, {}, []);
     */
    error() {
        // debug(this.name, 'public error');
        let message = '';
        let args = Array.from(arguments);
        let arg0 = args.shift();
        // error(String, ...);
        if (arg0 instanceof String) {
            message = arg0;
        }
        // error(Error, ...);
        if (arg0 instanceof Error) {
            message = arg0?.message;
            args.unshift(arg0);
        }
        this.#log('error', (message || arg0 || 'No Error Message'), args);
    }

    // stdout only

    time(label) {
        console.time(...arguments);
    }
    timeEnd(label) {
        console.timeEnd(...arguments);
    }

    dir() {
        console.dir(...arguments);
    }
    dirxml() {
        console.dirxml(...arguments);
    }

    table() {
        console.table(...arguments);
    }

    time() {
        console.time(...arguments);
    }
    timeEnd() {
        console.timeEnd(...arguments);
    }

    group() {
        console.group(...arguments);
    }
    groupCollapsed() {
        console.groupCollapsed(...arguments);
    }
    groupEnd() {
        console.groupEnd(...arguments);
    }

    banner(message='', border='-') {
        // const width = process.stdout.columns > 80 ? 80 : process.stdout.columns;
        const width = message.length + 2;
        const line = new Array(width).fill(border).join('');
        console.log(`${line}\n ${message ?? ''}\n${line}`);
    }

    json() {
        console.log(`JSON: ${JSON.stringify(...arguments, null, 4)}${Color.RESET} `);
    }

    route(req, res, next) {
        console.log(`\n${req.method}: \t ${req.originalUrl} `);
        console.log('params:\t', req.params);
        console.log('query:\t', req.query);
        console.log('body:\t', req.body);
        next();
    }
}

module.exports = Logger;
