
const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const DIM = '\x1b[2m';
const UNDERLINE = '\x1b[4m';
const BLINK = '\x1b[5m';
const REVERSE = '\x1b[7m';
const HIDDEN = '\x1b[8m';
const BOLD = '\033[1m';

const FG = {
    BLACK: '\x1b[30m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m'
};

const BG = {
    BLACK: '\x1b[40m',
    RED: '\x1b[41m',
    GREEN: '\x1b[42m',
    YELLOW: '\x1b[43m',
    BLUE: '\x1b[44m',
    MAGENTA: '\x1b[45m',
    CYAN: '\x1b[46m',
    WHITE: '\x1b[47m'
};

module.exports = {
    RESET,
    BRIGHT,
    DIM,
    UNDERLINE,
    BLINK,
    REVERSE,
    HIDDEN,
    BOLD,
    FG,
    BG,
    Background: BG,
    Text: FG,

    style(...colors) {
        const color = colors.map(c => `${c}`).join('');
        return (...args) => this.log(`${color}`, ...args, RESET);
    },
    log() {
        console.log(...arguments);
    },
    verbose() {
        console.info(`${DIM} VERBOSE: \t`, ...arguments, RESET);
    },
    info() {
        console.info(`${FG.BLUE} INFO: \t`, ...arguments, RESET);
    },
    debug() {
        console.debug(`${FG.GREEN} DEBUG: \t`, ...arguments, RESET);
    },
    error() {
        console.error(`${FG.RED} ERROR: \t`, ...arguments, RESET);
    },
    warn() {
        console.warn(`${FG.YELLOW} WARN: \t`, ...arguments, RESET);
    },
    json() {
        console.log(`JSON: ${JSON.stringify(...arguments, null, 4)}${RESET} `);
    },
    table() {
        console.table(...arguments);
    },
    route(req, res, next) {
        console.log(`\n${req.method}: \t ${req.originalUrl} `);
        console.log('params:\t', req.params);
        console.log('query:\t', req.query);
        console.log('body:\t', req.body);
        next();
    },
    banner(message, border = '~') {
        const line = new Array(arguments[0].length + 2).fill(border).join('');
        console.log(`\n${BOLD}${line}\n${BOLD} ${message} \n${BOLD}${line}${RESET}\n`);
    }
};
