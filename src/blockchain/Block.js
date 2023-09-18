const crypto = require("crypto");

module.exports = class Block {

    #timestamp
    #data
    #hash
    #prevHash
    #nonce

    constructor(timestamp = "", data = []) {
        this.#timestamp = timestamp;
        this.#data = data;
        this.#hash = this.getHash();
        this.#prevHash = ""; // previous block's hash
        this.#nonce = 0;
    }

    get blockJson() {
        return {
            timestamp: this.#timestamp,
            data: this.#data,
            hash: this.#hash,
            prevHash: this.#prevHash,
            nonce: this.#nonce
        }
    }

    get data() {
        return this.#data;
    }

    get timestamp() {
        return this.#timestamp;
    }

    get hash() {
        return this.#hash
    }

    set hash(hash) {
        this.#hash = hash;
    }

    get prevHash() {
        return this.#prevHash;
    }

    set prevHash(hash) {
        this.#prevHash = hash;
    }

    getHash() {
        const message = this.#prevHash + this.#timestamp + JSON.stringify(this.#data) + this.#nonce;
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    mine(difficulty=1) {
        // Loops until our hash starts with
        // the string 0...000 with length of <difficulty>.
        while (!this.#hash.startsWith(Array(difficulty + 1).join("0"))) {
            this.#nonce++;
            // console.log(this.nonce);
            // Update new hash with the new nonce value.
            this.#hash = this.getHash();
        }
    }

}
