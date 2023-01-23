// native
const fs = require('fs');
const util = require('util');
const path = require('path');
// siblings
const { Type } = require('../util');
const { Console } = require('console');

const RESET = ' \x1b[0m ';
const BRIGHT = ' \x1b[1m ';
const DIM = ' \x1b[2m ';
const UNDERSCORE = ' \x1b[4m ';
const BLINK = ' \x1b[5m ';
const REVERSE = ' \x1b[7m ';
const HIDDEN = ' \x1b[8m ';
const BOLD = ' \033[1m ';

const FG = {
    BLACK: '\x1b[30m ',
    RED: '\x1b[31m ',
    GREEN: '\x1b[32m ',
    YELLOW: '\x1b[33m ',
    BLUE: '\x1b[34m ',
    MAGENTA: '\x1b[35m ',
    CYAN: '\x1b[36m ',
    WHITE: '\x1b[37m '
};

const BG = {
    BLACK: '\x1b[40m ',
    RED: '\x1b[41m ',
    GREEN: '\x1b[42m ',
    YELLOW: '\x1b[43m ',
    BLUE: '\x1b[44m ',
    MAGENTA: '\x1b[45m ',
    CYAN: '\x1b[46m ',
    WHITE: '\x1b[47m '
};

function printByType(arg) {
    var type = typeof arg;
    if (type != undefined || type != null) {
        type = arg.constructor.name.toLowerCase();
    }
    console.log(typeof arg, type);
    return arg;
}

class Log {
    static enabled = {
        LOG: true,
        INFO: true,
        DEBUG: true,
        ERROR: true,
        JSON: true,
        BANNER: true,
        ROUTE: true
    };

    static RESET = RESET;
    static BRIGHT = BRIGHT;
    static DIM = DIM;
    static UNDERSCORE = UNDERSCORE;
    static BLINK = BLINK;
    static REVERSE = REVERSE;
    static HIDDEN = HIDDEN;
    static BOLD = BOLD;

    static FG = FG;
    static BG = BG;

    static isReady = false;
    static #instance;

    #enabled;
    #path;
    #writeStream;
    #console;

    constructor(config) {
        if (Log.instance) {
            return Log.#instance;
        }

        var consoleConfig = {
            colors: true,
            stdout: process.stdout,
            stderr: process.stderr,
            inspectOptions: {
                showHidden: true,
                depth: Infinity,
                getters: true
            }
        };

        if (config) {
            this.#enabled = config.enabled || Log.enabled;

            /**
             *
             */
            if (config.path && config.filename) {
                var date = new Date().toISOString().split('T').slice(0, 1);
                var dir = `${config.path}`;
                var file = `${config.filename}-${date}.log`;

                this.#path = path.join(dir, file);
                // fs.mkdirSync(this.#path, { recursive: true });
                // console.log('Logs are being written to:', this.#path);
                // this.#writeStream = fs.createWriteStream(this.#path, {
                //     flags: 'a'
                // });
                // consoleConfig.stdout = this.#writeStream;
                // consoleConfig.stderr = this.#writeStream;
            }
        }

        this.#console = new Console(consoleConfig);

        Log.#instance = this;
        Log.isReady = true;
    }

    #log() {
        const timestamp = new Date().toJSON().split('T').join(' ');
        const args = Array.from(arguments);

        var message = util.formatWithOptions(
            {
                colors: true,
                showHidden: true
            },
            ...args
        );

        /**
         * If there's not a writeStream log the old way.
         */
        if (this.#writeStream) {
            console.log(message);
        }

        this.#console.log(message);
    }

    static log() {
        if (!Log.enabled.LOG) return;
        this.#instance.#log(...arguments);
    }

    static debug() {
        if (process.env.NODE_ENV != 'development');
        this.#instance.#log(`DEBUG:\t`, ...arguments);
    }

    static info() {
        if (!Log.enabled.INFO) return;
        this.#instance.#log(`INFO:\t`, ...arguments);
    }

    static error(error) {
        if (!Log.enabled.ERROR) return;
        var message = error && error.message ? error.message : error;
        this.#instance.#log(`ERROR:\t`, message);
        return error;
    }

    static json(json) {
        if (!Log.enabled.JSON) return;
        try {
            this.#instance.#log('JSON:\t', json);
        } catch (e) {
            this.error(e);
            this.#instance.#log(json);
        }
    }

    static banner(message, border = '~') {
        if (!Log.enabled.BANNER) return;
        var line = new Array(arguments[0].length + 2).fill(border).join('');
        this.#instance.#log('\n' + line);
        this.#instance.#log('', message);
        this.#instance.#log(line + '\n');
    }

    static demo() {
        Log.banner('Demo of All Log Methods', '#');
        Log.log(Math.random());
        Log.log('Log.log', { prop: 1 }, 2, 'String', () => { }, true, false, [], 1.2, 10n, null, undefined);
        Log.info('Log.info');
        Log.debug('Log.debug');
        Log.error(new Error('Log.error example'));
        Log.json({ message: 'Log.json' });
        Log.json(undefined);
        Log.banner('Demo of All Log Methods');
    }

    static route(req, res, next) {
        if (!Log.enabled.ROUTE) return;
        Log.log(`\n${req.method}:\t ${req.originalUrl}`);
        Log.log('params:\t', req.params);
        Log.log('query:\t', req.query);
        Log.log('body:\t', req.body);
        next();
    }

    static test(fnIn, fn, expectedResult) {
        var fnRes = Type.isArray(fnIn) ? fn(...fnIn) : fn(fnIn);

        if (Type.isObject(fnRes) && Type.isObject(expectedResult)) {
            fnRes = JSON.stringify(fnRes);
            expectedResult = JSON.stringify(expectedResult);
        }
        var pass = fnRes === expectedResult;

        this.#instance.#log(`[${pass ? '√' : 'x'}]- ${fn.name}(${fnIn})\n` + ` |__ ${fnRes}\n` + ` |__ ${expectedResult}\n` + ` |__ ${pass ? 'PASSED' : 'FAILED'}\n`);
        if (!pass) console.error('FAILED:', fnRes, expectedResult);
        return fnRes === expectedResult;
    }
}

module.exports = Log