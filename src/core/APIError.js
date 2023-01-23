// sibling
const { HTTPStatus } = require('../enums');

module.exports = class APIError extends Error {
    statusCode;
    statusMessage;
    userMessage;
    summary;

    constructor(statusCode, userMessage, errorMessage) {
        errorMessage = errorMessage || userMessage;

        super(errorMessage);

        this.statusCode = HTTPStatus[HTTPStatus[statusCode]];
        this.statusMessage = HTTPStatus[statusCode];
        this.userMessage = userMessage;

        if (this.statusCode >= 100 && this.statusCode < 200) {
            this.summary = `Hold on`;
        }
        if (this.statusCode >= 200 && this.statusCode < 300) {
            this.summary = `Here you go`;
        }
        if (this.statusCode >= 300 && this.statusCode < 400) {
            this.summary = `Go away`;
        }
        if (this.statusCode >= 400 && this.statusCode < 500) {
            this.summary = `You fucked up`;
        }
        if (this.statusCode >= 500 && this.statusCode < 600) {
            this.summary = `I fucked up`;
        }
    }

    toJSON() {
        return {
            statusCode: this.statusCode,
            statusMessage: this.statusMessage,
            userMessage: this.userMessage
        };
    }
};
