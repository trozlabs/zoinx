const crypto = require("crypto");


module.exports = class Transaction {

    #from
    #to
    #data
    #signature

    constructor(from, to, data) {
        this.#from = from;
        this.#to = to;
        this.#data = data;
    }

    #getHash() {
        const message = this.#from + this.#to + this.#data;
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    sign(keyPair) {
        // if (keyPair?.getPublic('hex') === this.#from) {
        //     this.#signature = keyPair.sign(this.#getHash(), 'base64').toDER('hex');
        // }
    }

    isValid(txn, chain) {
        return true;
        // return (
        //     txn.from &&
        //     txn.to &&
        //     txn.data &&
        //     chain.getBalance(txn.from ) === txn.data &&
        //     ec.keyFromPublic(txn.from, 'hex').verfiy(this.#getHash(), txn.signature)
        // )
    }

}
