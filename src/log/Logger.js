// console.log(__filename);
const { debuglog, getSystemInfo, deepMerge, watchConfigFile } = require('./util.js');
const { ConsoleDestination } = require('./destination');
const { getTypeMeta, parseError } = require('../inspect');
const StringUtil = require('../util/StringUtil.js');
const ObjectUtil = require('../util/ObjectUtil.js');
const debug = debuglog('zoinx/log/logger')(false);

const Level = {
    ALL     : 100,  100 : 'ALL',
    DEBUG   : 40,   40  : 'DEBUG',
    BANNER  : 31,   31  : 'BANNER',
    INFO    : 30,   30  : 'INFO',
    WARN    : 20,   20  : 'WARN',
    ERROR   : 10,   10  : 'ERROR',
    OFF     : 0,    0   : 'OFF'
};

const Colors = {
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    DIM: '\x1b[2m',
    UNDERLINE: '\x1b[4m',
    BLINK: '\x1b[5m',
    REVERSE: '\x1b[7m',
    HIDDEN: '\x1b[8m',
    BOLD: '\033[1m',
    FG: {
        BLACK: '\x1b[30m',
        RED: '\x1b[31m',
        GREEN: '\x1b[32m',
        YELLOW: '\x1b[33m',
        BLUE: '\x1b[34m',
        MAGENTA: '\x1b[35m',
        CYAN: '\x1b[36m',
        WHITE: '\x1b[37m'
    },
    BG: {
        BLACK: '\x1b[40m',
        RED: '\x1b[41m',
        GREEN: '\x1b[42m',
        YELLOW: '\x1b[43m',
        BLUE: '\x1b[44m',
        MAGENTA: '\x1b[45m',
        CYAN: '\x1b[46m',
        WHITE: '\x1b[47m'
    }
};

const Color = new Proxy({
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    DIM: '\x1b[2m',
    UNDERLINE: '\x1b[4m',
    BLINK: '\x1b[5m',
    REVERSE: '\x1b[7m',
    HIDDEN: '\x1b[8m',
    BOLD: '\033[1m',
    LOG: {
        FG: Colors.RESET
    },
    DEBUG: {
        FG: Colors.FG.GREEN
    },
    INFO: {
        FG: Colors.FG.CYAN
    },
    WARN: {
        FG: Colors.FG.YELLOW
    },
    ERROR: {
        FG: Colors.FG.RED
    }
}, {
    /**
     * make sure not found properties just return a
     * non color reset value. Also checks config if colors are enabled.
     */
    get(target, prop) {
        return (Reflect.has(target, prop))
            ? target[prop]
            : {
                FG: value?.FG ?? Colors.RESET ?? '',
                BG: value?.BG ?? Colors.RESET ?? ''
            };
    }
});

class Log {
    id;
    logger;
    method;
    level;
    config;
    system;
    timestamp;
    message;
    args;

    get line () {
        return `[${this.timestamp.toISOString()}] ${this.system?.hostname ?? 'localhost'} ${this.system.address ?? '0.0.0.0'} ${Color[this.level].FG}[${this.logger ?? ''}:${this.level}]   ${this.message}${Color.RESET}`;
    }

    get plain () {
        const ansiColorRegex = /\x1B\[[0-9;]*m/g;
        return this.line.replace(ansiColorRegex, '');
    }

    constructor(options={}) {
        // console.log('new Log');
        this.id = crypto.randomUUID();
        this.system = getSystemInfo();
        this.timestamp = new Date();
        this.logger = options?.logger;
        this.method = options?.method;
        this.level = options?.level ?? this.method.toUpperCase();
        this.config = options?.config ?? {};
        this.message = options?.message ?? '';
        this.args = options?.args ?? [];
    }

    toJSON() {
        return ObjectUtil.serialize({
            id: this.id,
            logger: this.logger ?? '',
            method: this.method,
            level: this.level,
            config: this.config,
            system: this.system,
            timestamp: this.timestamp,
            message: this.message,
            args: this.args,
            line: this.line,
            plain: this.plain
        });
    }

    toString() {
        return this.line;
    }

    toStringTag() {
        return `[object Log]`;
    }
}

module.exports = class Logger {
    static Level = Level;
    static Color = Color;
    static Log = Log;

    static #instances = new Map();

    static #globalOptions = {
        name: 'ZOINX',
        configFile: null,
        config: { colors: true, level: 'ALL', instances: {} },
        filters: [],
        transformers: [],
        destinations: [
            new ConsoleDestination()
        ]
    }

    static getGlobalOptions() {
        return this.#globalOptions;
    }
    static setGlobalOptions(options={}) {
        deepMerge(this.#globalOptions, options);

        debug('static #globalOptions', this.#globalOptions);

        if (this.#globalOptions.configFile) {
            watchConfigFile(this.#globalOptions.config, this.#globalOptions.configFile);
        }
    }

    static createLogger(options={}) {
        debug('static createLogger options:', options);

        let instance;
        let instances = this.#instances;
        let name = options?.name ?? this.#globalOptions.name;

        if (instances.has(name)) {
            // console.debug(`[zoinx/log] Logger name ${name} already exists, resuing instance`);
            return this.getLogger(name);
        } else {
            instance = new this({ ...options, name });
            instances.set(instance.name, instance);
            // console.debug(`[zoinx/log] returning instance ${instance.name}`);
            return instance;
        }
    }
    static getLogger(name) {
        if (this.#instances.has(name)) {
            return this.#instances.get(name);
        } else {
            console.warn(`[zoinx/log] Logger ${name} does not exist. Creating now.`);
            return this.createLogger({ name });
        }
    }

    static {
        // debug('static initializer');
    }

    constructor({ name, config, configFile, filters=[], transformers=[], destinations=[] } = {}) {
        debug(this.constructor.name, 'constructor');

        this.#self = this.constructor;
        this.name = name ?? this.#self.getGlobalOptions().name;

        this.#configFile = configFile;
        this.#config = config ?? this.#self.getGlobalOptions().config ?? {};
        this.#filters = filters ?? [];
        this.#transformers = transformers;
        this.#destinations = destinations;

        if (this.#configFile) {
            watchConfigFile(this.#config, this.#configFile);
        }
    }

    name;
    #self;
    #config = {
        level: 'all',
        colors: true,
        instances: {}
    };
    #configFile = undefined;
    #filters = [];
    #transformers = [];
    #destinations = [];

    #log(level, [message, ...args]) {
        message = StringUtil.normalizeMultiLineIndent(message);

        // console.debug('#log', { level, args });
        const LEVEL = level.toUpperCase();

        // check config if instance is named and set to true otherwise allow log.
        if (Reflect.has(this.#config.instances, this.name) && !this.#config.instances[this.name]) {
            return debug(`${this.name} is disabled`);
        }

        // check config if level of log method is greater that configured level.
        if (this.#config.level && Logger.Level[this.#config.level] < Logger.Level[LEVEL]) {
            return debug(`${level} is disabled`);
        }

        let data = new Log({
            logger: this.name,
            method: level,
            level: LEVEL,
            config: this.#config,
            system: getSystemInfo(),
            timestamp: new Date().toISOString(),
            message: message,
            args: args,
        });

        /**
         * Run filters
         */
        const globalFilters = this.#self.getGlobalOptions().filters;
        const instanceFilters = this.#filters;
        const filters = [...globalFilters, ...instanceFilters];
        const filterResults = filters.map(filterFn => {
            if (typeof filterFn !== 'function') {
                throw new Error(`Filter should be a function`, filterFn);
            }
            return filterFn.bind(this)(data);
        });
        const isFiltered = filterResults.includes(false);
        if (isFiltered) return debug(`log is filtered out`);

        /**
         * Run transformers
         */
        const globalTransformers = this.#self.getGlobalOptions().transformers;
        const instanceTransformers = this.#transformers;
        const transformers = [...globalTransformers, ...instanceTransformers];
        if (transformers.length) {
            data = transformers.reduce((data, transformerFn) => {
                return transformerFn(data);
            }, data);
        }

        /**
         * Run destinations
         */
        const globalDestinations = this.#self.getGlobalOptions().destinations;
        const instanceDestination = this.#destinations;
        const destinations = [...globalDestinations, ...instanceDestination].filter(destination => {
            return destination.enabled;
        });

        if (!destinations.length) {
            debug(this.name, 'No destinations enabled or defined');
        }

        for (let index = 0; index < destinations.length; index++) {
            const destination = destinations[index];
            destination.run?.apply(destination, [data]);
        }
    }

    log(message) {
        debug(this.name, 'public log');
        this.#log('log', arguments);
    }

    info(message) {
        debug(this.name, 'public info');
        this.#log('info', arguments);
    }

    debug(message) {
        debug(this.name, 'public debug');
        this.#log('debug', arguments);
    }

    warn(message) {
        debug(this.name, 'public warn');
        this.#log('warn', arguments);
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
        this.#log('error', [(message || arg0 || 'No Error Message'), ...args]);
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

    json(obj) {
        console.log('local-only-json', JSON.stringify(obj, null, 4));
    }
}
