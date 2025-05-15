const _ = require('lodash');
const Logger = require('../logger/Logger');
const AppConfig = require('../util/AppConfig');
const { StaticUtil } = require('../util');
const protobuf = require('protobufjs');

module.exports = class KafkaStatics {

    static logger = Logger.create({ name: 'KafkaStatics' });
    static testConfig = {}

    static inferSubjectName(topic, isKey = false) {
        return `${topic}-${isKey ? 'key' : 'value'}`;
    }

    static async getAllProtobufMessageNames(root, logDetails=false) {
        const messageNames = [];

        function traverseTypes(current, fn) {
            if (current instanceof protobuf.Type)
                fn(current);
            if (current.nestedArray)
                current.nestedArray.forEach(function(nested) {
                    traverseTypes(nested, fn);
                });
        }

        traverseTypes(root, function(type) {
            messageNames.push(_.trimStart(type.fullName, '.'));
            if (logDetails) {
                console.log(
                    type.constructor.className + " " + type.name
                    + "\n  fully qualified name: " + _.trimStart(type.fullName, '.')
                    + "\n  parent: " + _.trimStart(type.parent, ',')
                );
            }
        });
        return messageNames;
    }

    static async getRequiredFields(msgObj) {
        let required = [];
        if (!_.isEmpty(msgObj) && _.isObject(msgObj)) {
            try {
                for await (const fieldKey of Object.keys(msgObj.fields)) {
                    if (_.isUndefined(msgObj.fields[fieldKey].options?.proto3_optional))
                        required.push(fieldKey);
                }
            }
            catch (e) {
                this.logger.error(e.message);
            }
        }
        return required;
    }

    static async getKafkaSSLProps(varNamePrefix, env='DEV') {
        try {
            let mech = AppConfig.get(`${varNamePrefix}_MECHANISM_${env.toUpperCase()}`),
                protocol = AppConfig.get(`${varNamePrefix}_PROTOCOL_${env.toUpperCase()}`),
                user = AppConfig.get(`${varNamePrefix}_USER_${env.toUpperCase()}`),
                pwd = AppConfig.get(`${varNamePrefix}_PWD_${env.toUpperCase()}`);

            // ENV var come back with string undefined but we want a real undefined
            mech = (_.isEmpty(mech) || mech === 'undefined') ? undefined : mech;
            protocol = (_.isEmpty(protocol) || protocol === 'undefined') ? undefined : protocol;
            user = (_.isEmpty(user) || user === 'undefined') ? undefined : user;
            pwd = (_.isEmpty(pwd) || pwd === 'undefined') ? undefined : pwd;

            return {
                mech: mech,
                protocol: protocol,
                user: user,
                pwd: pwd
            }
        }
        catch (e) {
            this.logger.error(e.message);
        }

        return {};
    }

    static async getSchemaRegistryProps(varNamePrefix, env='DEV') {
        try {
            let encoded = AppConfig.get(`${varNamePrefix}_SCHEMA_ENCODED_${env.toUpperCase()}`),
                host = AppConfig.get(`${varNamePrefix}_SCHEMA_HOST_${env.toUpperCase()}`),
                key = AppConfig.get(`${varNamePrefix}_SCHEMA_KEY_${env.toUpperCase()}`),
                secret = AppConfig.get(`${varNamePrefix}_SCHEMA_SECRET_${env.toUpperCase()}`),
                subject = AppConfig.get(`${varNamePrefix}_SCHEMA_SUBJECT_${env.toUpperCase()}`);

            encoded = (_.isEmpty(encoded) || host === 'undefined') ? undefined : StaticUtil.StringToBoolean(host);
            host = (_.isEmpty(host) || host === 'undefined') ? undefined : host;
            key = (_.isEmpty(key) || key === 'undefined') ? undefined : key;
            secret = (_.isEmpty(secret) || secret === 'undefined') ? undefined : secret;
            subject = (_.isEmpty(subject) || subject === 'undefined') ? undefined : subject;

            return {
                encoded: encoded,
                host: host,
                key: key,
                secret: secret,
                subject: subject
            }
        }
        catch (e) {
            this.logger.error(e.message);
        }

        return {};
    }

}
