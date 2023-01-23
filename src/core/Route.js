class Route {
    method = 'get';
    enabled = true;
    path = '/';
    before = [];
    handler = null;

    router;
    controller;
    service;

    constructor(config) {
        // only apply relevant values and revert to original if new value is undefined.
        Object.keys(this).forEach((property) => {
            const newValue = config[property];
            const oldValue = this[property];
            this[property] = typeof newValue !== 'undefined' ? newValue : oldValue;
        });
    }
}

module.exports = Route;
