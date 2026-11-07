import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

interface TeelichtFlicker {
    attributes: {
        flickerDepth: number;
        flickerSpeed: number;
        flickerEffect: number;
        powerState: number;
    };
    commands: never;
    commandResponses: never;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["teelicht-c6"],
        model: "teelicht",
        vendor: "teelicht",
        description: "Rechargeable tealight that flickers like a real candle",
        extend: [
            m.deviceAddCustomCluster("teelichtFlicker", {
                name: "teelichtFlicker",
                ID: 0xfc00,
                attributes: {
                    flickerDepth: {name: "flickerDepth", ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 100},
                    flickerSpeed: {name: "flickerSpeed", ID: 0x0001, type: Zcl.DataType.UINT8, write: true, min: 3, max: 40},
                    flickerEffect: {name: "flickerEffect", ID: 0x0002, type: Zcl.DataType.ENUM8, write: true, max: 1},
                    powerState: {name: "powerState", ID: 0x0003, type: Zcl.DataType.ENUM8, max: 3},
                },
                commands: {},
                commandsResponse: {},
            }),
            // Starts dark at 2200 K after every boot and has no trigger effect handler.
            // configureReporting: without it the board doesn't report presses on its own button.
            m.light({colorTemp: {range: [370, 555], startup: false}, powerOnBehavior: false, effect: false, configureReporting: true}),
            m.identify(),
            // Firmware 0.3.0 and later. Before m.battery: Zigbee2MQTT runs the configure steps in order
            // and stops at the first failure, and boards up to 0.3.1 refuse the battery voltage report.
            m.enumLookup<"teelichtFlicker", TeelichtFlicker>({
                name: "power_state",
                cluster: "teelichtFlicker",
                attribute: "powerState",
                description: "On battery, charging over USB, charged, or on USB without a cell.",
                lookup: {battery: 0, charging: 1, charged: 2, no_cell: 3},
                access: "STATE_GET",
                reporting: {min: 0, max: 3600, change: 0},
                entityCategory: "diagnostic",
            }),
            // The defaults (at most hourly, voltage only on a 1 V change) hide almost everything. The firmware
            // updates both every 10 min, on a 2 % change and when USB comes or goes; let those through.
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: {min: 10, max: 3600, change: 2},
                voltageReportingConfig: {min: 10, max: 3600, change: 1},
            }),
            m.numeric<"teelichtFlicker", TeelichtFlicker>({
                name: "flicker_depth",
                cluster: "teelichtFlicker",
                attribute: "flickerDepth",
                description: "How strongly the flame flickers. 0 is a steady light.",
                unit: "%",
                valueMin: 0,
                valueMax: 100,
                valueStep: 1,
                access: "ALL",
                reporting: false,
                entityCategory: "config",
            }),
            m.numeric<"teelichtFlicker", TeelichtFlicker>({
                name: "flicker_speed",
                cluster: "teelichtFlicker",
                attribute: "flickerSpeed",
                description: "Speed of the flicker, 1 is a calm candle.",
                unit: "x",
                valueMin: 0.3,
                valueMax: 4,
                valueStep: 0.1,
                scale: 10,
                precision: 1,
                access: "ALL",
                reporting: false,
                entityCategory: "config",
            }),
            m.enumLookup<"teelichtFlicker", TeelichtFlicker>({
                name: "flicker_effect",
                cluster: "teelichtFlicker",
                attribute: "flickerEffect",
                description: "Candle flicker or a steady light.",
                lookup: {candle: 0, steady: 1},
                access: "ALL",
                reporting: false,
                entityCategory: "config",
            }),
        ],
    },
];
