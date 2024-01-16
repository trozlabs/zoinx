#!/usr/bin/env node

const TestRunner = require('../src/cli/TestRunner');

class LocalTestRunner extends TestRunner {
    constructor(process) {
        super(process);
    }
}

new LocalTestRunner(process);
