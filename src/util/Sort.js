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
        return this.#sort?.trim();
    }

    parseSort() {
        let tmpSort = '';
        for (let i = 0; i < this.#querySort.length; i++) {
            if (this.#dbType === 'mongo') {
                tmpSort = '';
                if (this.#querySort[i].direction?.toLowerCase() === 'desc') tmpSort = '-';
                tmpSort += this.#querySort[i].property + ' ';
            }
        }
        this.#sort = tmpSort;
    }
}
