// Mongo shell to see connection count
// external
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const _ = require('lodash');

const { Log } = require('../log');

module.exports = class Database {

    db;
    client;
    connection;
    connections;
    mongoosePool;

    static db() {
        return this.db;
    }

    static create(config) {
        const instance = new this(config)
        const pool = instance.mongoosePool;
        return pool;
    }

    static async create4Cli(config) {
        const db = new this(config, false);
        return await db.createSingleConnection(db.uri, db.options);
    }

    async close() {
        await this.mongoosePool.disconnect();
    }

    constructor(config, withPool=true) {

        let host, port, name, user, password, maxPoolSize, dbOptions;
        if (_.isEmpty(config)) {
            host = process.env.MONGO_HOST || '';
            port = process.env.MONGO_PORT || '';
            name = process.env.MONGO_DB_NAME || '';
            user = process.env.MONGO_USER || '';
            password = process.env.MONGO_PASS || '';
            maxPoolSize = process.env.MONGO_MAXPOOLSIZE || 10;
            dbOptions = process.env.MONGO_OPTIONS || '';
        }
        else {
            host = config.host;
            port = config.port;
            name = config.name;
            user = config.user;
            password = config.password;
            maxPoolSize = config.maxPoolSize;
            dbOptions = config.dbOptions
        }

        if (user && password) {
            this.uri = `mongodb://${user}:${password}@${host}:${port}/${name}?${dbOptions}`;
        } else {
            this.uri = `mongodb://${host}:${port}/${name}`;
        }

        Log.info(`Connecting to Mongo: ${host}:${port}/${name}`);
        Log.debug(this.uri);

        this.options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: maxPoolSize
        }

        if (withPool) {
            this.createPooledConnections().then(r => {});
        }
    }

    async createPooledConnections() {
        try {
            mongoose.connect(this.uri, this.options)
                .then((mongoose) => {
                    Log.info('Connected to Mongo DB via Mongoose');
                    mongoose.connections[0].on('disconnecting', () => console.info('database disconnecting'));
                    mongoose.connections[0].on('disconnected', () => console.info('database disconnected'));
                    mongoose.connections[0].on('error', () => console.error('database error'));
                })
                .catch(errors => {
                    Log.error(`Failed to connect ${errors.message}`);
                });

            this.connections = mongoose.connections;
            this.client = this.connections[0].client;
            this.db = this.client.db();
            this.mongoosePool = mongoose;
            global.mongoosePool = this.mongoosePool
        }
        catch (e) {
            Log.error(e);
        }
    }

    async createSingleConnection(uri, options) {
        try {
            return await mongoose.createConnection(uri, options).asPromise();
        }
        catch (e) {
            Log.error(e);
        }
    }
}
