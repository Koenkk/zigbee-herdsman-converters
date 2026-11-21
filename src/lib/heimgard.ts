import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as m from "./modernExtend";
import type {Fz, KeyValueAny, Tz} from "./types";
import * as utils from "./utils";

const VOLUME_LOOKUP = {off: 0, low: 1, medium: 2, high: 3};

export const SLM_2 = {
    sound_volume: (args?: Partial<m.EnumLookupArgs<"closuresDoorLock", undefined>>) =>
        m.enumLookup({
            name: "sound_volume",
            cluster: "closuresDoorLock",
            attribute: {ID: 0x0024, type: Zcl.DataType.UINT8},
            description: "Sound volume",
            lookup: VOLUME_LOOKUP,
            access: "ALL",
            ...args,
        }),
};

export const fzLocal = {
    slm_2_lock: {
        cluster: "closuresDoorLock",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const convertedResult = fz.lock.convert(model, msg, publish, options, meta);
            const result: KeyValueAny = typeof convertedResult === "object" && convertedResult !== null ? convertedResult : {};

            if (msg.data["soundVolume"] !== undefined) {
                result.volume = utils.getFromLookup(msg.data["soundVolume"], {0: "off", 1: "low", 2: "medium", 3: "high"});
            }

            return result;
        },
    } satisfies Fz.Converter<"closuresDoorLock", undefined, ["attributeReport", "readResponse"]>,
};

export const tzLocal = {
    slm_2_sound_volume: {
        key: ["volume"],
        convertSet: async (entity, key, value, meta) => {
            const payload = utils.getFromLookup(value, VOLUME_LOOKUP);
            await entity.write("closuresDoorLock", {36: {value: payload, type: Zcl.DataType.UINT8}});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("closuresDoorLock", [0x0024]);
        },
    } satisfies Tz.Converter,
};
