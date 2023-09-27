const BaseCli = require("./BaseCli");
const Log = require("../log/Log");
const CreateZoinxApplication = require("../generator/CreateZoinxApplication");

module.exports = class ZoinxCreateCli extends BaseCli {

    constructor(process) {
        super('Zoinx Create App', process);
        this.createZoinxApp()
            .then(r => {
                Log.error('Something unfortunate happened.')
            });
    }

    async createZoinxApp() {
        const newApp = new CreateZoinxApplication(this._interface, this);
        await newApp.askQuestions();
    }
}
