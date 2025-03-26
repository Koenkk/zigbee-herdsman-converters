import type {Fz, KeyValue, Tz} from "./types";

import {Zcl} from "zigbee-herdsman";

import {lock} from "../converters/toZigbee";
import * as utils from "../lib/utils";
import * as modernExtend from "./modernExtend";

// Lock state changes requested by the following. Tested against device HT-SLM-2.
// remote = executed from zigbee2mqtt
const lockChangeSource = {
    0: "pin",
    1: "remote",
    2: "function_key",
    3: "rfid_tag",
    4: "fingerprint",
    255: "self",
};

export interface LockStateHistory {
    time: number;
    interiorLockState: string;
    exteriorLockState: string;
}

export enum LockSide {
    Interior = 0,
    Exterior = 1,
    Unknown = 2,
}

function identifyLockStateFromHistory(meta: Fz.Meta): LockSide {
    const history: LockStateHistory[] = (meta.state?.history as LockStateHistory[]) ?? [];

    const filteredHistory: LockStateHistory[] = [];
    let lastEntry: LockStateHistory | null = null;

    for (const entry of history) {
        if (!lastEntry || entry.interiorLockState !== lastEntry.interiorLockState || entry.exteriorLockState !== lastEntry.exteriorLockState) {
            filteredHistory.push(entry);
        }
        lastEntry = entry;
    }

    let lastInteriorChange = null;
    let lastExteriorChange = null;

    for (let i = 1; i < filteredHistory.length; i++) {
        const prevEntry = filteredHistory[i - 1];
        const currentEntry = filteredHistory[i];

        if (prevEntry.interiorLockState === "locked" && currentEntry.interiorLockState === "unlocked") {
            lastInteriorChange = currentEntry;
        }

        if (prevEntry.exteriorLockState === "locked" && currentEntry.exteriorLockState === "unlocked") {
            lastExteriorChange = currentEntry;
        }
    }

    if (lastInteriorChange && lastExteriorChange) {
        if (lastInteriorChange.time > lastExteriorChange.time) {
            return LockSide.Interior;
        }
        return LockSide.Exterior;
    }

    if (lastInteriorChange) {
        return LockSide.Interior;
    }

    if (lastExteriorChange) {
        return LockSide.Exterior;
    }

    console.error("Catch 22: Lock state could not be determined...");
    return LockSide.Unknown;
}

export const fromZigbee = {
    slm2LockState: {
        cluster: "closuresDoorLock",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};

            const {isInteriorLocked, isExteriorLocked, safety_locking} = meta.state;
            const enforceLockingIfBogus = safety_locking === "Enabled";
            if (enforceLockingIfBogus !== undefined) {
                result.safety_locking = enforceLockingIfBogus === true ? "Enabled" : "Disabled";
            }

            if (msg.data.lockState !== undefined) {
                //Perform a lookup
                if (enforceLockingIfBogus && isInteriorLocked && isExteriorLocked && msg.data.lockState === 2) {
                    // In cases where the lockState reports unlocked while there is no history, we should perform a locking action to ensure that it is actually locked. This is to ensure that the state and physical state is correct. This is due to faulty product code.
                    void lock.convertSet(msg.endpoint, "state", "LOCK", null);
                    return;
                }

                result.state = msg.data.lockState === 1 ? "LOCK" : "UNLOCK";
                result.lock_state = result.state === 1 ? "locked" : "unlocked";
            }
            return result;
        },
    } satisfies Fz.Converter,
    slm2Lock: {
        cluster: "closuresDoorLock",
        type: ["commandOperationEventNotification"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const lockStateCode = msg.data.opereventcode;
            const lockChangeRequester = utils.getFromLookup(msg.data.opereventsrc, lockChangeSource);
            const isLocked = lockStateCode === 1;

            let {isInteriorLocked, isExteriorLocked} = meta.state;

            // Autolocked by device
            if (lockChangeRequester === "self") {
                const targetLock = identifyLockStateFromHistory(meta);
                if (targetLock === LockSide.Interior) {
                    isInteriorLocked = isLocked;
                    result.inner_lock_state = "locked";
                } else if (targetLock === LockSide.Exterior) {
                    isExteriorLocked = isLocked;
                    result.lock_state = "locked";
                    result.state = lockStateCode === 1 ? "LOCK" : "UNLOCK";
                    meta.state.state = result.state;
                } else {
                    void lock.convertSet(msg.endpoint, "state", "LOCK", null);
                    return;
                }
            } else {
                if (lockChangeRequester === "function_key") {
                    isInteriorLocked = isLocked;
                    result.inner_lock_state = isLocked ? "locked" : "unlocked";
                } else {
                    if (!isLocked) {
                        result.last_unlock_source = lockChangeRequester;
                        if (lockChangeRequester === "function_key" || lockChangeRequester === "remote") {
                            result.last_unlock_by_user = "N/A";
                        } else {
                            result.last_unlock_by_user = msg.data.userid;
                        }
                    } else {
                        // If locked
                        result.last_lock_source = lockChangeRequester;
                        result.last_lock_by_user = msg.data.userid;
                    }

                    isExteriorLocked = isLocked;
                    const known_lockstates = {
                        0: "unknown_lock_failure",
                        1: "locked",
                        2: "unlocked",
                    };
                    result.lock_state = utils.getFromLookup(lockStateCode, known_lockstates, "unknown_lock_failure");
                    result.state = isLocked ? "LOCK" : "UNLOCK";
                    meta.state.state = result.state;
                }
            }

            const newHistoryEntry: LockStateHistory = {
                time: Date.now(),
                interiorLockState: isInteriorLocked ? "locked" : "unlocked",
                exteriorLockState: isExteriorLocked ? "locked" : "unlocked",
            };
            const historyCache = (meta.state.history as LockStateHistory[]) ?? [];
            historyCache.push(newHistoryEntry);
            // Keeping only the last 5 entries
            meta.state.history = historyCache.slice(-5);

            meta.state.isInteriorLocked = isInteriorLocked;
            meta.state.isExteriorLocked = isExteriorLocked;

            return result;
        },
    } satisfies Fz.Converter,
};

export const toZigbee = {
    antiBogus: {
        key: ["safety_locking"],
        convertSet: async (entity, key, value, meta) => {
            meta.state.safety_locking = value;
            await entity.read("closuresDoorLock", ["lockState"]);
            return {
                [key]: value,
            };
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("closuresDoorLock", ["lockState"]);
        },
    } satisfies Tz.Converter,
};

export const slm_2 = {
    soundVolume: (args?: Partial<modernExtend.EnumLookupArgs>) =>
        modernExtend.enumLookup({
            name: "soundVolume",
            cluster: "closuresDoorLock",
            attribute: {ID: 0x0024, type: Zcl.DataType.UINT8},
            description: "Sound volume",
            lookup: {
                off: 0,
                low: 1,
                medium: 2,
                high: 3,
            },
            access: "ALL",
            ...args,
        }),
};
