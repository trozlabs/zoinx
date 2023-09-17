const crypto = require("crypto");

module.exports = class Block {

    constructor(timestamp = "", data = []) {
        this.timestamp = timestamp;
        this.data = data;
        this.hash = this.getHash();
        this.prevHash = ""; // previous block's hash
        this.nonce = 0;
    }

    // Our hash function.
    getHash() {
        const message = this.prevHash + this.timestamp + JSON.stringify(this.data) + this.nonce;
        const hashed = crypto.createHash('sha256').update(message).digest('hex');
        return hashed;
    }

    isValid(blockchain=this) {
        for (let i=0; i<blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i];
            const previousBlock = blockchain.chain(i-1);

            if (currentBlock.hash !== currentBlock.getHash() || currentBlock.prevHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    mine(difficulty=1) {
        // Basically, it loops until our hash starts with
        // the string 0...000 with length of <difficulty>.
        while (!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
            // We increases our nonce so that we can get a whole different hash.
            this.nonce++;
            // console.log(this.nonce);
            // Update our new hash with the new nonce value.
            this.hash = this.getHash();
        }
    }

}
