const { WebSocket } = require('ws');
const http = require('http');
const _ = require('lodash');
const Logger = require('../logger/Logger');
const WebSocketStream = require('./WebSocketStream');

module.exports = class WebSocketServer {

    logger = Logger.create({ name: 'WebSocketServer' });
    channelStreams = new Map();
    sockserver

    constructor(channels=['heap'], config={ port: process.env.WS_PORT }, autoConnectHeapChannel=false) {
        if (!_.isArray(channels)) {
            this.logger.warn('Must supply a list of channels to createa Web Socket Server.');
            return;
        }
        if (!_.isObject(config)) {
            this.logger.warn('No WebSocket config supplied. Must supply a config to create a Web Socket Server.');
            return;
        }

        this.sockserver = new WebSocket.Server(config);
        this.#setUpChannels(channels).catch((err) => {
            this.logger.error(err);
        });
        this.sockserver.on('connection', (ws, req) => this.#startConnectionListener(ws, req));
        if (autoConnectHeapChannel && this.channelStreams.has('heap'))
            this.startHeapChannel();
    }

    async #setUpChannels(channels=[]) {
        if (!_.isArray(channels) || _.isEmpty(channels)) {
            this.logger.warn('No channels provided to setup web socket server.')
            return;
        }

        for (let i=0; i<channels.length; i++) {
            let channelName = 'heap',
                tmpCallback = function() { return; };

            if (_.isString(channels[i]) && channels[i] === 'heap')
                tmpCallback = this.startHeapChannel;
            else if (_.isObject(channels[i]) && _.isString(channels[i].channelName) && _.isFunction(channels[i].callback)) {
                channelName = channels[i].channelName;
                tmpCallback = channels[i].callback;
            }

            this.channelStreams.set(channelName, {stream: undefined, callback: tmpCallback});
        }
    }

    async addChannel(channelName, channelCallback=function() { return undefined; }) {
        if (_.isEmpty(channelName) || !_.isString(channelName) || !_.isFunction(channelCallback)) {
            this.logger.warn('Must supply a channel name and a channel callback function to add a channel to the web socket server.');
            return;
        }

        this.#setUpChannels([{channelName: channelName, callback: channelCallback}]);
    }

    async send(channelName, msg) {
        if (_.isEmpty(channelName) || !_.isString(channelName) || _.isEmpty(msg) || !_.isString(msg)) {
            this.logger.warn('Must supply a channel name and a channel callback function to add a channel to the web socket server.');
            return;
        }

        let channelStream = this.channelStreams.get(channelName);
        if (_.isUndefined(channelStream)) {
            this.logger.warn(`No channel found for ${channelName}.`);
            return;
        }

        if (!_.isUndefined(channelStream.stream)) {
            channelStream.stream.write(msg);

            if (_.isFunction(channelStream.callback))
                channelStream.callback(msg);
        }
    }

    async #startConnectionListener(ws, req) {
        const channel = req.url.split('/')[1];

        if (this.channelStreams.has(channel)) {
            let stream = new WebSocketStream(ws),
                channelStream = this.channelStreams.get(channel);

            if (_.isUndefined(channelStream.stream))
                channelStream.stream = stream;

            ws.on('error', this.logger.error);

            ws.on('close', function close() {
                console.log('Client disconnected');

                // If there are no more clients connected to this channel, remove the stream
                // if (this.sockserver.clients.size === 0) {
                //     this.channelStreams.delete(channel);
                // }
            });
        }
    }

    async startHeapChannel() {
        this.sockserver.on('connection', function (ws, req) {
            const id = setInterval(function () {
                ws.send(JSON.stringify(process.memoryUsage()), function () {
                });
            }, 1000);

            ws.on('error', this.logger.error);

            ws.on('close', function () {
                clearInterval(id);
            });

        });
    }

    async onSocketError(err) {
        console.error(err);
    }

}
