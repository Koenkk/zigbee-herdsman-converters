import {Zh} from './types';
import {isGroup, isEndpoint, isDevice} from './utils';

let store = new Map();

function getEntityKey(entity: Zh.Endpoint | Zh.Group | Zh.Device) {
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

export function hasValue(entity: Zh.Endpoint | Zh.Group | Zh.Device, key: string) {
    const entityKey = getEntityKey(entity);
    return store.has(entityKey) && store.get(entityKey).hasOwnProperty(key);
}

export function getValue(entity: Zh.Endpoint | Zh.Group | Zh.Device, key: string, default_:unknown=undefined) {
    const entityKey = getEntityKey(entity);
    if (store.has(entityKey) && store.get(entityKey).hasOwnProperty(key)) {
        return store.get(entityKey)[key];
    }

    return default_;
}

export function putValue(entity: Zh.Endpoint | Zh.Group | Zh.Device, key: string, value: unknown) {
    const entityKey = getEntityKey(entity);
    if (!store.has(entityKey)) {
        store.set(entityKey, {});
    }

    store.get(entityKey)[key] = value;
}

export function clearValue(entity: Zh.Endpoint | Zh.Group | Zh.Device, key: string) {
    if (hasValue(entity, key)) {
        const entityKey = getEntityKey(entity);
        delete store.get(entityKey)[key];
    }
}

export function clear() {
    store = new Map();
}

exports.hasValue = hasValue;
exports.getValue = getValue;
exports.putValue = putValue;
exports.clearValue = clearValue;
exports.clear = clear;
