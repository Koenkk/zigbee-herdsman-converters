import {Zcl} from "zigbee-herdsman";
import * as exposes from "./exposes";
import {logger} from "./logger";
import {deviceAddCustomCluster} from "./modernExtend";
import * as reporting from "./reporting";
import type {KeyValueAny, ModernExtend} from "./types";
import * as utils from "./utils";

const e = exposes.presets;
const NS = "zhc:nodon";

interface NodonPilotWire {
    attributes: {
        mode: number;
    };
    commands: {
        setMode: {mode: number};
    };
    commandResponses: never;
}

const createPilotWireCluster = (clusterName: string, manufacturerCode: number) =>
    deviceAddCustomCluster(clusterName, {
        ID: 0xfc00,
        manufacturerCode: manufacturerCode,
        attributes: {
            mode: {ID: 0x0000, type: Zcl.DataType.UINT8},
        },
        commands: {
            setMode: {
                ID: 0x0000,
                parameters: [{name: "mode", type: Zcl.DataType.UINT8}],
            },
        },
        commandsResponse: {},
    });

const createPilotWireConfig = (clusterName: string, manufacturerCode: number, configureReporting: boolean): ModernExtend => {
    const manufacturerOptions = {manufacturerCode: manufacturerCode};
    return {
        exposes: [e.pilot_wire_mode()],
        fromZigbee: [
            {
                cluster: clusterName,
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
                    await entity.command<typeof clusterName, "setMode", NodonPilotWire>(clusterName, "setMode", payload, manufacturerOptions);
                    return {state: {pilot_wire_mode: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, NodonPilotWire>(clusterName, [0x0000], manufacturerOptions);
                },
            },
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const ep = device.getEndpoint(1);
                await reporting.bind(ep, coordinatorEndpoint, [clusterName]);
                if (configureReporting) {
                    const p = reporting.payload<typeof clusterName, NodonPilotWire>("mode", 0, 120, 0, {min: 1, max: 3600, change: 0});
                    await ep.configureReporting(clusterName, p, manufacturerOptions);
                } else {
                    await ep.read<typeof clusterName, NodonPilotWire>(clusterName, ["mode"], manufacturerOptions);
                }
            },
        ],
        isModernExtend: true,
    };
};

const NODON_PILOT_WIRE_CLUSTER = "customClusterNodOnPilotWire";

export const nodonPilotWire = (
    configureReporting: boolean,
    manufacturerCode: number = Zcl.ManufacturerCode.NODON,
    clusterName: string = NODON_PILOT_WIRE_CLUSTER,
): ModernExtend[] => [
    createPilotWireCluster(clusterName, manufacturerCode),
    createPilotWireConfig(clusterName, manufacturerCode, configureReporting),
];
