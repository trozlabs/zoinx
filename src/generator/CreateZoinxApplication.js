const _ = require("lodash");

module.exports = class CreateZoinxApplication {

    #cliPrompt
    #cliParent

    constructor(cliPrompt, cliParent) {
        this.#cliPrompt = cliPrompt;
        this.#cliParent = cliParent;
    }

    async askQuestions() {
        const question1 = () => {
            return new Promise((resolve, reject) => {
                this.#cliPrompt.question('What do you think of Node.js? ', (answer) => {
                    console.log(`Thank you for your valuable feedback: ${answer}`);
                    this.#cliParent.horizontalLine();
                    resolve(answer);
                })
            })
        }

        const question2 = () => {
            return new Promise((resolve, reject) => {
                this.#cliPrompt.question('Do you hear what I hear? (yes) ', (answer) => {
                    if (_.isEmpty(answer)) answer = 'yes';
                    console.log(`Maybe: ${answer}`);
                    this.#cliParent.horizontalLine();
                    resolve(answer);
                })
            })
        }

        let ugh = await question1();
        let bug = await question2();
        console.log(`returned answers: ${ugh} ${bug}`);
        await this.#cliParent.horizontalLine();

        await this.#cliParent.exit();
    }

}
