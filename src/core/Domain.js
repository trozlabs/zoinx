// external
const _ = require('lodash');
// siblings
const { Log } = require('../log');
const { Filter, Sort, SelectInclude } = require('../util');

module.exports = class Domain {
    #Domain;
    #defaultExclude = '-__v';

    constructor(Domain) {
        this.#Domain = Domain;
    }

    getDomain() {
        return this.#Domain;
    }

    get(id) {
        return this.#Domain.findById(id).select(this.#defaultExclude);
    }

    list() {
        return this.#Domain.find().select(this.#defaultExclude);
    }

    find(req, filters) {
        if (_.isEmpty(filters)) filters = new Filter(req).getFilters();

        let thisMdl = this.#Domain.find();
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
                                dateRangeObj;

                            if (filter.term?.from?.oper)
                                fromOperStr = (filter.term.from.oper && filter.term.from.oper === '>=') ? '$gte' : '$gt'
                            if (filter.term?.to?.oper)
                                toOperStr = (filter.term.to.oper && filter.term.to.oper === '<=') ? '$lte' : '$lt'

                            dateRangeObj = {
                                [`${filter.propName}`]: { [`${fromOperStr}`]: filter.term.from.date, [`${toOperStr}`]: filter.term.to.date }
                            }
                            thisMdl.find(dateRangeObj);
                            break;
                        default:
                            if (filter.regex) {
                                thisMdl.where(filter.propName).regex(filter.regex);
                            }
                            else if (_.isBoolean(filter.term)) {
                                //console.log(filter.propName + '=' + filter.term);
                                thisMdl.where(filter.propName).equals(filter.term);
                            }
                    }
                }
            }
        }

        const sort = new Sort(req);
        if (sort)
            thisMdl.sort(sort.getSort());

        if (req?.query.offset) {
            if (!isNaN(req.query.offset)) thisMdl.skip(parseInt(req.query.offset));
        }
        else
            thisMdl.skip(0);

        if (req?.query.limit) {
            if (!isNaN(req.query.limit)) thisMdl.limit(parseInt(req.query.limit));
        }
        else
            thisMdl.limit(50);

        const select = new SelectInclude(req);
        thisMdl.select(select.getSelect());

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
            let saveData = new this.#Domain(doc);
            return saveData.save();
        }
    }

    remove(id) {
        return this.#Domain.findByIdAndRemove(id);
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

};
