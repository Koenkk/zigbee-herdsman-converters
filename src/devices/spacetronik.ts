import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE204_uc0iv1hb"}],
        model: "ZB-DG02",
        vendor: "Spacetronik",
        description: "Gas leakage sensor",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        meta: {
            tuyaDatapoints: [
                [1, "gas", tuya.valueConverter.trueFalse0],
	    ],
        },
        exposes: [e.gas()],
    },
];
