const { WebSocket } = require('ws');
const _ = require('lodash');
const Logger = require('../logger/Logger');
const WebSocketStream = require('./WebSocketStream');
const url = require('url');

module.exports = class WebSocketServer {

    logger = Logger.create({ name: 'WebSocketServer' });
    channelStreams = new Map();
    sockserver;
    historyLimit = 100; // max messages kept per channel

    constructor(channels = ['heap'], config = { port: process.env.WS_PORT }, autoConnectHeapChannel = false) {
        if (!_.isArray(channels)) {
            this.logger.warn('Must supply a list of channels to create a Web Socket Server.');
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

    async #setUpChannels(channels = []) {
        for (let ch of channels) {
            let channelName = ch,
                tmpCallback = () => {};

            if (_.isString(ch) && ch === 'heap') {
                tmpCallback = this.startHeapChannel;
            } else if (_.isObject(ch) && _.isString(ch.channelName) && _.isFunction(ch.callback)) {
                channelName = ch.channelName;
                tmpCallback = ch.callback;
            }

            if (!this.channelStreams.has(channelName)) {
                this.channelStreams.set(channelName, {
                    clients: new Map(),   // clientId -> {stream, lastMsgId}
                    history: [],          // array of {id, msg}
                    nextMsgId: 1,         // incremental message id
                    callback: tmpCallback
                });
            }
        }
    }

    async addChannel(channelName, channelCallback = () => {}) {
        if (_.isEmpty(channelName) || !_.isString(channelName) || !_.isFunction(channelCallback)) {
            this.logger.warn('Must supply a channel name and callback function.');
            return;
        }

        this.#setUpChannels([{ channelName, callback: channelCallback }]);
    }

    async send(channelName, msg) {
        if (_.isEmpty(channelName) || !_.isString(channelName) || _.isEmpty(msg)) {
            this.logger.warn('Must supply a channel name and a non-empty message.');
            return;
        }

        const channelStream = this.channelStreams.get(channelName);
        if (!channelStream) {
            this.logger.warn(`No channel found for ${channelName}.`);
            return;
        }

        // assign message ID and push to history
        const message = { id: channelStream.nextMsgId++, msg };
        channelStream.history.push(message);
        if (channelStream.history.length > this.historyLimit) {
            channelStream.history.shift();
        }

        // broadcast
        for (let [clientId, clientInfo] of channelStream.clients.entries()) {
            try {
                clientInfo.stream.write(JSON.stringify(message));
                clientInfo.lastMsgId = message.id; // update delivered ID
            }
            catch (err) {
                // this.logger.error(`Failed to send to client ${clientId}:`, err);
            }
        }

        if (_.isFunction(channelStream.callback)) {
            channelStream.callback(msg);
        }
    }

    async #startConnectionListener(ws, req) {
        const { pathname, query } = url.parse(req.url, true);
        const channel = pathname.replace(/^\//, '');
        const clientId = query.clientId || `${Math.random().toString(36).substr(2, 9)}`;

        if (this.channelStreams.has(channel)) {
            const channelStream = this.channelStreams.get(channel);
            let stream = new WebSocketStream(ws);

            let lastDeliveredId = 0;

            // If reconnect, grab last delivered ID
            if (channelStream.clients.has(clientId)) {
                const oldClient = channelStream.clients.get(clientId);
                lastDeliveredId = oldClient.lastMsgId || 0;

                this.logger.info(`Client ${clientId} reconnected on ${channel}, resuming from message ${lastDeliveredId}`);
                try {
                    oldClient.stream.close();
                }
                catch (err) {
                    this.logger.warn(err.message)
                }
            }

            // Store new connection
            channelStream.clients.set(clientId, { stream, lastMsgId: lastDeliveredId });
            this.logger.info(`Client ${clientId} connected to channel: ${channel}.`);

            // Replay missed messages
            if (lastDeliveredId > 0) {
                const missed = channelStream.history.filter(m => m.id > lastDeliveredId);
                missed.forEach(m => {
                    try {
                        stream.write(JSON.stringify(m));
                    }
                    catch (err) {
                        this.logger.error(`Replay failed for client ${clientId}:`, err);
                    }
                });
                this.logger.info(`Replayed ${missed.length} messages to ${clientId}`);
            }

            ws.on('error', (err) => {
                this.logger.error(`Socket error on ${channel} (client ${clientId}):`, err);
            });

            ws.on('close', () => {
                const ci = channelStream.clients.get(clientId);
                if (ci && ci.stream === stream) {
                    // keep record, just remove socket
                    channelStream.clients.set(clientId, { stream: null, lastMsgId: ci.lastMsgId });
                    this.logger.info(`Client ${clientId} disconnected from ${channel}.`);
                }
            });
        } else {
            this.logger.warn(`Connection attempted to unknown channel: ${channel}`);
            ws.close(1008, 'Channel not found');
        }
    }

    async startHeapChannel() {
        this.sockserver.on('connection', (ws, req) => {
            if (!req.url.includes('/heap')) return;

            const id = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(process.memoryUsage()));
                }
            }, 1000);

            ws.on('error', this.logger.error);
            ws.on('close', () => clearInterval(id));
        });
    }
};
