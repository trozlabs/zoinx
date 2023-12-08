const _ = require("lodash");
const TelemetryEventModel = require("./TelemetryEventModel");


module.exports = class TelemetryChain {

    #telemetryEvents = [];

    constructor() {}

    get telemetryEvents() {
        return this.#telemetryEvents;
    }

    set telemetryEvents(events) {
        this.#telemetryEvents = events;
    }

    addTelemetryEvent(telemetryName, attributes={}) {
        if (!_.isEmpty(telemetryName) && _.isString(telemetryName)) {
            this.#telemetryEvents.push(
                new TelemetryEventModel({
                    name: `${this.constructor.name}.${telemetryName}`,
                    attributes: attributes
                })
            );
        }
    }

}
