import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["JAVISLOCK"],
        fingerprint: [
            {modelID: "doorlock_5001", manufacturerName: "Lmiot"},
            {modelID: "E321V000A03", manufacturerName: "Vensi"},
        ],
        model: "JS-SLK2-ZB",
        vendor: "JAVIS",
        description: "Intelligent biometric digital lock",
        fromZigbee: [fz.javis_lock_report, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["unlock"])],
    },
    {
        zigbeeModel: ["JAVISSENSOR"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_lgstepha", "_TZE200_kagkgk0i", "_TZE200_i0b1dbqu"]),
        model: "JS-MC-SENSOR-ZB",
        vendor: "JAVIS",
        description: "Microwave sensor",
        fromZigbee: [legacy.fz.javis_microwave_sensor],
        toZigbee: [legacy.tz.javis_microwave_sensor],
        exposes: [
            e.occupancy(),
            e.illuminance(),
            e.binary("led_enable", ea.STATE_SET, true, false).withDescription("Enabled LED"),
            e
                .enum("keep_time", ea.STATE_SET, ["0", "1", "2", "3", "4", "5", "6", "7"])
                .withDescription("PIR keep time 0:5s|1:30s|2:60s|3:180s|4:300s|5:600s|6:1200s|7:1800s"),
            e.enum("sensitivity", ea.STATE_SET, ["25", "50", "75", "100"]),
            e.numeric("illuminance_calibration", ea.STATE_SET).withDescription("Illuminance calibration").withValueMin(-10000).withValueMax(10000),
        ],
    },
];
