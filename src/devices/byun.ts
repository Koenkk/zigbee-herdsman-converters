import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

const fzLocal = {
    byun_smoke_false: {
        cluster: "pHMeasurement",
        type: ["attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID === 1 && msg.data.measuredValue === 0) {
                return {smoke: false};
            }
        },
    } satisfies Fz.Converter<"pHMeasurement", undefined, ["attributeReport"]>,
    byun_smoke_true: {
        cluster: "ssIasZone",
        type: ["commandStatusChangeNotification"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID === 1 && msg.data.zonestatus === 33) {
                return {smoke: true};
            }
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification"]>,
    byun_gas_false: {
        cluster: 1034, // ID: 0x040a,"msElectricalConductivity"
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID === 1 && msg.data[0] === 24) {
                return {gas: false};
            }
        },
    } satisfies Fz.Converter<1034, undefined, ["raw"]>,
    byun_gas_true: {
        cluster: "ssIasZone",
        type: ["commandStatusChangeNotification"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID === 1 && msg.data.zonestatus === 33) {
                return {gas: true};
            }
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Windows switch  "],
        model: "M415-6C",
        vendor: "BYUN",
        description: "Smoke sensor",
        fromZigbee: [fzLocal.byun_smoke_true, fzLocal.byun_smoke_false],
        toZigbee: [],
        exposes: [e.smoke()],
    },
    {
        zigbeeModel: ["GAS  SENSOR     "],
        model: "M415-5C",
        vendor: "BYUN",
        description: "Gas sensor",
        fromZigbee: [fzLocal.byun_gas_true, fzLocal.byun_gas_false],
        toZigbee: [],
        exposes: [e.gas()],
    },
];
