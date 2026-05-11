import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_arge1ptm", "_TZE200_anv5ujhv", "_TZE200_xlppj4f5"]),
        model: "QT-05M",
        vendor: "QOTO",
        description: "Solar powered garden watering timer",
        fromZigbee: [fz.ignore_tuya_set_time, fz.ignore_onoff_report, legacy.fromZigbee.watering_timer],
        toZigbee: [legacy.tz.valve_state, legacy.tz.shutdown_timer, legacy.tz.valve_state_auto_shutdown],
        exposes: [
            e.numeric("water_flow", ea.STATE).withUnit("%").withValueMin(0).withDescription("Current water flow in %."),
            e.numeric("last_watering_duration", ea.STATE).withUnit("sec").withValueMin(0).withDescription("Last watering duration in seconds."),
            e
                .numeric("remaining_watering_time", ea.STATE)
                .withUnit("sec")
                .withValueMin(0)
                .withDescription("Remaining watering time (for auto shutdown). Updates every minute, and every 10s in the last minute."),
            e
                .numeric("valve_state", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(5)
                .withUnit("%")
                .withDescription("Set valve to %."),
            e
                .numeric("valve_state_auto_shutdown", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(5)
                .withUnit("%")
                .withDescription("Set valve to % with auto shutdown. Must be set before setting the shutdown timer."),
            e
                .numeric("shutdown_timer", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(14400)
                .withUnit("sec")
                .withDescription("Auto shutdown in seconds. Must be set after setting valve state auto shutdown."),
            e.battery(),
        ],
    },
];
