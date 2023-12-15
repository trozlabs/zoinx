// external
const _ = require('lodash');
const fetch = require('node-fetch');
// local
const StaticUtil = require('./StaticUtil.js');
const Logger = require('../log/Logger.js');

const logger = Logger.getLogger('ZOINX/UTIL');

module.exports = class Fetch {
    #sleepTime = 0;

    static async execReq(options, logOptions = false) {
        options = Object.assign(
            {
                method: 'GET',
                timeout: 30000,
                url: '',
                params: undefined,
                headers: undefined,
                payload: undefined,
                body: undefined,
                useMockData: false,
                mockUrl: undefined,
                sleepTime: 0
            },
            options || {}
        );

        let resultJsonObj = {};

        try {
            if (options.useMockData) {
                await StaticUtil.sleep(options.sleepTime);
                await fetch(options.mockUrl)
                    .then((response) => response.json())
                    .then((json) => {
                        resultJsonObj = json;
                    });
            } else {
                if (logOptions) console.log(options);
                const response = await fetch(options.url, options);
                if (response.ok) {
                    try {
                        resultJsonObj = await response.json();
                    }
                    catch (e) {
                        resultJsonObj = response;
                    }
                }
                else resultJsonObj = response;
            }
        } catch (ex) {
            logger.error(`execReq error calling ${options.url}\n`, ex);
            resultJsonObj = { error: ex };
        }

        if (logOptions) logger.debug('responseJsonObj', resultJsonObj);

        return resultJsonObj;
    }
};
