// siblings
const Log = require('../log');
// local
const env = require('./Environment');
//const InitDefaultData = require('../../../docker/mongodb/init');

module.exports = class AppConfig {
    static get(key) {
        return process.env[key];
    }

    static async init(...files) {
        try {
            await this.initEnv(...files);
            global.mongoosePool = require('../../../core/database')();

            console.log(` 
|----------------------------------------------------------------------------| 
|         VARIABLE:         |                     VALUE:                     | 
|----------------------------------------------------------------------------| 
| ENV                       | ${AppConfig.get('ENV')} 
| NAME                      | ${AppConfig.get('NAME')} 
| VERSION                   | ${AppConfig.get('VERSION')} 
| DEBUG                     | ${AppConfig.get('DEBUG')} 
| PORT                      | ${AppConfig.get('PORT')} 
| HTTP2                     | ${AppConfig.get('HTTP2')} 
| HTTPS                     | ${AppConfig.get('HTTPS')} 
| SSL_KEY                   | ${AppConfig.get('SSL_KEY_PATH')} 
| SSL_CERT                  | ${AppConfig.get('SSL_CERT_PATH')} 
|----------------------------------------------------------------------------- 
| Mongo Database:
|----------------------------------------------------------------------------- 
| DATABASE_PROTOCOL         | ${AppConfig.get('DATABASE_PROTOCOL')} 
| DATABASE_HOST             | ${AppConfig.get('MONGO_HOST')} 
| DATABASE_PORT             | ${AppConfig.get('MONGO_PORT')} 
| DATABASE_USERNAME         | ${AppConfig.get('MONGO_USER')} 
| DATABASE_PASSWORD         | ${AppConfig.get('MONGO_PASS')} 
| DATABASE_NAME             | ${AppConfig.get('MONGO_DB_NAME')} 
| DATABASE_OPTIONS          | ${AppConfig.get('MONGO_OPTIONS')} 
|----------------------------------------------------------------------------- 
    `);
        } catch (e) {
            Log.info(`Must have file path info init application. Try using (__dirname, '.env') ... ${e.message}`);
        }
    }

    static async initEnv(...files) {
        try {
            await env(...files);
        } catch (e) {
            Log.info(`Must have file path info init. Try using (__dirname, '.env') ... ${e.message}`);
        }
    }
};
