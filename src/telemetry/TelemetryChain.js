const _ = require("lodash");
const TelemetryEventModel = require("./TelemetryEventModel");


module.exports = class TelemetryChain {

    #telemetryEvents = [];

    constructor() {}

    get telemetryEvents() {
        return this.#telemetryEvents;
    }

    async getTelemetryEventsJson() {
        let telemetryEvents = [];

        try {
            if (!_.isEmpty(this.#telemetryEvents)) {
                for (let i = 0; i < this.#telemetryEvents.length; i++) {
                    telemetryEvents.push(this.#telemetryEvents[i].json);
                }
            }
        }
        catch (e) {
            Log.error(e.message);
        }

        return telemetryEvents;
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
