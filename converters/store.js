'use strict';

let store = new Map();

function getEntityKey(entity) {
    if (entity.constructor.name === 'Group') {
        return entity.groupID;
    } else if (entity.constructor.name === 'Endpoint') {
        return `${entity.deviceIeeeAddress}_${entity.ID}`;
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

function clear() {
    store = new Map();
}

module.exports = {
    hasValue,
    getValue,
    putValue,
    clear,
};
