// const debug = util.debuglog('timber');
const Destination = require('./Destination');
const { Kafka, logLevel, CompressionTypes } = require('kafkajs');

/**
 * @example
 *  new WorkerDestination({
 *      name: 'kafka-destination',
 *      config: {
 *          topic: 'log',
 *          brokers: ['kafka:9082'],
 *          clientId: 'kafka-logger'
 *      }
 *  })
 */
module.exports = class KafkaDestination extends Destination {
    type = 'kafka';

    /**
     * @param {Object} options
     * @param {Object} options.config
     * @param {string} options.config.topic
     * @param {string} options.config.clientId
     * @param {string[]} options.config.brokers
     */
    constructor(options = {}) {
        super(...arguments);

        this.kafka = new Kafka({
            logLevel: logLevel.ERROR,
            clientId: this.getConfig()?.clientId,
            brokers: this.getConfig()?.brokers,
        });

        this.producer = this.kafka.producer();

        this.producer.connect().then(res => {
            // console.log('Destination producer connected to kafka');
        }).catch(err => {
            console.error('Destination producer failed connecting to kafka', err);
            // console.error(__filename, e.message, e);
        });
    }

    handle(data) {
        const topic = this.getConfig().topic;
        const json = JSON.stringify(data);

        this.producer.send({
            topic: topic,
            compression: CompressionTypes.GZIP,
            messages: [{ value: json }]
        }).catch((err) => {
            console.error('Sending to kafka failed', err);
            // console.error(__filename, err.message, err);
        });
    }
}
