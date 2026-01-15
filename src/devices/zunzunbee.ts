import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

const fzLocal = {
    fzZunzunbeeSlateSwitchIAS: {
        cluster: "ssIasZone",
        type: ["attributeReport", "readResponse", "commandStatusChangeNotification"],
        convert: (model, msg, publish, options, meta) => {
            let zoneStatus: number;
            if ("zoneStatus" in msg.data) {
                zoneStatus = msg.data.zoneStatus;
            } else if ("zonestatus" in msg.data) {
                zoneStatus = msg.data.zonestatus;
            }

            // Bit0 encodes press type
            const pressType = zoneStatus & 0x0001 ? "long_press" : "short_press";

            // Bits 1..8 encode button number (2..256)
            const masked = zoneStatus & 0x01fe;
            const map = {2: 1, 4: 2, 8: 3, 16: 4, 32: 5, 64: 6, 128: 7, 256: 8};
            return {action: `button_${utils.getFromLookup(masked, map)}_${pressType}`};
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse", "commandStatusChangeNotification"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{manufacturerName: "zunzunbee", modelID: "SSWZ8T"}],
        model: "SSWZ8T",
        vendor: "zunzunbee",
        description: "Slate switch (8-button touch controller)",
        fromZigbee: [fzLocal.fzZunzunbeeSlateSwitchIAS],
        exposes: [
            e.action([
                "button_1_short_press",
                "button_1_long_press",
                "button_2_short_press",
                "button_2_long_press",
                "button_3_short_press",
                "button_3_long_press",
                "button_4_short_press",
                "button_4_long_press",
                "button_5_short_press",
                "button_5_long_press",
                "button_6_short_press",
                "button_6_long_press",
                "button_7_short_press",
                "button_7_long_press",
                "button_8_short_press",
                "button_8_long_press",
            ]),
        ],
        extend: [m.battery(), m.temperature()],
    },
];
