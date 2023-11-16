const { TestHarness } = require('./src/testing');

global.testConfigList = {};
global.testingConfig = {
    isTestingEnabled: true,
    sendResult2Kafka: false,
    consoleOut: true,
    methodTestPassCount: 0,
    maxMethodTestCount: 500,
    testResultsMap: {},
    classExclusionMap: {},
    functionExclusionMap: {},
    classOnlyMap: {},
    functionOnlyMap: {}
};

const MyClass = TestHarness(class MyClass {
    static testConfig = {
        syncMethod: {
            input: [ 'options=><object>' ],
            output: [ 'result=><array>' ]
        }
    }

    syncMethod(options) {
        return [options];
    }
});


const myClass = new MyClass();

myClass.syncMethod({ id: 123 });
