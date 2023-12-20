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

module.exports = {
    Colors,
    Color
}
