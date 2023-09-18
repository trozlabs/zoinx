const Block = require('./Block');
const Transaction = require('./Transaction');

module.exports = class Blockchain {

    #difficulty = 1
    #blockTime = 30000
    #transactions = []
    #reward = 534
    #chain

    constructor(data) {
        this.#chain = [new Block(Date.now().toString(), data)];
    }

    get chain() {
        let rtnArray = [];
        for (let i=0; i<this.#chain.length; i++) {
            rtnArray.push(this.#chain[i].blockJson);
        }
        return rtnArray;
    }

    addTransaction(txn) {
        if (txn.isValid(txn, this)) {
            this.#transactions.push(txn);
        }
    }

    mineTransaction(rewardAddress) {
        // CREATER_REWARD_ADDRESS
        let newTxn = new Transaction('nbbbb', rewardAddress, this.#reward);
        this.addBlock(new Block(Date.now().toString(), [newTxn, ...this.#transactions]));
        this.#transactions = [];
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
            if (currentBlock.hash !== currentBlock.getHash() || prevBlock.hash !== currentBlock.prevHash) { // || currentBlock.hasValidTransactions(blockchain)
                return false;
            }
        }

        return true;
    }


}
