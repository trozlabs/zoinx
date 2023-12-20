const { EventEmitter } = require('events');
/**
 * @typedef {Object} ObservableObject
 * @property {Object} __target - returns the internal object
 * @property {function} __pause - stops emitting events
 * @property {EventEmitter} events - the object to add or remove event listeners
 */

/**
 * @param {string} name - the name used as root object name included when events are fired.
 * @param {object} value - the initial value to be set that doesn't trigger change events.
 * @param {EventEmitter?} ee - optional - used mostly during creation of nested objects.
 * @returns {ObservableObject}
 */
module.exports = function ObservableObject(name, value={}, ee) {
    if (!new.target) {
        throw new Error(`ObservableObject must be called with 'new'`);
    }

    this.ee = ee ?? new EventEmitter();
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
        if (property === '__target') return target;
        if (property === '__pause') return pause;
        if (property === 'events') return this.ee;

        return target[property];
    };

    const set = (target, property, newValue) => {
        let oldValue = target[property];
        let result = true;

        if (newValue !== null && typeof newValue === 'object') {
            newValue = new ObservableObject(`${name}.${property}`, newValue, this.ee);
        }

        target[property] = newValue;

        if (!this.paused && newValue !== oldValue) {
            let object = this.name;
            let path = `${object}.${property}`;
            let payload = { path, object, property, newValue, oldValue, target };

            // console.log(' - fire: change');
            this.ee.emit('change',  Object.assign({ eventName: 'change' }, payload));
            // console.log(' - fire: ' + this.name);
            this.ee.emit(object, Object.assign({ eventName: this.name }, payload));
            // console.log(' - fire: ' + path);
            this.ee.emit(path, Object.assign({ eventName: path }, payload));
            // console.log(' - fire: ' + property);
            this.ee.emit(property, Object.assign({ eventName: property }, payload));
        }

        return result;
    };

    // Creating the object with initValue here prevents
    // arrays from being transformed into `{ 0: 'a', 1: 'b', ... }`
    //
    const object = new Object(value);

    const proxiedObject = new Proxy(object, {
        get: get,
        set: set
    });

    // We then merge them together to make sure
    // the nested objects get created as `ObservableObject`s
    //
    Object.assign(proxiedObject, value);

    // Once all the initial values are applied
    // we can un-pause triggering onChange "events".
    //
    pause(false);

    return proxiedObject;
}
