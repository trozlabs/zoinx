const Block = require('./Block');

module.exports = class Blockchain {

    #difficulty = 1;
    constructor(data) {
        // Create our genesis block
        this.chain = [new Block(Date.now().toString())];
        this.blockTime = 30000;
    }

    addBlock(block) {
        block.prevHash = this.getLastBlock().hash;
        block.hash = block.getHash();
        block.mine(this.#difficulty);
        this.chain.push(Object.freeze(block));

        this.#difficulty += Date.now() - (parseInt(this.getLastBlock().timestamp) < this.blockTime) ? 1 : -1;
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    isValid(blockchain = this) {
        // Iterate over the chain, we need to set i to 1 because there are nothing before the genesis block, so we start at the second block.
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i];
            const prevBlock = blockchain.chain[i-1];

            // Check validation
            if (currentBlock.hash !== currentBlock.getHash() || prevBlock.hash !== currentBlock.prevHash) {
                return false;
            }
        }

        return true;
    }


}
