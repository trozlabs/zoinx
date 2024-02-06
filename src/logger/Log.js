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
        let timestamp = this.timestamp.toISOString();
        let hostname = this.system?.hostname ?? 'localhost';
        let address = this.system?.address ?? '0.0.0.0';
        let loggerName = this.logger?.name ?? '';
        let appName = this.logger?.app ?? '';
        let level = this.level;
        let message = this.message;

        let colorDim = Color.DIM;
        let colorReset = Color.RESET;
        let colorText = Color[this.level].FG;

        return `${colorDim}[${timestamp}] ${hostname} ${address} ${colorReset}${colorText}[${appName} > ${loggerName} > ${level}] ${message}${colorReset}`;
    }
    get plain () {
        // const ansiColorRegex = /\x1B\[[0-9;]*m/g;
        let timestamp = this.timestamp.toISOString();
        let hostname = this.system?.hostname ?? 'localhost';
        let address = this.system?.address ?? '0.0.0.0';
        let loggerName = this.logger?.name ?? '';
        let appName = this.logger?.app ?? '';
        let level = this.level;
        let message = this.message;

        return `[${timestamp}] ${hostname} ${address} [${appName} > ${loggerName} > ${level}] ${message}`;
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
