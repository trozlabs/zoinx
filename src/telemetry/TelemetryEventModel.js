const Model = require('../core/Model');

module.exports = class TelemetryEventModel extends Model {

    constructor(jsonInputObj) {
        super().init(jsonInputObj);
    }

    fields = [
        // name: name of class.method
        {
            type: 'string',
            name: 'name'
        },
        //timestamp: time method/event was executed
        {
            type: 'date',
            name: 'timestamp',
            defaultValue: new Date()
        },
        // attributes: used to hold what values are being operated on: "key": "value"
        {
            type: 'object',
            name: 'attributes'
        }
    ]

}
