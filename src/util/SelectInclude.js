/*
select: '[{"property":"object_type", "exclude":"false"}]'
*/

const _ = require("lodash");
module.exports = class SelectInclude {
    #selectInclude = [];
    #dbType = 'mongo';
    #select = '';

    constructor(req, dbType) {
        if (_.isArray(req)) {
            if (!req[0]?.property) req = [];
            this.#selectInclude = req;
        }
        else {
            if (req.query?.select) {
                this.#selectInclude = JSON.parse(req.query.select);
                if (typeof this.#selectInclude[0].exclude === 'string') {
                    if (this.#selectInclude[0].exclude.toLowerCase() === 'true') this.#selectInclude[0].exclude = true;
                    else this.#selectInclude[0].exclude = false;
                }
            }
        }

        if (dbType) this.#dbType = dbType;
        if (this.#selectInclude.length > 0) {
            this.parseSelect();
        }
    }

    getSelect() {
        return this.#select.trim();
    }

    parseSelect() {
        let tmpSelect = '';
        for (let i = 0; i < this.#selectInclude.length; i++) {
            if (this.#dbType === 'mongo') {
                if (this.#selectInclude[i].exclude) tmpSelect = '-';
                tmpSelect += this.#selectInclude[i].property + ' ';
            }
        }
        this.#select = tmpSelect;
        //console.log(this.#select);
    }
};
