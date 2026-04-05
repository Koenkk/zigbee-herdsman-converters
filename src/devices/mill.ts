import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Panel gen4", "Mill Wi-Fi Panel Heater Gen4\u0000\u0000\u0000\u0018Mill Int"],
        model: "Mill-gen-4",
        vendor: "Mill",
        description: "WiFi heating panel gen4",
        extend: [
            m.identify(),
            m.thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 35, step: 0.5},
                    },
                },
                systemMode: {
                    values: ["off", "heat"],
                },
            }),
        ],
    },
    {
        fingerprint: [{manufacturerName: "Mill International\u0000Threa"}, {manufacturerName: "Mill InternationalThrea"}],
        zigbeeModel: ["Mill International\u0000Threa", "Mill InternationalThrea"],
        model: "MFTWIFI",
        vendor: "Mill",
        description: "Mill Smart Floor Thermostat WiFi & Zigbee",
        extend: [
            m.thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 35, step: 0.5},
                    },
                },
                systemMode: {
                    values: ["off", "heat"],
                },
            }),
        ],
    },
];
