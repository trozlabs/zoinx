/*
fields: '[{"field": "object_type", "oper":"startswith", "term":"item"}]'
 */

const _ = require('lodash');

module.exports = class Filter {
    #queryFilters = [];
    #dbType = 'mongo';
    #filters = [];
    #operMap = {
        'startswith': /^string/i,
        'endswith': /string$/i,
        'contains': /.*string.*/i,
        'equals': /^string$/i,
        'between': 'gt:lt',
        '=': 'eq',
        '!=': 'ne',
        '>': '$gt',
        '<': '$lt',
        '>=': '$gte',
        "<=": '$lte',
        'in': 'in',
        '!in': '!in'
    };

    constructor(req, dbType) {
        if (_.isArray(req)) {
            if (!req[0]?.field || !req[0]?.term) req = [];
            this.#queryFilters = req;
        }
        else {
            if (req && req.query?.fields) this.#queryFilters = JSON.parse(req.query.fields);
            else if (req && req.query?.filters) this.#queryFilters = JSON.parse(req.query.filters);
        }

        if (dbType) this.#dbType = dbType;
        if (this.#queryFilters.length > 0) this.parseFilters();
    }

    getFilters() {
        return this.#filters;
    }

    createNewFilters(filterArray, returnFilters=false) {
        if (_.isArray(filterArray)) {
            this.#queryFilters = filterArray;
            this.#filters = [];
            this.parseFilters();
            if (returnFilters) return this.getFilters();
        }
    }

    parseFilters() {
        // console.log(this.#queryFilters);
        for (var i = 0; i < this.#queryFilters.length; i++) {
            if (this.#dbType === 'mongo') {
                let tmpObj = {
                    propName: this.#queryFilters[i].field ?? this.#queryFilters[i].property,
                    isNum: false,
                    isDate: false,
                    regex: null,
                    oper: null,
                    term: null
                };

                if (isNaN(this.#queryFilters[i].term)) {
                    if (_.isEmpty(this.#queryFilters[i].oper)) this.#queryFilters[i].oper = '=';
                    if (this.#queryFilters[i].oper.toLowerCase() === 'equals') {
                        tmpObj.regex = new RegExp(`^${this.#queryFilters[i].term}$`, 'i');
                    }
                    else if (this.#queryFilters[i].oper.toLowerCase() === '=') {
                        tmpObj.regex = new RegExp(`^${this.#queryFilters[i].term}$`);
                    }
                    else if (this.#queryFilters[i].oper.toLowerCase() === 'startswith') {
                        tmpObj.regex = new RegExp(`^${this.#queryFilters[i].term}`, 'i');
                    }
                    else if (this.#queryFilters[i].oper.toLowerCase() === 'endswith') {
                        tmpObj.regex = new RegExp(`${this.#queryFilters[i].term}$`, 'i');
                    }
                    else if (this.#queryFilters[i].oper.toLowerCase() === 'contains') {
                        tmpObj.regex = new RegExp(`.*${this.#queryFilters[i].term}.*`, 'i');
                    }
                    else if (this.#queryFilters[i].oper.toLowerCase() === '!contains') {
                        tmpObj.regex = new RegExp(`^((?!${this.#queryFilters[i].term}).)*$`, 'i');
                    }
                    else if (this.#queryFilters[i].oper.toLowerCase() === 'between') {
                        tmpObj.oper = this.#queryFilters[i].oper.toLowerCase();
                        tmpObj.term = this.#queryFilters[i].term;
                    }
                    else if (this.#queryFilters[i].oper.toLowerCase() === 'in' || this.#queryFilters[i].oper.toLowerCase() === '!in') {
                        tmpObj.oper = this.#queryFilters[i].oper.toLowerCase();
                        tmpObj.term = this.#queryFilters[i].term.split(',');
                    }

                    this.#filters.push(tmpObj);
                }
                else if (_.isBoolean(this.#queryFilters[i].term)) {
                    tmpObj.term = this.#queryFilters[i].term;
                    tmpObj.oper = '=';
                    this.#filters.push(tmpObj);
                }
                // dates
                else if (_.isDate(this.#queryFilters[i].term)) {
                    tmpObj.isDate = true;
                    if (this.#queryFilters[i].oper.toLowerCase() === 'between') {
                        console.log('Implement between date filter');
                    }
                    else {
                        tmpObj.term = this.#queryFilters[i].term;
                        tmpObj.oper = this.#operMap[this.#queryFilters[i].oper];
                        this.#filters.push(tmpObj);
                    }
                }
                // numbers
                else {
                    tmpObj.isNum = true;
                    tmpObj.term = this.#queryFilters[i].term;

                    if (_.isEmpty(this.#queryFilters[i].oper)) this.#queryFilters[i].oper = '=';
                    if (this.#queryFilters[i].oper.toLowerCase() === 'eq') {
                        tmpObj.oper = '=';
                    } else {
                        tmpObj.oper = this.#queryFilters[i].oper;
                    }
                    this.#filters.push(tmpObj);
                }
            }
        }
    }
};
