import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["tdtqgwv"],
        model: "ZSTY-SM-11ZG-US-W",
        vendor: "Somgoms",
        description: "1 gang switch",
        exposes: [e.switch().setAccess("state", ea.STATE_SET)],
        fromZigbee: [legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
    },
    {
        zigbeeModel: ["bordckq"],
        model: "ZSTY-SM-1CTZG-US-W",
        vendor: "Somgoms",
        description: "Curtain switch",
        fromZigbee: [legacy.fz.tuya_cover],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess("position", ea.STATE_SET)],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_sbordckq"]),
        model: "SM-1CTW-EU",
        vendor: "Somgoms",
        description: "Curtain switch",
        fromZigbee: [legacy.fz.tuya_cover],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess("position", ea.STATE_SET)],
    },
    {
        zigbeeModel: ["hpb9yts"],
        model: "ZSTY-SM-1DMZG-US-W",
        vendor: "Somgoms",
        description: "Dimmer switch",
        fromZigbee: [legacy.fz.tuya_dimmer],
        toZigbee: [legacy.tz.tuya_dimmer_state, legacy.tz.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess("state", ea.STATE_SET).setAccess("brightness", ea.STATE_SET)],
    },
];
