// external
const _ = require('lodash');
// siblings
const { Log } = require('../log');
const { Filter, Sort, SelectInclude, StaticUtil} = require('../util');
const telemetryEvent = require('../telemetry/TelemetryEventModel');
const mongoose = require('mongoose');

module.exports = class Domain {
    #Domain;
    #defaultExclude = '-__v';
    #telEvent;

    constructor(Domain) {
        this.#Domain = Domain;
    }

    getDomain() {
        return this.#Domain;
    }

    get telemetryEvent() {
        return this.#telEvent;
    }

    get(id) {
        this.#telEvent = new telemetryEvent({
            name: `${this.constructor.name}.get`,
            attributes: { recordId: id }
        });
        return this.#Domain.findById(id).select(this.#defaultExclude);
    }

    list() {
        this.#telEvent = new telemetryEvent({
            name: `${this.constructor.name}.list`,
            attributes: { prop: 'is empty' }
        });
        return this.#Domain.find().select(this.#defaultExclude);
    }

    find(queryParams, count=false, deleteMany=false, updateMany=false) {
        const { filters, sorters, select, limit, offset } = queryParams;

        count = StaticUtil.StringToBoolean(count);
        deleteMany = StaticUtil.StringToBoolean(deleteMany);

        let thisMdl = this.#Domain.find(),
            action = 'find';
        if (count) {
            thisMdl = this.#Domain.countDocuments();
            action = 'count';
        }
        else if (deleteMany) {
            thisMdl = this.#Domain.deleteMany();
            action = 'deleteMany';
        }
        else if (updateMany) {
            thisMdl = this.#Domain.updateMany();
            action = 'updateMany';
        }

        this.#telEvent = new telemetryEvent({
            name: `${this.constructor.name}.${action}`,
            attributes: queryParams
        });

        if (sorters) thisMdl.sort(sorters);

        if (!isNaN(offset))  if (!isNaN(offset)) thisMdl.skip(parseInt(offset));
        else thisMdl.skip(0);

        if (!isNaN(limit)) if (!isNaN(limit)) thisMdl.limit(parseInt(limit));
        else thisMdl.limit(500);

        if (select) thisMdl.select(select);


        if (filters.length > 0) {
            for (let filter of filters) {
                if (filter.isNum) {
                    switch (filter.oper) {
                        case '=':
                            thisMdl.equals(parseFloat(filter.term));
                            break;
                        case '!=':
                            thisMdl.ne(parseFloat(filter.term));
                            break;
                        case '>':
                            thisMdl.gt(parseFloat(filter.term));
                            break;
                        case '<':
                            thisMdl.lt(parseFloat(filter.term));
                            break;
                        case '>=':
                            thisMdl.gte(parseFloat(filter.term));
                            break;
                        case '<=':
                            thisMdl.lte(parseFloat(filter.term));
                            break;
                    }
                }
                else if (filter.isDate) {
                    let fromOperStr = '$gt',
                        toOperStr = '$lt',
                        valueRangeObj;

                    switch (filter.oper) {
                        case 'between':
                            if (filter.term?.from?.oper)
                                fromOperStr = (filter.term.from.oper && filter.term.from.oper === '>=') ? '$gte' : '$gt'
                            if (filter.term?.to?.oper)
                                toOperStr = (filter.term.to.oper && filter.term.to.oper === '<=') ? '$lte' : '$lt'

                            valueRangeObj = {
                                [`${filter.propName}`]: { [`${fromOperStr}`]: filter.term.from.term.toISOString(), [`${toOperStr}`]: filter.term.to.term.toISOString() }
                            }
                            thisMdl.find(valueRangeObj);
                            break;
                        default:
                            valueRangeObj = {
                                [`${filter.propName}`]: { [`${filter.oper}`]: filter.term.toISOString() }
                            }
                            thisMdl.find(valueRangeObj);
                            break;
                    }
                }
                else {
                    switch (filter.oper) {
                        case 'in':
                            thisMdl.where(filter.propName).in(filter.term);
                            break;
                        case '!in':
                            thisMdl.where(filter.propName).nin(filter.term);
                            break;
                        case 'between':
                            let fromOperStr = '$gt',
                                toOperStr = '$lt',
                                valueRangeObj;

                            if (filter.term?.from?.oper)
                                fromOperStr = (filter.term.from.oper && filter.term.from.oper === '>=') ? '$gte' : '$gt'
                            if (filter.term?.to?.oper)
                                toOperStr = (filter.term.to.oper && filter.term.to.oper === '<=') ? '$lte' : '$lt'

                            valueRangeObj = {
                                [`${filter.propName}`]: { [`${fromOperStr}`]: filter.term.from.term, [`${toOperStr}`]: filter.term.to.term }
                            }
                            thisMdl.find(valueRangeObj);
                            break;

                        default:
                            if (filter.regex) {
                                thisMdl.where(filter.propName).regex(filter.regex);
                            }
                            // not sure why this is here
                            else if (_.isBoolean(filter.term)) {
                                //console.log(filter.propName + '=' + filter.term);
                                thisMdl.where(filter.propName).equals(filter.term);
                            }
                            else {
                                thisMdl.where(filter.propName).equals(filter.term);
                            }
                    }
                }
            }
        }

        if (updateMany)
            return thisMdl;
        else
            return thisMdl.exec();
    }

    async save(doc, id) {
        if (!doc) return;

        if (id) {
            try {
                let currentDoc = await this.#Domain.findById(id).select('__v');
                if (currentDoc.__v >= 0) {
                    let versionNum = parseInt(currentDoc.__v);
                    doc.__v = versionNum + 1;
                }
                return this.#Domain.where({ _id: id }).updateOne(doc);
            } catch (ex) {
                return Promise.reject('No record found to update.');
            }
        } else {
            try {
                doc._id = new mongoose.Types.ObjectId();;
                let saveData = new this.#Domain(doc);
                return await saveData.save();
            }
            catch (e) {
                return Promise.reject(e.message);
            }
        }
    }

    async remove(id) {
        return this.#Domain.findByIdAndDelete(id);
    }

    async insertMany(rawObjects=[]) {
        try {
            if (!_.isEmpty(rawObjects) && _.isArray(rawObjects) && rawObjects.length > 0) {
                return await this.#Domain.insertMany(rawObjects);
            }
        }
        catch (e) {
            return Promise.reject(e.message);
        }
    }

    async updateMany(filters, updateValue) {
        try {
            if (!_.isEmpty(filters) && !_.isEmpty(updateValue) && _.isObject(updateValue)) {
                let domainMdl = this.find({filters:filters}, false, false, true);
                return domainMdl.updateMany(updateValue);
            }
        }
        catch (e) {
            return Promise.reject(e.message);
        }
    }

}
