/**
 * `MonitoredObject` will notify the program of it's changes via the onChange handler.
 *
 * @param {string} name - the name of the object to be returned when changed
 * @param {object} initValue - the initial value to create the object without triggering onChange
 * @param {function} onChange - the method called when a property gets created or changed.
 * @returns {object}
 */
function MonitoredObject({ name, initValue={}, onChange }) {
    if (!new.target) {
        throw new Error(`MonitoredObject must be called with 'new'`);
    }

    this.name = name ?? '';
    this.paused = true;

    const pause = (boolean) => {
        if (boolean === undefined) {
            return this.paused;
        } else {
            this.paused = Boolean(boolean);

            // find all object values and call pause(boolean) on those too.
            //
            for (let key in proxiedObject) {
                let val = proxiedObject[key];
                if (val !== null && typeof val === 'object') {
                    val?.__pause(this.paused);
                }
            }
        }
        return this.paused;
    };

    const get = (target, property) => {
        if (property === '__target') {
            return target;
        }
        if (property === '__pause') {
            return pause;
        }

        return target[property];
    };

    const set = (target, property, newValue) => {
        let oldValue = target[property];
        let result = true;

        if (newValue !== null && typeof newValue === 'object') {
            newValue = new MonitoredObject({
                name: `${name}.${property}`,
                initValue: newValue,
                onChange: onChange
            });
        }

        target[property] = newValue;

        if (!this.paused && newValue !== oldValue) {
            onChange(name, property, newValue, oldValue, target);
        }

        return result;
    };

    // Creating the object with initValue here prevents
    // arrays from being transformed into `{ 0: 'a', 1: 'b', ... }`
    //
    const object = new Object(initValue);

    const proxiedObject = new Proxy(object, {
        get: get,
        set: set
    });

    // We then merge them together to make sure
    // the nested objects get created as `MonitoredObject`s
    //
    Object.assign(proxiedObject, initValue);

    // Once all the initial values are applied
    // we can un-pause triggering onChange "events".
    //
    pause(false);

    return proxiedObject;
}


// example

const myObject = new MonitoredObject({
    name: 'myObject',
    initValue: {
        key: 'val'
    },
    onChange(name, property, newValue, oldValue, target) {
        console.log('change:', { name, property, newValue, oldValue, target });
        // do something...
    }
});

myObject.nestedObj = {};
// > change: {
//     name: 'myObject',
//     property: 'nestedObj',
//     newValue: {},
//     oldValue: undefined,
//     target: { key: 'val', nestedObj: {} }
// }
myObject.nestedObj = [ 0, 1, 2 ];
// > change: {
//     name: 'myObject',
//     property: 'nestedObj',
//     newValue: [ 0, 1, 2 ],
//     oldValue: {},
//     target: { key: 'val', nestedObj: [ 0, 1, 2 ] }
// }
myObject.nestedObj[0] = 'Zero';
// > change: {
//     name: 'myObject.nestedObj',
//     property: '0',
//     newValue: 'Zero',
//     oldValue: 0,
//     target: [ 'Zero', 1, 2 ]
// }
myObject.nestedObj[1] = { name: 'One' };
// > change: {
//     name: 'myObject.nestedObj',
//     property: '1',
//     newValue: { name: 'One' },
//     oldValue: 1,
//     target: [ 'Zero', { name: 'One' }, 2 ]
// }
myObject.nestedObj[1].name = '1'
// > change: {
//     name: 'myObject.nestedObj.1',
//     property: 'name',
//     newValue: '1',
//     oldValue: 'One',
//     target: { name: '1' }
// }
console.log(myObject.__pause())
// > false
console.log(myObject.__pause(true))
// > true
console.log(myObject.__target)
// > { key: 'val', nestedObj: [ 'Zero', { name: '1' }, 2 ] }
console.log(JSON.stringify(myObject, null, 4))
// > {
//     "key": "val",
//     "nestedObj": [
//         "Zero",
//         {
//             "name": "1"
//         },
//         2
//     ]
// }
