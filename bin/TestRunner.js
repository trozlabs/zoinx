#!/usr/bin/env node

const { Log } = require('../src/log');
const TestRunner = require('../src/cli/TestRunner');

class LocalTestRunner extends TestRunner {
    constructor(process) {
        super(process);
    }
}

new LocalTestRunner(process);
