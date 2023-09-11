const { APIError } = require("./APIError");
let Maindomain;

module.exports = class Service {

    #domain;

    constructor(domainPath) {
        if (domainPath && typeof domainPath === 'string') {
            Maindomain = require(domainPath);
            this.#domain = new Maindomain();
        } else if (domainPath && typeof domainPath === 'object') {
            this.#domain = domainPath;
        }
    }

    get domain() {
        return this.#domain;
    }

    async get(id) {
        let rtn;
        if (id) {
            rtn = await this.domain.get(id);
        } else {
            rtn = await this.domain.list().where();
        }
        return rtn;
    }

    async save(id, body, session) {
        if (!session || !session.user) return new APIError("Session data must be supplied to save.");

        let rtn;
        if (id) {
            body.updated_user = session.user;
            rtn = await this.domain.save(body, id);
        } else {
            body.updated_user = session.user;
            body.created_user = session.user;
            rtn = await this.domain.save(body);
        }
        return rtn;
    }

    async remove(id, session) {
        let rtn = await this.domain.remove(id);
        return rtn;
    }

    async find(req, filters=[], sorters=[]) {
        return await this.domain.find(req, filters, sorters);
    }

    async count(req, filters=[]) {
        const result = await this.domain.find(req, filters, [], true);
        return { count: result };
    }

    async distinctList(propName) {
        return await this.domain.list().distinct(propName);
    }

    async addFunctionMixin({}, ...mixins) {
        if (!mixins) return;

        for (let mixin of mixins) {
            if (typeof mixin === 'function') {
                Object.getPrototypeOf(this)[mixin.name] = mixin;
            }
        }
    }

    async insertMany(rawObjects =[]) {
        return await this.domain.insertMany(rawObjects, { ordered: false, populate: null });
    }
};
