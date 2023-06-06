import {isGroup, isEndpoint, isDevice} from './utils';

let store = new Map();

function getEntityKey(entity: zh.Endpoint | zh.Group | zh.Device) {
    if (isGroup(entity)) {
        return entity.groupID;
    } else if (isEndpoint(entity)) {
        return `${entity.deviceIeeeAddress}_${entity.ID}`;
    } else if (isDevice(entity)) {
        return `${entity.ieeeAddr}`;
    } else {
        throw new Error(`Invalid entity type`);
    }
}

export function hasValue(entity: zh.Endpoint | zh.Group | zh.Device, key: string) {
    const entityKey = getEntityKey(entity);
    return store.has(entityKey) && store.get(entityKey).hasOwnProperty(key);
}

export function getValue(entity: zh.Endpoint | zh.Group | zh.Device, key: string, default_:unknown=undefined) {
    const entityKey = getEntityKey(entity);
    if (store.has(entityKey) && store.get(entityKey).hasOwnProperty(key)) {
        return store.get(entityKey)[key];
    }

    return default_;
}

export function putValue(entity: zh.Endpoint | zh.Group | zh.Device, key: string, value: unknown) {
    const entityKey = getEntityKey(entity);
    if (!store.has(entityKey)) {
        store.set(entityKey, {});
    }

    store.get(entityKey)[key] = value;
}

export function clearValue(entity: zh.Endpoint | zh.Group | zh.Device, key: string) {
    if (hasValue(entity, key)) {
        const entityKey = getEntityKey(entity);
        delete store.get(entityKey)[key];
    }
}

function clear() {
    store = new Map();
}

module.exports = {
    hasValue,
    getValue,
    putValue,
    clearValue,
    clear,
};
