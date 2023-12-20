const ObjectUtil = require('../util/ObjectUtil.js');
const { Color } = require('./Color.js');
const { getSystemInfo } = require("./util.js");

class Log {
    id;
    app;
    logger;
    method;
    level;
    config;
    system;
    timestamp;
    message;
    args;

    get line () {
        return `${Color.DIM}[${this.timestamp.toISOString()}] ${this.system?.hostname ?? 'localhost'} ${this.system.address ?? '0.0.0.0'} ${Color.RESET}${Color[this.level].FG}[${this.logger?.name ?? ''}/${this.logger?.app ?? ''}:${this.level}] ${this.message}${Color.RESET}`;
    }
    get plain () {
        // const ansiColorRegex = /\x1B\[[0-9;]*m/g;
        return `[${this.timestamp.toISOString()}] ${this.system?.hostname ?? 'localhost'} ${this.system?.address ?? '0.0.0.0'} [${this.logger?.name ?? ''}/${this.logger?.app ?? ''}:${this.level}] ${this.message}`
    }

    constructor(options={}) {
        this.id = crypto.randomUUID();
        this.system = getSystemInfo();
        this.timestamp = new Date();
        this.logger = options?.logger ?? { name: '', app: '' };
        this.method = options?.method;
        this.level = options?.level ?? this.method.toUpperCase();
        this.config = options?.config ?? {};
        this.message = options?.message ?? '';
        this.args = options?.args ?? [];

        if (options?.toString) {
            this.toString = options?.toString.bind(this);
        }
    }

    toJSON() {
        return ObjectUtil.serialize({
            id: this.id,
            logger: this.logger,
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

    toString(color=true) {
        console.log('toString')
        return color
            ? this.line
            : this.plain
        ;
    }

    toStringTag() {
        return `[object Log]`;
    }
}

module.exports = Log;
