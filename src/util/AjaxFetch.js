// external
const _ = require('lodash');
const fetch = require('node-fetch');
// siblings
const Log = require('../log');
// local
const { StaticUtil } = require('./StaticUtil.js');

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
                    resultJsonObj = response.json();
                } else resultJsonObj = response;
            }
        } catch (ex) {
            Log.error(`execReq error calling ${options.url}.`);
            Log.error(ex.message);
            resultJsonObj = { error: ex };
        }

        if (logOptions) console.log(resultJsonObj);
        return resultJsonObj;
    }
};
