'use strict';

let store = new Map();

function getEntityKey(entity) {
    if (entity.constructor.name === 'Group') {
        return entity.groupID;
    } else if (entity.constructor.name === 'Endpoint') {
        return `${entity.deviceIeeeAddress}_${entity.ID}`;
    } else if (entity.constructor.name === 'Device') {
        return `${entity.ieeeAddr}`;
    } else {
        throw new Error(`Invalid entity type: '${entity.constructor.name }'`);
    }
}

function hasValue(entity, key) {
    const entityKey = getEntityKey(entity);
    return store.has(entityKey) && store.get(entityKey).hasOwnProperty(key);
}

function getValue(entity, key, default_=undefined) {
    const entityKey = getEntityKey(entity);
    if (store.has(entityKey) && store.get(entityKey).hasOwnProperty(key)) {
        return store.get(entityKey)[key];
    }

    return default_;
}

function putValue(entity, key, value) {
    const entityKey = getEntityKey(entity);
    if (!store.has(entityKey)) {
        store.set(entityKey, {});
    }

    store.get(entityKey)[key] = value;
}

function clearValue(entity, key) {
    if (hasValue(entity, key)) {
        const entityKey = getEntityKey(entity);
        delete store.get(entityKey)[key];
    }
}

function pushValue(entity, key, value) {
    const entityKey = getEntityKey(entity);
    if (!store.has(entityKey)) {
        store.set(entityKey, new Array());
    }

    store.get(entityKey)[key].push(value);
}

function popValue(entity, key) {
    const entityKey = getEntityKey(entity);
    if (!store.has(entityKey)) {
        return null;
    }

    let ar = store.get(entityKey)[key];

    if ( ar && ar.length > 0) {
        return ar.shift();
    } else {
        return null;
    }
}

function clear() {
    store = new Map();
}

module.exports = {
    hasValue,
    getValue,
    putValue,
    pushValue,
    popValue,
    clearValue,
    clear,
};
