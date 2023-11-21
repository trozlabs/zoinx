const NodeCache = require("node-cache");
const _ = require('lodash');

module.exports = class AppCache extends NodeCache{

    #cacheTimeMap = new Map();

    constructor(configObj) {
        if (_.isEmpty(configObj)) {
            configObj = { stdTTL: 60, checkperiod: 60 };
        }
        super(configObj);
        this.on( "del", this.#syncMapAndCache);
        this.on( "expired", this.#syncMapAndCache);
        this.on( "flush", this.#clearTimeMap);
    }

    getEntry(key) {
        return this.get(key);
    }

    setEntry(key, value, ttl) {
        let setResult;
        try {
            setResult = this.set(key,value,ttl);
            this.#setTimeMapEntry(key);
        }
        catch (e) {
            const oldestEntry = this.#getOldestEntryTimeMapEntry();
            this.delEntry(oldestEntry);
            setResult = this.set(key,value,ttl);
            this.#setTimeMapEntry(key);
        }

        return setResult;
    }

    delEntry(key) {
        return this.del(key);;
    }

    #setTimeMapEntry(cacheKey) {
        if (!_.isEmpty(cacheKey)) {
            this.#cacheTimeMap.set(new Date().getTime(), cacheKey);
        }
    }

    #getOldestEntryTimeMapEntry() {
        const [first] = this.#cacheTimeMap.keys();
        return first;
    }

    #syncMapAndCache(key, value) {
        const mapEntry = [...this.#cacheTimeMap.entries()].filter(item => item[1] === key)[0];
        if (!_.isEmpty(mapEntry))
            this.#cacheTimeMap.delete(mapEntry[0]);
    }

    #clearTimeMap() {
        this.#cacheTimeMap = new Map();
    }

}
