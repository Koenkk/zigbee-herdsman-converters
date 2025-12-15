import {Zcl} from "zigbee-herdsman";
import * as exposes from "./exposes";
import {logger} from "./logger";
import {deviceAddCustomCluster} from "./modernExtend";
import * as reporting from "./reporting";
import type {KeyValueAny, ModernExtend} from "./types";
import * as utils from "./utils";

const e = exposes.presets;
const NS = "zhc:nodon";

const PILOT_WIRE_CLUSTER = "customClusterNodOnPilotWire";
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.NODON};

interface NodonPilotWire {
    attributes: {
        mode: number;
    };
    commands: {
        setMode: {mode: number};
    };
    commandResponses: never;
}

const pilotWireCluster = deviceAddCustomCluster(PILOT_WIRE_CLUSTER, {
    ID: 0xfc00,
    manufacturerCode: Zcl.ManufacturerCode.NODON,
    attributes: {
        mode: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
    },
    commands: {
        setMode: {
            ID: 0x0000,
            parameters: [{name: "mode", type: Zcl.DataType.UINT8, max: 0xff}],
        },
    },
    commandsResponse: {},
});

const pilotWireConfig = (configureReporting: boolean): ModernExtend => {
    return {
        exposes: [e.pilot_wire_mode()],
        fromZigbee: [
            {
                cluster: PILOT_WIRE_CLUSTER,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValueAny = {};
                    const mode = msg.data.mode;

                    if (mode === 0x00) payload.pilot_wire_mode = "off";
                    else if (mode === 0x01) payload.pilot_wire_mode = "comfort";
                    else if (mode === 0x02) payload.pilot_wire_mode = "eco";
                    else if (mode === 0x03) payload.pilot_wire_mode = "frost_protection";
                    else if (mode === 0x04) payload.pilot_wire_mode = "comfort_-1";
                    else if (mode === 0x05) payload.pilot_wire_mode = "comfort_-2";
                    else {
                        logger.warning(`wrong mode : ${mode}`, NS);
                        payload.pilot_wire_mode = "unknown";
                    }
                    return payload;
                },
            },
        ],
        toZigbee: [
            {
                key: ["pilot_wire_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const mode = utils.getFromLookup(value, {
                        off: 0x00,
                        comfort: 0x01,
                        eco: 0x02,
                        frost_protection: 0x03,
                        "comfort_-1": 0x04,
                        "comfort_-2": 0x05,
                    });
                    const payload = {mode: mode};
                    await entity.command<typeof PILOT_WIRE_CLUSTER, "setMode", NodonPilotWire>(PILOT_WIRE_CLUSTER, "setMode", payload);
                    return {state: {pilot_wire_mode: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof PILOT_WIRE_CLUSTER, NodonPilotWire>(PILOT_WIRE_CLUSTER, [0x0000], manufacturerOptions);
                },
            },
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const ep = device.getEndpoint(1);
                await reporting.bind(ep, coordinatorEndpoint, [PILOT_WIRE_CLUSTER]);
                if (configureReporting) {
                    const p = reporting.payload<typeof PILOT_WIRE_CLUSTER, NodonPilotWire>("mode", 0, 120, 0, {min: 1, max: 3600, change: 0});
                    await ep.configureReporting(PILOT_WIRE_CLUSTER, p);
                } else {
                    await ep.read<typeof PILOT_WIRE_CLUSTER, NodonPilotWire>(PILOT_WIRE_CLUSTER, ["mode"]);
                }
            },
        ],
        isModernExtend: true,
    };
};

export const nodonPilotWire = (configureReporting: boolean): ModernExtend[] => [pilotWireCluster, pilotWireConfig(configureReporting)];
