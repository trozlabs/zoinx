// siblings
const { Log } = require('../log');
// local
const env = require('./Env');

module.exports = class AppConfig {
    static get(key) {
        if (!key) {
            return process.env;
        }
        return process.env[key];
    }

    static async init(...files) {
        try {
            await this.initEnv(...files);
        } catch (e) {
            Log.warn(`Must have file path info init application. Try using (__dirname, '.env') ... ${e.message}`);
        }
    }

    static async initEnv(...files) {
        try {
            await env.load(...files);
        } catch (e) {
            Log.warn(`Must have file path info init. Try using (__dirname, '.env') ... ${e.message}`);
        }
    }
}
