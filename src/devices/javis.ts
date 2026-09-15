import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as globalStore from "../lib/store";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    javis_lock_report: {
        cluster: "genBasic",
        type: "attributeReport",
        convert: (model, msg, publish, options, meta) => {
            const lookup: KeyValueAny = {
                0: "pairing",
                1: "keypad",
                2: "rfid_card_unlock",
                3: "touch_unlock",
            };
            const utf8FromStr = (s: string) => {
                const a = [];
                for (let i = 0, enc = encodeURIComponent(s); i < enc.length; ) {
                    if (enc[i] === "%") {
                        a.push(Number.parseInt(enc.substr(i + 1, 2), 16));
                        i += 3;
                    } else {
                        a.push(enc.charCodeAt(i++));
                    }
                }
                return a;
            };

            const data = utf8FromStr(msg.data["16896"] as string);

            clearTimeout(globalStore.getValue(msg.endpoint, "timer"));
            const timer = setTimeout(() => publish({action: "lock", state: "LOCK"}), 2 * 1000).unref();
            globalStore.putValue(msg.endpoint, "timer", timer);

            return {
                action: "unlock",
                action_user: data[3],
                action_source: data[5],
                action_source_name: lookup[data[5]],
            };
        },
    } satisfies Fz.Converter<"genBasic", undefined, "attributeReport">,
};

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
        fromZigbee: [fzLocal.javis_lock_report, fz.battery],
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
