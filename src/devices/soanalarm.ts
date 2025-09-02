import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SNT858Z"],
        model: "SNT858Z",
        vendor: "Soanalarm",
        description: "Soil moisture sensor",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.temperature(), e.soil_moisture(), tuya.exposes.temperatureUnit(), e.battery()],
        meta: {
            tuyaDatapoints: [
                [3, "soil_moisture", tuya.valueConverter.raw],
                [5, "temperature", tuya.valueConverter.raw],
                [9, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [15, "battery", tuya.valueConverter.raw],
            ],
        },
    },
];
