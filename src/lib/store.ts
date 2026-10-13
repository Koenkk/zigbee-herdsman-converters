import type {Zh} from "./types";
import {isDevice, isEndpoint, isGroup} from "./utils";

// biome-ignore lint/suspicious/noExplicitAny: generic
const store = new Map<string | number, Record<string, any>>();

function getEntityKey(entity: Zh.Endpoint | Zh.Group | Zh.Device | string): string | number {
    if (typeof entity === "string") {
        return entity;
    }
    if (isGroup(entity)) {
        return entity.groupID;
    }
    if (isEndpoint(entity)) {
        return `${entity.deviceIeeeAddress}_${entity.ID}`;
    }
    if (isDevice(entity)) {
        return entity.ieeeAddr;
    }
    throw new Error("Invalid entity type");
}

export function hasValue(entity: Zh.Endpoint | Zh.Group | Zh.Device | string, key: string): boolean {
    const entityKey = getEntityKey(entity);
    const entry = store.get(entityKey);

    return entry !== undefined && key in entry;
}

// biome-ignore lint/suspicious/noExplicitAny: generic
export function getValue(entity: Zh.Endpoint | Zh.Group | Zh.Device | string, key: string, fallback: unknown = undefined): any {
    const entityKey = getEntityKey(entity);
    const entry = store.get(entityKey);

    if (entry !== undefined && key in entry) {
        return entry[key];
    }

    return fallback;
}

export function putValue(entity: Zh.Endpoint | Zh.Group | Zh.Device | string, key: string, value: unknown & {}): void {
    const entityKey = getEntityKey(entity);
    let entry = store.get(entityKey);

    if (entry === undefined) {
        entry = {};
        store.set(entityKey, entry);
    }

    entry[key] = value;
}

export function clearValue(entity: Zh.Endpoint | Zh.Group | Zh.Device | string, key: string): void {
    const entityKey = getEntityKey(entity);
    const entry = store.get(entityKey);

    if (entry !== undefined) {
        delete entry[key];
    }
}

export function clear(): void {
    store.clear();
}
