import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_lnsk1ead"]),
        model: "MS-JT-63",
        vendor: "MoveSmart",
        description: "Din rail switch with power monitoring",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            // Original ZBN-JT-63 functions
            tuya.exposes.switch(),
            e.numeric("power", ea.STATE)
                .withUnit("W")
                .withDescription("Instantaneous measured power"),
            e.numeric("current", ea.STATE)
                .withUnit("A")
                .withDescription("Instantaneous measured electrical current"),
            e.numeric("voltage", ea.STATE)
                .withUnit("V")
                .withDescription("Measured electrical potential value"),
            e.numeric("energy", ea.STATE)
                .withUnit("kWh")
                .withDescription("Consumed energy"),
            e.enum("power_outage_memory", ea.STATE_SET, ["on", "off", "restore"])
                .withDescription("Recover state after power outage"),
            e.enum("fault", ea.STATE, [
                "clear",
                "short_circuit_alarm",
                "surge_alarm",
                "overload_alarm",
                "leakagecurr_alarm",
                "temp_dif_fault",
                "fire_alarm",
                "high_power_alarm",
                "self_test_alarm",
                "ov_cr",
                "unbalance_alarm",
                "ov_vol",
                "undervoltage_alarm",
                "miss_phase_alarm",
                "outage_alarm",
                "magnetism_alarm",
                "credit_alarm",
                "no_balance_alarm",
            ]).withDescription("Fault status of the device"),
            e.text("meter_id", ea.STATE)
                .withDescription("Meter ID"),

            // Additional MS-JT-63 functions
            e.numeric("recover_cnt", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(99)
                .withDescription("Reclosing attempt limit"),
            e.binary("recover_enable", ea.STATE_SET, "ON", "OFF")
                .withDescription("Reclosing enable"),
            e.numeric("leak_delay", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(99)
                .withDescription("Reclosing recovery time"),
            e.enum("status", ea.STATE, ["0", "1", "2"])
                .withDescription("Device status"),
            e.enum("relay_power_on_state", ea.STATE_SET, ["Off", "On", "Restore"])
                .withDescription("Relay power-on state setting"),
        ],
        meta: {
            tuyaDatapoints: [
                // Original ZBN-JT-63 datapoints
                [1, "energy", tuya.valueConverter.divideBy100],
                [3, null, null],
                [4, null, null],
                [6, null, tuya.valueConverter.phaseVariant3],
                [
                    10,
                    "fault",
                    tuya.valueConverterBasic.lookup({
                        clear: 0,
                        ov_cr: 1,
                        unbalance_alarm: 2,
                        ov_vol: 4,
                        undervoltage_alarm: 8,
                        miss_phase_alarm: 16,
                        outage_alarm: 32,
                        magnetism_alarm: 64,
                        terminal_alarm: 128,
                        cover_alarm: 256,
                        credit_alarm: 512,
                        no_balance_alarm: 1024,
                        battery_alarm: 2048,
                        meter_hardware_alarm: 4096,
                    }),
                ],
                [16, "state", tuya.valueConverter.onOff],
                [
                    18,
                    "meter_id",
                    {
                        from: (v) => {
                            if (typeof v === "object") {
                                const buf = Buffer.from([v[0], v[1], v[2], v[3]]);
                                return buf.readUInt32BE();
                            }
                            return v;
                        },
                    },
                ],
                [
                    23,
                    "power_outage_memory",
                    tuya.valueConverterBasic.lookup({
                        on: 0,
                        off: 1,
                        restore: 2,
                    }),
                ],

                // Additional MS-JT-63 datapoints
                [102, "recover_cnt", tuya.valueConverter.raw],
                [104, "recover_enable", tuya.valueConverter.onOff],
                [107, "leak_delay", tuya.valueConverter.raw],
                [
                    127,
                    "status",
                    tuya.valueConverterBasic.lookup({
                        "0": tuya.enum(0),
                        "1": tuya.enum(1),
                        "2": tuya.enum(2),
                    }),
                ],
                [
                    134,
                    "relay_power_on_state",
                    tuya.valueConverterBasic.lookup({
                        Off: 0,
                        On: 1,
                        Restore: 2,
                    }),
                ],
            ],
        },
    },
];
