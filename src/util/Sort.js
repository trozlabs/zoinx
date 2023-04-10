module.exports = class Sort {
    #querySort = [];
    #dbType = 'mongo';
    #sort = '';

    constructor(req, dbType) {
        if (req && req.query.sort) this.#querySort = JSON.parse(req.query.sort);
        if (dbType) this.#dbType = dbType;
        this.parseSort();
    }

    getSort() {
        return this.#sort.trim();
    }

    parseSort() {
        let tmpSort = '';
        for (let i = 0; i < this.#querySort.length; i++) {
            if (this.#dbType === 'mongo') {
                tmpSort = '';
                if (this.#querySort[i].direction.toLowerCase() === 'desc') tmpSort = '-';
                tmpSort += this.#querySort[i].property + ' ';
            }
        }
        this.#sort = tmpSort;
    }
};
