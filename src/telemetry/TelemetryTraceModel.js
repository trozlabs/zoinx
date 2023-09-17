const Model = require('../core/Model');
const { randomUUID } = require('crypto');
const _ = require('lodash');

module.exports = class TelemetryTraceModel extends Model {

    constructor(jsonInputObj) {
        super().init(jsonInputObj);
    }

    fields = [
        {
            type: 'string',
            name: 'id',
            defaultValue: randomUUID()
        },
        {
            type: 'string',
            name: 'application_name'
            //defaultValue: process.env.TELEMETRY_APPLICATION_NAME
        },
        {
            type: 'string',
            name: 'serverInstance'
        },
        //trace_id: A unique identifier for the entire trace.
        {
            type: 'string',
            name: 'trace_id'
        },
        // span_id: A unique identifier for the specific span.
        {
            type: 'string',
            name: 'span_id'
        },
        // parent_span_id: The ID of the parent span, indicating the span's position in the trace hierarchy.
        // {
        //     type: 'string',
        //     name: 'parent_span_id'
        // },
        // name: The name of the span, typically representing an operation or function.
        {
            type: 'string',
            name: 'name'
        },
        // kind: The kind of span (e.g., SERVER, CLIENT).
        {
            type: 'string',
            name: 'kind',
            defaultValue: 'SERVER'
        },
        // start_time and end_time: Timestamps indicating when the span started and ended.
        {
            type: 'date',
            name: 'start_time'
        },
        {
            type: 'date',
            name: 'end_time'
        },
        // attributes: Key-value pairs of attributes associated with the span, which can include information such as HTTP status code, HTTP method, and custom attributes.
        {
            type: 'object',
            defaultValue: {},
            name: 'attributes'
        },
        // events: An array of events with their names, timestamps, and optional attributes. These events provide additional context about the span's lifecycle.
        {
            type: 'array',
            defaultValue: [],
            name: 'events'
        },
        // status: Information about the status of the span, including a status code and a message.
        {
            type: 'object',
            defaultValue: {},
            name: 'status'
        }
    ]

}
