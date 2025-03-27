const _ = require('lodash');
const crypto = require("crypto");
const Log = require('../log/Log');

module.exports = class Encryption {

    static async encrypt(toEncrypt, key, iv) {
        let encryptedData;

        try {
            if (!_.isEmpty(toEncrypt) && _.isString(toEncrypt)) {

                key = (_.isEmpty(key) || key === 'undefined') ? undefined : process.env.TELEMETRY_SECRET_KEY;
                iv = (_.isEmpty(iv) || iv === 'undefined') ? undefined : process.env.TELEMETRY_SECRET_IV;

                if (!_.isEmpty(key) && !_.isEmpty(iv)) {
                    key = Buffer.from(key, 'base64');
                    iv = Buffer.from(iv, 'hex');
                    const cipher = crypto.createCipheriv(process.env.TELEMETRY_ENCRYPT_ALGORITHM, key, iv);

                    encryptedData = cipher.update(toEncrypt, 'utf8', 'hex');
                    encryptedData += cipher.final('hex');
                }
            }
        }
        catch (e) {
            Log.error(e);
        }

        return encryptedData ?? toEncrypt;
    }

    static async decrypt(toDecrypt, key, iv) {
        let decryptedData;

        try {
            if (!_.isEmpty(toDecrypt) && _.isString(toDecrypt)) {
                if (_.isEmpty(key)) key = process.env.TELEMETRY_SECRET_KEY;
                if (_.isEmpty(iv)) iv = process.env.TELEMETRY_SECRET_IV;

                key = Buffer.from(key, 'base64');
                iv = Buffer.from(iv, 'hex');
                const decipher = crypto.createDecipheriv(process.env.TELEMETRY_ENCRYPT_ALGORITHM, key, iv);

                // Decrypt the encrypted data
                let decryptedData = decipher.update(toDecrypt, 'hex', 'utf8');
                decryptedData += decipher.final('utf8');
            }
        }
        catch (e) {
            Log.error(e);
        }

        return decryptedData ?? toDecrypt;
    }

}
