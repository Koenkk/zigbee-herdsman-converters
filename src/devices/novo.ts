import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_swhwv3k3"]),
        model: "C10-3E-1.2",
        vendor: "Novo",
        description: "Curtain switch",
        fromZigbee: [legacy.fz.tuya_cover],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess("position", ea.STATE_SET)],
    },
];
