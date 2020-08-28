'use strict';

const store = new Map();

function hasValue(deviceKey, key) {
    return store.has(deviceKey) && store.get(deviceKey).hasOwnProperty(key);
}

function getValue(deviceKey, key) {
    if (store.has(deviceKey)) {
        return store.get(deviceKey)[key];
    }

    return undefined;
}

function putValue(deviceKey, key, value) {
    if (!store.has(deviceKey)) {
        store.set(deviceKey, {});
    }

    store.get(deviceKey)[key] = value;
}

module.exports = {
    hasValue,
    getValue,
    putValue,
};
