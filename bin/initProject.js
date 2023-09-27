#!/usr/bin/env node

const ZoinxCreateCli = require('../src/cli/ZoinxCreateCli');

class InitProject extends ZoinxCreateCli {
    constructor(process) {
        super(process);
    }
}

new InitProject(process);
