// siblings
const { Log } = require('../log');
// local
const env = require('./Env');
const AppCache = require("../core/AppCache");
const EventEmitter = require('events');

module.exports = class AppConfig {
    static get(key) {
        if (!key) {
            return process.env;
        }
        return process.env[key];
    }

    static async init(...files) {
        try {
            global.eventBus = new EventEmitter();
            await this.initEnv(...files);
        } catch (e) {
            Log.warn(`Must have file path info init application. Try using (__dirname, '.env') ... ${e.message}`);
        }
    }

    static async initEnv(...files) {
        try {
            global.eventBus = new EventEmitter();
            await env.load(...files);
        } catch (e) {
            Log.warn(`Must have file path info init. Try using (__dirname, '.env') ... ${e.message}`);
        }
    }
}
