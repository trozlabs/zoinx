// external
const _ = require('lodash');
const StaticUtil = require('./StaticUtil.js');
const { Logger } = require('../logger');

module.exports = class Fetch {

    logger = Logger.create({ name: 'Fetch' });
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
                const response = await fetch(options.mockUrl);
                const responseJson = await response.json();
                resultJsonObj = responseJson;
            } else {
                if (logOptions) this.logger.debug('options', options);

                const response = await fetch(options.url, options);

                if (response.ok) {
                    try {
                        resultJsonObj = await response.json();
                    }
                    catch (e) {
                        this.logger.error(e);
                        resultJsonObj = response;
                    }
                }
                else resultJsonObj = response;
            }
        } catch (ex) {
            this.logger.error(`execReq error calling ${options.url}\n`, ex);
            resultJsonObj = { error: ex };
        }

        if (logOptions) this.logger.debug('responseJsonObj', resultJsonObj);

        return resultJsonObj;
    }
};
