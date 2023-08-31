const NodeCache = require("node-cache");

module.exports = class AppCache extends NodeCache{

    constructor() {
        super({ stdTTL: 600 });
    }



}
