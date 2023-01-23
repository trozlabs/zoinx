// native
const os = require('os');
// external
const _ = require('lodash');
// sibling
const { HTTPStatus } = require('../enums');

module.exports = class APIResponse {
    hostname;
    statusCode;
    statusMessage;
    dataCount;
    errorCount;
    #data;
    #error;
    #message;

    constructor() {
        this.srvInstance = os.hostname();
        this.hostname = os.hostname();
        this.status = 200;
    }

    set status(status) {
        this.statusCode = status;
        this.statusMessage = HTTPStatus[status];
    }
    get status() {
        return { statusCode: this.statusCode, statusMessage: this.statusMessage };
    }

    set message(message) {
        message = !Array.isArray(message) ? [message] : message;
        if (!this.#message || !this.#message.length) {
            this.#message = message;
        } else {
            this.#message.push(...message);
        }

        if (this.#message.length <= 1 && _.isEmpty(this.#message[0])) {
            this.messageCount = 0;
            this.#message = [];
        } else this.messageCount = this.#message.length;
    }
    get message() {
        return this.#data;
    }

    set data(data) {
        data = !Array.isArray(data) ? [data] : data;
        if (!this.#data || !this.#data.length) {
            this.#data = data;
        } else {
            this.#data.push(...data);
        }
        if (this.#data.length <= 1 && _.isEmpty(this.#data[0])) {
            this.dataCount = 0;
            this.#data = [];
        } else this.dataCount = this.#data.length;
    }
    get data() {
        return this.#data;
    }

    set error(error) {
        error = !Array.isArray(error) ? [error] : error;
        if (!this.#error || !this.#error.length) {
            this.#error = error;
        } else {
            this.#error.push(...error);
        }
        if (this.#error.length <= 1 && _.isNull(this.#error[0])) {
            this.errorCount = 0;
            this.#error = [];
        } else this.errorCount = this.#error.length;
    }
    get error() {
        if (_.isUndefined(this.#error) || _.isNull(this.#error)) return '';
        return this.#error[0].message;
    }

    /**
     * reset any private property
     */
    clear(prop) {
        try {
            this[`#${prop}`] = undefined;
        } catch (e) {
            console.log(e.message);
        }
    }

    toString() {
        return JSON.stringify({
            hostname: this.hostname,
            statusCode: this.statusCode,
            statusMessage: this.statusMessage,
            errors: this.error,
            dataCount: this.dataCount,
            data: this.data
        });
    }

    toJSON() {
        return {
            hostname: this.hostname,
            statusCode: this.statusCode,
            statusMessage: this.statusMessage,
            errors: this.error,
            dataCount: this.dataCount,
            data: this.data
        };
    }
};
