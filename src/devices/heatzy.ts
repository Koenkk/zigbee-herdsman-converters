import {Zcl} from "zigbee-herdsman";
import type {TCustomCluster} from "zigbee-herdsman/dist/controller/tstype";

import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const PILOT_WIRE_CLUSTER = "heatzyPilotWire";
const BLE_OTA_CLUSTER = "heatzyBleOta";

interface HeatzyBleOtaCluster extends TCustomCluster {
    attributes: {state: number};
    commands: {
        startBleOta: Record<never, never>;
        stopBleOta: Record<never, never>;
    };
    commandResponses: never;
}

const pilotWireModes = {
    off: 0x00,
    comfort: 0x01,
    eco: 0x02,
    frost_protection: 0x03,
    "comfort_-1": 0x04,
    "comfort_-2": 0x05,
};

const bleOtaStates = {
    disabled: 0,
    advertising: 1,
    connected: 2,
    receiving: 3,
    verifying: 4,
};

const bleOtaControl: ModernExtend = {
    exposes: [e.binary("ble_ota", ea.ALL, "ON", "OFF").withDescription("Open or close the Bluetooth OTA window")],
    fromZigbee: [
        {
            cluster: BLE_OTA_CLUSTER,
            type: ["attributeReport", "readResponse"],
            convert: (model, msg) => {
                if (msg.data.state === undefined) return;
                return {ble_ota: msg.data.state === bleOtaStates.disabled ? "OFF" : "ON"};
            },
        },
    ],
    toZigbee: [
        {
            key: ["ble_ota"],
            convertSet: async (entity, key, value, meta) => {
                if (value !== "ON" && value !== "OFF") {
                    throw new Error("ble_ota accepts only ON or OFF");
                }

                const endpoint = meta.device.getEndpoint(11);
                if (!endpoint) {
                    throw new Error("BLE OTA endpoint is unavailable; update the device firmware and re-interview it");
                }

                const command = value === "ON" ? "startBleOta" : "stopBleOta";
                await endpoint.command<typeof BLE_OTA_CLUSTER, typeof command, HeatzyBleOtaCluster>(BLE_OTA_CLUSTER, command, {});
                const state = await endpoint.read<typeof BLE_OTA_CLUSTER, HeatzyBleOtaCluster>(BLE_OTA_CLUSTER, ["state"]);
                return {state: {ble_ota: state.state === bleOtaStates.disabled ? "OFF" : "ON"}};
            },
            convertGet: async (entity, key, meta) => {
                const endpoint = meta.device.getEndpoint(11);
                if (!endpoint) {
                    throw new Error("BLE OTA endpoint is unavailable; update the device firmware and re-interview it");
                }
                await endpoint.read<typeof BLE_OTA_CLUSTER, HeatzyBleOtaCluster>(BLE_OTA_CLUSTER, ["state"]);
            },
        } satisfies Tz.Converter,
    ],
    isModernExtend: true,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{type: "Router", manufacturerName: "Heatzy", modelID: "micro-duo"}],
        model: "micro-duo",
        vendor: "Heatzy",
        description: "Pilot wire controller with relay, energy metering and Bluetooth OTA",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {relay: 10, pilot_wire: 1, ble_ota: 11}}),
            m.onOff({endpointNames: ["relay"], powerOnBehavior: false}),
            m.electricityMeter({
                endpointNames: ["relay"],
                voltage: false,
                current: false,
                acFrequency: false,
                powerFactor: false,
                apparentPower: false,
                configureReporting: true,
            }),
            m.deviceAddCustomCluster(PILOT_WIRE_CLUSTER, {
                name: PILOT_WIRE_CLUSTER,
                ID: 0xfc00,
                attributes: {
                    mode: {name: "mode", ID: 0x0000, type: Zcl.DataType.UINT8, write: true},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup({
                name: "pilot_wire_mode",
                cluster: PILOT_WIRE_CLUSTER,
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT8},
                lookup: pilotWireModes,
                description: "Pilot wire mode",
                endpointName: "pilot_wire",
                reporting: {min: "MIN", max: "MAX", change: 1},
            }),
            m.deviceAddCustomCluster(BLE_OTA_CLUSTER, {
                name: BLE_OTA_CLUSTER,
                ID: 0xfc01,
                attributes: {
                    state: {name: "state", ID: 0x0000, type: Zcl.DataType.UINT8},
                },
                commands: {
                    startBleOta: {name: "startBleOta", ID: 0x00, parameters: []},
                    stopBleOta: {name: "stopBleOta", ID: 0x01, parameters: []},
                },
                commandsResponse: {},
            }),
            m.enumLookup({
                name: "ble_ota_status",
                cluster: BLE_OTA_CLUSTER,
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT8},
                lookup: bleOtaStates,
                description: "Current Bluetooth OTA state",
                endpointName: "ble_ota",
                access: "STATE_GET",
                reporting: {min: "MIN", max: "MAX", change: 1},
            }),
            bleOtaControl,
        ],
    },
];
