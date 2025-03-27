const _ = require("lodash");

module.exports = class Sort {
    #querySort = [];
    #dbType = 'mongo';
    #sort = '';

    constructor(req, dbType) {
        if (_.isArray(req)) {
            if (!req[0]?.property || !req[0]?.direction) req = [];
            this.#querySort = req;
        }
        else {
            if (req && req.query?.sort) this.#querySort = JSON.parse(req.query.sort);
            else if (req && req.property) this.#querySort = [req];
            else this.#querySort = []
        }

        if (dbType) this.#dbType = dbType;
        this.parseSort();
    }

    getSort() {
        return this.#sort;
    }

    parseSort() {
        let sortObj = {};

        for (let i = 0; i < this.#querySort.length; i++) {
            if (this.#dbType === 'mongo') {
                sortObj[this.#querySort[i].property] = (this.#querySort[i].direction?.toLowerCase() === 'desc') ? -1 : 1;
            }
        }
        this.#sort = sortObj;
    }
}
