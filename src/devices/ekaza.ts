import {Zcl} from "zigbee-herdsman";

import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0225", ["_TZ3210_eep3fewj"]),
        model: "TS0225_EKAZA",
        vendor: "Ekaza",
        description: "24 GHz presence sensor",
        extend: [
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1"]}),
            // Keep this before tuyaBase so the generic DP converter does not intercept distance writes.
            m.numeric<"manuSpecificTuya2", tuya.ManuSpecificTuya2>({
                name: "detection_distance",
                cluster: "manuSpecificTuya2",
                attribute: {ID: 0xe00b, type: Zcl.DataType.UINT16},
                description: "Maximum detection distance",
                unit: "m",
                valueMin: 1,
                valueMax: 6,
                valueStep: 1,
                reporting: false,
            }),
            tuya.modernExtend.tuyaBase({dp: true}),
        ],
        exposes: [
            e.numeric("illuminance", ea.STATE).withDescription("Raw illuminance reported by the sensor"),
            e
                .numeric("presence_delay", ea.STATE_SET)
                .withUnit("s")
                .withValueMin(1)
                .withValueMax(300)
                .withValueStep(1)
                .withDescription("Delay before reporting absence after presence is no longer detected"),
        ],
        meta: {
            tuyaSendCommand: "sendData",
            tuyaDatapoints: [
                [101, "presence_delay", tuya.valueConverter.raw],
                [104, "illuminance", tuya.valueConverter.raw],
            ],
        },
        configure: async (device) => {
            // IAS enrollment is handled by zigbee-herdsman during interview.
            await device.getEndpoint(1).read("ssIasZone", ["zoneStatus"]);
        },
    },
];
