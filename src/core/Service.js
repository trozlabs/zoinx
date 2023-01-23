let Maindomain;

module.exports = class Service {
    #app;
    #domain;

    constructor(domainPath) {
        if (domainPath && typeof domainPath === 'string') {
            Maindomain = require(domainPath);
            this.#domain = new Maindomain();
        } else if (domainPath && typeof domainPath === 'object') {
            this.#domain = domainPath;
        }
    }

    get app() {
        return this.#app;
    }

    set app(app) {
        if (app) this.#app = app;
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
        //if (!session || !session.account) return new Error("Session data must be supplied to save.");

        //body.updated_user = 'mrMistoffelees'; ///session.account.username;

        let rtn;
        if (id) {
            rtn = await this.domain.save(body, id);
        } else {
            body.create_user = body.updated_user;
            rtn = await this.domain.save(body);
        }
        return rtn;
    }

    async remove(id, session) {
        //if (!session || !session.account) return new Error("Session data must be supplied to save.");
        let rtn = await this.domain.remove(id);
        return rtn;
    }

    async find(req, filters) {
        return await this.domain.find(req, filters);
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
};
