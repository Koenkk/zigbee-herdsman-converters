import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    KAMI_contact: {
        cluster: "ssIasZone",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            return {contact: msg.data[7] === 0};
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["raw"]>,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    KAMI_occupancy: {
        cluster: "msOccupancySensing",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data[7] === 1) {
                return {action: "motion"};
            }
        },
    } satisfies Fz.Converter<"msOccupancySensing", undefined, ["raw"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Z3ContactSensor"],
        model: "N20",
        vendor: "KAMI",
        description: "Contact sensor or motion sensor",
        fromZigbee: [fzLocal.KAMI_contact, fzLocal.KAMI_occupancy],
        toZigbee: [],
        exposes: [e.contact(), e.action(["motion"])],
    },
];
