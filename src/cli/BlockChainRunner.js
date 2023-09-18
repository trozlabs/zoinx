const BaseCli = require('./BaseCli');
const _ = require('lodash');
const Log = require('../log/Log');
const StaticUtil = require('../util/StaticUtil');
const {Blockchain, Block} = require("../blockchain");

module.exports = class BlockChainRunner extends BaseCli {

    constructor(process) {
        super('BlockChain Runner', process);
        Log.info('BlockChain Runner is running.');
        this.addInputs(
            {
                'tbc': {fn: 'testBlockChain', desc:'Tests blockchain stuff'}
            }
        )
    }

    async testBlockChain(inputStr, _interface) {
        let cmdSplit = inputStr.trim().split('--'),
            data = (typeof(inputStr) === 'string' && inputStr.trim().length > 0) ? cmdSplit[1].trim() : '';

        if (!_.isEmpty(data)) {
            const blockChain = new Blockchain();
            blockChain.addBlock(new Block(Date.now().toString(), [data]));
            blockChain.addBlock(new Block(Date.now().toString(), ["Sammy", "stinks"]));
            blockChain.addBlock(new Block(Date.now().toString(), ["cupped", "hands"]));
            blockChain.addBlock(new Block(Date.now().toString(), ["shaggy", "scooby"]));
            console.log(blockChain.chain);
            console.log(blockChain.isValid());
        }
        else {
            Log.warn('Data must be supplied to test the blockchaing.')
        }
    }

}
