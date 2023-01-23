module.exports = class Generate {
    static token() {
        if (!require) throw Error("This method doesn't work in the browser");
        return require('crypto').randomBytes(16).toString('hex');
    }

    static uuid(placeholder) {
        return require('crypto').randomUUID();
    }
};
