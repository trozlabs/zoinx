// Supports ns, µs, ms, and formatted output: ms.us.ns
const _ = require('lodash');
const Log = require('../log/Log');

module.exports = class HighResTimer {
    constructor(autoStart = true) {
        this._start = null;
        this._end = null;
        if (autoStart) this.start();
    }

    getStartTime() {
        return this._start;
    }

    getEndTime() {
        return this._end;
    }

    start() {
        this._start = process.hrtime.bigint();
        this._end = null;
    }

    stop() {
        if (!this._start) {
            throw new Error('Timer has not been started');
        }
        this._end = process.hrtime.bigint();
    }

    reset() {
        this._start = null;
        this._end = null;
    }

    // --- raw duration ---
    durationNs() {
        if (!this._start) return 0n;
        const end = this._end ?? process.hrtime.bigint();
        return end - this._start;
    }

    durationUs() {
        return this.durationNs() / 1_000n;
    }

    durationMs() {
        return this.durationNs() / 1_000_000n;
    }

    // --- formatted output ---
    formatMsUsNs() {
        HighResTimer.formatMsUsNs(this.durationNs());
    }

    // --- helpers ---
    static measure(fn) {
        const timer = new HighResTimer();
        const result = fn();
        timer.stop();

        return {
            result,
            ns: timer.durationNs(),
            us: timer.durationUs(),
            ms: timer.durationMs(),
            formatted: timer.formatMsUsNs(),
        };
    }

    static async measureAsync(fn) {
        const timer = new HighResTimer();
        const result = await fn();
        timer.stop();

        return {
            result,
            ns: timer.durationNs(),
            us: timer.durationUs(),
            ms: timer.durationMs(),
            formatted: timer.formatMsUsNs(),
        };
    }

    // Expected format: ms.us.ns (e.g. "12.034.567")
    static parseNanoStringToNumber(formatted) {
        if (!_.isEmpty(formatted) && _.isString(formatted)) {
            const parts = formatted.split('.');
            if (parts.length !== 3) {
                Log.warn('Invalid time format. Expected ms.us.ns');
                return 0;
            }

            const [msStr, usStr, nsStr] = parts;

            // ms = any length, us/ns must be zero-padded to 3 digits
            if (
                !/^\d+$/.test(msStr) ||
                !/^\d{3}$/.test(usStr) ||
                !/^\d{3}$/.test(nsStr)) {
                Log.warn('Invalid time format. Expected ms.us.ns with zero-padded us/ns');
                return 0;
            }

            const ms = BigInt(msStr);
            const us = BigInt(usStr);
            const ns = BigInt(nsStr);

            // Convert back to total nanoseconds
            return ms * 1_000_000n + us * 1_000n + ns;
        }

        Log.warn('Invalid time format. Expected ms.us.ns');
        return 0;
    }

    static formatMsUsNs(durationNs) {
        if (typeof durationNs === 'bigint' || durationNs instanceof BigInt) {
            const ms = durationNs / 1_000_000n;
            const remAfterMs = durationNs % 1_000_000n;

            const us = remAfterMs / 1_000n;
            const ns = remAfterMs % 1_000n;

            return `${ms}.${us.toString().padStart(3, '0')}.${ns
                .toString()
                .padStart(3, '0')}`;
        }

        return '0';
    }

}
