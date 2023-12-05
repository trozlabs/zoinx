const ObjectUtil = require('../../src/util/ObjectUtil');

// Nasty Sample Object
class Example { prop = 'my example class' }
let example = new Example();

const company2 = {
    name: 'Manufacturer Co.',
    customers: [],
    id: 1
};
const company3 = {
    name: 'Three Corp.',
    customers: [company2],
    id: 1
};
const company = {
    name: 'ACME Inc.',
    vendors: [company2, company3],
    id: 2,
    revenue: BigInt('123')
};

company2.customers.push(company2);
company2.customers.push(company);

var objB = {
    company,
    a1: {
        a2: 'a2'
    },
    b1: {
        b2: {
            b3: 'b3'
        }
    },
    c1: [
        {
            id: '[0]',
            c2: 'c2'
        },
        {
            id: '[1]',
            c2: 'c2'
        }
    ],
    fn: function myFn() {},
    sym: Symbol('my-symbol'),
    undefined: undefined,
    null: null,
    string: 'my string',
    boolean: true,
    maxInt: Number.MAX_SAFE_INTEGER,
    float: 3.14,
    bigIntNumber: 1.2345678901234568e+29,
    bigInt0: 0n,
    date: new Date(),
    array: [1, '2', 3],
    map: new Map([
        ['key1', { 0: 'value1' }],
        ['key2', ['arrVal1', 'arrVal2']],
        ['key2', 'value2'],
        ['key3', company3]
    ]),
    set: new Set([1, 2, 3]),
    bigInt: BigInt("123456789012345678901234567890"),
    buffer: Buffer.from('Hello, Buffer!', 'utf-8'),
    classInstance: example,
    class: Example,
    function: function myFunction() {},
    asyncFunction: async function myAsyncFunction() {},
    generatorFunction: function *myGeneratorFunction() {}
};

o = {
    myUndefined: undefined,
    myArray: [1, '2', 3, { key: 'val' }],
    myBuffer: Buffer.from('Hello, Buffer!', 'utf-8'),
    mySet: new Set([1, '2', true, new Date()]),
    myMap: new Map([
        ['symbol', Symbol('symbol-in-map')],
        ['boolean', true],
        ['number', 0],
        ['string', 'my string'],
        ['null', null],
        ['object', { a: 'a', b: 'b', c: [1, 2, 3] }],
        ['function', function myFn() {}],
        ['undefined', undefined],
        ['buffer', Buffer.from('My Buffer', 'utf-8')],
        ['bigint', BigInt('123')],
        ['map', new Map([['key', 'val']])],
        ['set', new Set([1, 2, 3])],
        ['array', [1, 2, 3, new Map([['a','1'], ['b','2'], ['c','3']])]],
        ['class', class MyClass {}],
        ['circular', objB],
    ]),
    myObject: objB,
    myCircularRoot: company,
};
o.myCircularRef = o;
o.myMap.set('circular', o.myMap);

console.time('serialize --------------------------------------------');
s = ObjectUtil.serialize(o);
json = JSON.stringify(s, null, 4);
console.log(json);

console.log('deserialize --------------------------------------------');
d = ObjectUtil.deserialize(JSON.parse(json));
console.log(ObjectUtil.inspectObject(d));
