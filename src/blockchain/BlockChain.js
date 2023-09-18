const Block = require('./Block');

module.exports = class Blockchain {

    #difficulty = 1;
    #chain
    #blockTime

    constructor(data) {
        // Create our genesis block
        this.#chain = [new Block(Date.now().toString(), data)];
        this.#blockTime = 30000;
    }

    get chain() {
        let rtnArray = [];
        for (let i=0; i<this.#chain.length; i++) {
            rtnArray.push(this.#chain[i].blockJson);
        }
        return rtnArray;
    }

    addBlock(block) {
        let lastBlock = this.getLastBlock();
        block.prevHash = lastBlock.hash;
        block.hash = block.getHash();
        block.mine(this.#difficulty);
        this.#chain.push(Object.freeze(block));

        this.#difficulty += Date.now() - (parseInt(lastBlock.timestamp) < this.#blockTime) ? 1 : -1;
    }

    getLastBlock() {
        return this.#chain[this.#chain.length - 1];
    }

    isValid(blockchain = this) {
        // Iterate over the chain, set i to 1 because there is nothing before the genesis block, start at the second block.
        for (let i = 1; i < blockchain.#chain.length; i++) {
            const currentBlock = blockchain.#chain[i];
            const prevBlock = blockchain.#chain[i-1];

            // Check validation
            if (currentBlock.hash !== currentBlock.getHash() || prevBlock.hash !== currentBlock.prevHash) {
                return false;
            }
        }

        return true;
    }


}
