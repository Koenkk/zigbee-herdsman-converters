import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as globalStore from "../lib/store";
import type {Configure, DefinitionWithExtend, Expose, Fz, KeyValueAny, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {getEndpointsWithCluster, postfixWithEndpointName} from "../lib/utils";

//import {logger} from "../lib/logger";
//const NS = "zhc:ensystec";

const e = exposes.presets;
const ea = exposes.access;

interface EnsystecLeakSensor {
    attributes: {
        onLine: number;
        leakDetect: number;
        inputConfig: number;
        batteryLow: number;
    };
    commands: {resetAlarm: {data: number}};
    commandResponses: never;
}

interface EnsystecDefenderOpenClose {
    attributes: {
        positionPercent: number;
        electricValveConnection: number;
    };
    commands: never;
    commandResponses: never;
}

function elpcResetAlarm(): ModernExtend {
    const exposes: Expose[] = [e.enum("alarm_reset", ea.SET, ["reset"]).withDescription("Reset alarm")];
    const toZigbee: Tz.Converter[] = [
        {
            key: ["alarm_reset"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(value, key);
                utils.validateValue(value, ["reset"]);
                await entity.command("EnsystecLeakProtect", 0x00, {}, utils.getOptions(meta.mapped, entity));
                return {state: {[key]: value}};
            },
        },
    ];

    return {exposes, fromZigbee: [], toZigbee, isModernExtend: true};
}

interface ElpcForceOpenArgs {
    endpointName?: string;
}

function elpcForceOpen(args: ElpcForceOpenArgs = {}): ModernExtend {
    const {endpointName = undefined} = args;
    const cluster = "genOnOff";
    const name = "force_open";

    let expose = e.enum(name, ea.SET, ["Force open"]).withDescription("Force open electric valves");
    if (endpointName) expose = expose.withEndpoint(endpointName);

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet: async (entity, key, value, meta) => {
                if (endpointName) {
                    const ep = utils.toNumber(endpointName);
                    const endpoint = meta.device.getEndpoint(ep);
                    await endpoint.command(cluster, 0x01, {}, utils.getOptions(meta.mapped, entity));
                } else {
                    const endpoints = getEndpointsWithCluster(meta.device, cluster, "input");
                    for (const endpoint of endpoints) {
                        await endpoint.command(cluster, 0x01, {}, utils.getOptions(meta.mapped, entity));
                        break;
                    }
                }
            },
        },
    ];

    return {exposes: [expose], fromZigbee: [], toZigbee, isModernExtend: true};
}

function elpcExposesSeMetering(
    name: string,
    description: string,
    access: number,
    unit?: string,
    valueMin?: number,
    valueMax?: number,
    endpoint?: string,
): Expose {
    let expose = e.numeric(name, access).withDescription(description);
    if (endpoint !== undefined) expose = expose.withEndpoint(endpoint);
    if (unit !== undefined) expose = expose.withUnit(unit);
    if (valueMin !== undefined) expose = expose.withValueMin(valueMin);
    if (valueMax !== undefined) expose = expose.withValueMax(valueMax);

    return expose;
}

interface ElpcCurrentSummDeliveredArgs {
    endpointNames?: string[];
}

function elpcCurrentSummDelivered(args: ElpcCurrentSummDeliveredArgs = {}): ModernExtend {
    const {endpointNames = undefined} = args;

    const endpoints = endpointNames;

    const max_endpoints = 10;

    const name_energy = [
        "input_1_water_meter",
        "input_2_water_meter",
        "input_3_water_meter",
        "input_4_water_meter",
        "input_5_water_meter",
        "input_6_water_meter",
        "input_7_water_meter",
        "input_8_water_meter",
        "input_9_water_meter",
        "input_10_water_meter",
    ];

    const name_divisor = [
        "input_1_divisor",
        "input_2_divisor",
        "input_3_divisor",
        "input_4_divisor",
        "input_5_divisor",
        "input_6_divisor",
        "input_7_divisor",
        "input_8_divisor",
        "input_9_divisor",
        "input_10_divisor",
    ];

    const name_multiplier = [
        "input_1_multiplier",
        "input_2_multiplier",
        "input_3_multiplier",
        "input_4_multiplier",
        "input_5_multiplier",
        "input_6_multiplier",
        "input_7_multiplier",
        "input_8_multiplier",
        "input_9_multiplier",
        "input_10_multiplier",
    ];

    const description_energy = [
        "Water meter on input 1",
        "Water meter on input 2",
        "Water meter on input 3",
        "Water meter on input 4",
        "Water meter on input 5",
        "Water meter on input 6",
        "Water meter on input 7",
        "Water meter on input 8",
        "Water meter on input 9",
        "Water meter on input 10",
    ];

    const description_divisor = [
        "Divisor of water meter 1",
        "Divisor of water meter 2",
        "Divisor of water meter 3",
        "Divisor of water meter 4",
        "Divisor of water meter 5",
        "Divisor of water meter 6",
        "Divisor of water meter 7",
        "Divisor of water meter 8",
        "Divisor of water meter 9",
        "Divisor of water meter 10",
    ];

    const description_multiplier = [
        "Multiplier of water meter 1",
        "Multiplier of water meter 2",
        "Multiplier of water meter 3",
        "Multiplier of water meter 4",
        "Multiplier of water meter 5",
        "Multiplier of water meter 6",
        "Multiplier of water meter 7",
        "Multiplier of water meter 8",
        "Multiplier of water meter 9",
        "Multiplier of water meter 10",
    ];

    const configure: Configure[] = [];
    const exposes: Expose[] = [];

    if (!endpoints) {
        exposes.push(elpcExposesSeMetering(name_energy[0], description_energy[0], ea.ALL, "m3", 0, 281474976710655));
        exposes.push(elpcExposesSeMetering(name_divisor[0], description_divisor[0], ea.ALL, undefined, 1, 16777215));
        exposes.push(elpcExposesSeMetering(name_multiplier[0], description_multiplier[0], ea.ALL, undefined, 1, 16777215));
        configure.push(m.setupConfigureForReading("seMetering", ["multiplier", "divisor", "currentSummDelivered"]));
        configure.push(m.setupConfigureForBinding("seMetering", "input"));
        configure.push(m.setupConfigureForReporting("seMetering", "currentSummDelivered", {config: {min: 5, max: 3600, change: 1}, access: ea.GET}));
    } else {
        let count = 0;
        for (const endpoint of endpoints) {
            exposes.push(elpcExposesSeMetering(name_energy[count], description_energy[count], ea.ALL, "m3", 0, 281474976710655, endpoint));
            exposes.push(elpcExposesSeMetering(name_divisor[count], description_divisor[count], ea.ALL, undefined, 1, 16777215, endpoint));
            exposes.push(elpcExposesSeMetering(name_multiplier[count], description_multiplier[count], ea.ALL, undefined, 1, 16777215, endpoint));
            count++;
            if (count >= max_endpoints) break;
        }
        configure.push(m.setupConfigureForReading("seMetering", ["multiplier", "divisor", "currentSummDelivered"], endpointNames));
        configure.push(m.setupConfigureForBinding("seMetering", "input", endpointNames));
        configure.push(
            m.setupConfigureForReporting("seMetering", "currentSummDelivered", {
                config: {min: 5, max: 3600, change: 1},
                access: ea.GET,
                endpointNames,
            }),
        );
    }

    const toZigbee: Tz.Converter[] = [
        {
            key: [
                name_divisor[0],
                name_divisor[1],
                name_divisor[2],
                name_divisor[3],
                name_divisor[4],
                name_divisor[5],
                name_divisor[6],
                name_divisor[7],
                name_divisor[8],
                name_divisor[9],
            ],
            convertGet: async (entity, key, meta) => {
                await entity.read("seMetering", ["divisor"]);
            },
            convertSet: async (entity, key, value, meta) => {
                utils.assertNumber(value);
                const divisor = Number(Math.round(value));
                await entity.write("seMetering", {divisor});
                utils.assertEndpoint(entity);
                globalStore.putValue(utils.enforceEndpoint(entity, key, meta), "Divisor", divisor);
                await entity.read("seMetering", ["currentSummDelivered"]);
                return {readAfterWriteTime: 250, state: {[key]: value}};
            },
        },
        {
            key: [
                name_multiplier[0],
                name_multiplier[1],
                name_multiplier[2],
                name_multiplier[3],
                name_multiplier[4],
                name_multiplier[5],
                name_multiplier[6],
                name_multiplier[7],
                name_multiplier[8],
                name_multiplier[9],
            ],
            convertGet: async (entity, key, meta) => {
                await entity.read("seMetering", ["multiplier"]);
            },
            convertSet: async (entity, key, value, meta) => {
                utils.assertNumber(value);
                const multiplier = Number(Math.round(value));
                await entity.write("seMetering", {multiplier});
                utils.assertEndpoint(entity);
                globalStore.putValue(utils.enforceEndpoint(entity, key, meta), "Multiplier", multiplier);
                await entity.read("seMetering", ["currentSummDelivered"]);
                return {readAfterWriteTime: 250, state: {[key]: value}};
            },
        },
        {
            key: [
                name_energy[0],
                name_energy[1],
                name_energy[2],
                name_energy[3],
                name_energy[4],
                name_energy[5],
                name_energy[6],
                name_energy[7],
                name_energy[8],
                name_energy[9],
            ],
            convertGet: async (entity, key, meta) => {
                await entity.read("seMetering", ["currentSummDelivered"]);
            },
            convertSet: async (entity, key, value, meta) => {
                utils.assertNumber(value);
                const currentSummDelivered = Number(Math.round(value));
                await entity.write("seMetering", {currentSummDelivered});
            },
        },
    ];

    const fromZigbee = [
        {
            cluster: "seMetering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                if (msg.data.divisor !== undefined) {
                    if (endpoints) {
                        const ep = utils.getEndpointName(msg, model, meta);
                        for (let i = 0; i < endpoints.length; i++) {
                            if (i === max_endpoints) break;
                            if (ep === endpoints[i]) {
                                result[postfixWithEndpointName(name_divisor[i], msg, model, meta)] = msg.data.divisor;
                                break;
                            }
                        }
                    } else {
                        result[name_divisor[0]] = msg.data.divisor;
                    }
                    globalStore.putValue(msg.endpoint, "Divisor", msg.data.divisor);
                }
                return result;
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
        {
            cluster: "seMetering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                if (msg.data.multiplier !== undefined) {
                    if (endpoints) {
                        const ep = utils.getEndpointName(msg, model, meta);
                        for (let i = 0; i < endpoints.length; i++) {
                            if (i === max_endpoints) break;
                            if (ep === endpoints[i]) {
                                result[postfixWithEndpointName(name_multiplier[i], msg, model, meta)] = msg.data.multiplier;
                                break;
                            }
                        }
                    } else {
                        result[name_multiplier[0]] = msg.data.multiplier;
                    }
                    globalStore.putValue(msg.endpoint, "Multiplier", msg.data.multiplier);
                }
                return result;
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
        {
            cluster: "seMetering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                if (msg.data.currentSummDelivered !== undefined) {
                    let divisor = globalStore.getValue(msg.endpoint, "Divisor");
                    let multiplier = globalStore.getValue(msg.endpoint, "Multiplier");
                    if (divisor === undefined) {
                        divisor = 1;
                    }
                    if (multiplier === undefined) {
                        multiplier = 1;
                    }
                    if (endpoints) {
                        const ep = utils.getEndpointName(msg, model, meta);
                        for (let i = 0; i < endpoints.length; i++) {
                            if (i === max_endpoints) break;
                            if (ep === endpoints[i]) {
                                result[postfixWithEndpointName(name_energy[i], msg, model, meta)] =
                                    (msg.data.currentSummDelivered * multiplier) / divisor;
                                break;
                            }
                        }
                    } else {
                        result[name_energy[0]] = (msg.data.currentSummDelivered * multiplier) / divisor;
                    }
                }
                return result;
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
    ];

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Ensystec.ELPC"],
        model: "Ensystec-Leak-Protect-Zigbee",
        vendor: "Ensystec",
        description: "Leak protect controller with Zigbee module",
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    "1": 1,
                    "2": 2,
                    "3": 3,
                    "4": 4,
                    "5": 5,
                    "6": 6,
                    "7": 7,
                    "8": 8,
                    "9": 9,
                    "10": 10,
                    "11": 11,
                    "12": 12,
                    "13": 13,
                    "14": 14,
                    "15": 15,
                    "16": 16,
                    "17": 17,
                    "18": 18,
                    "19": 19,
                    "20": 20,
                    "21": 21,
                    "22": 22,
                    "23": 23,
                    "24": 24,
                    "25": 25,
                    "26": 26,
                },
            }),
            m.deviceAddCustomCluster("EnsystecLeakProtect", {
                name: "EnsystecLeakProtect",
                ID: 0x6604,
                manufacturerCode: 0x6666,
                attributes: {
                    onLine: {
                        name: "onLine",
                        ID: 0x6601,
                        type: Zcl.DataType.BOOLEAN,
                        max: 0xff,
                    },
                    leakDetect: {
                        name: "leakDetect",
                        ID: 0x6602,
                        type: Zcl.DataType.BOOLEAN,
                        max: 0xff,
                    },
                    inputConfig: {
                        name: "inputConfig",
                        ID: 0x6607,
                        type: Zcl.DataType.UINT8,
                        write: true,
                        max: 0xff,
                    },
                    batteryLow: {
                        name: "batteryLow",
                        ID: 0x6612,
                        type: Zcl.DataType.BOOLEAN,
                        max: 0xff,
                    },
                },
                commands: {
                    resetAlarm: {
                        name: "resetAlarm",
                        ID: 0x00,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("genOnOff", {
                name: "genOnOff",
                ID: 0x0006,
                attributes: {
                    positionPercent: {
                        name: "positionPercent",
                        ID: 0x6600,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: 0x6666,
                        max: 0xff,
                    },
                    electricValveConnection: {
                        name: "electricValveConnection",
                        ID: 0x6601,
                        type: Zcl.DataType.BOOLEAN,
                        manufacturerCode: 0x6666,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("seMetering", {
                name: "seMetering",
                ID: 0x0702,
                attributes: {
                    currentSummDelivered: {
                        name: "currentSummDelivered",
                        ID: 0x0000,
                        type: Zcl.DataType.UINT48,
                        write: true,
                        max: 0xffffffffffff,
                    },
                    multiplier: {
                        name: "multiplier",
                        ID: 0x0301,
                        type: Zcl.DataType.UINT24,
                        write: true,
                        max: 0xffffff,
                    },
                    divisor: {
                        name: "divisor",
                        ID: 0x0302,
                        type: Zcl.DataType.UINT24,
                        write: true,
                        max: 0xffffff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.onOff({powerOnBehavior: false, endpointNames: ["1"], description: "Power on/off"}),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1"],
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "battery_low",
                endpointName: "1",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                description: "Low battery",
                access: "STATE_GET",
            }),
            m.enumLookup({
                name: "power",
                lookup: {unknown: 0, "mains (single phase)": 1, "mains (3 phase)": 2, battery: 3},
                cluster: "genBasic",
                attribute: "powerSource",
                access: "STATE_GET",
                reporting: {min: 0, max: 65000, change: 0},
                description: "Power indicator",
            }),
            elpcResetAlarm(),
            elpcForceOpen({endpointName: "6"}),
            elpcCurrentSummDelivered({endpointNames: ["7", "8", "9", "10", "11", "12", "13", "14", "15", "16"]}),
            m.onOff({powerOnBehavior: false, endpointNames: ["2"], description: "Open/close control of electric valve(-s) on OUT1"}),
            m.numeric<"genOnOff", EnsystecDefenderOpenClose>({
                name: "position_percent",
                endpointNames: ["2"],
                access: "STATE_GET",
                unit: "%",
                cluster: "genOnOff",
                attribute: "positionPercent",
                description: "Electric valve(-s) position on OUT1",
            }),
            m.binary<"genOnOff", EnsystecDefenderOpenClose>({
                name: "electric_valve_connection_out1",
                cluster: "genOnOff",
                endpointName: "2",
                attribute: "electricValveConnection",
                access: "STATE_GET",
                valueOn: ["Connected", 1],
                valueOff: ["Not connected", 0],
                description: "Electric valve(-s) connected to OUT1",
            }),
            m.onOff({powerOnBehavior: false, endpointNames: ["3"], description: "Open/close control of electric valves on OUT2"}),
            m.numeric<"genOnOff", EnsystecDefenderOpenClose>({
                name: "position_percent",
                access: "STATE_GET",
                endpointNames: ["3"],
                unit: "%",
                cluster: "genOnOff",
                attribute: "positionPercent",
                description: "Electric valve(-s) position on OUT2",
            }),
            m.binary<"genOnOff", EnsystecDefenderOpenClose>({
                name: "electric_valve_connection_out2",
                cluster: "genOnOff",
                endpointName: "3",
                attribute: "electricValveConnection",
                access: "STATE_GET",
                valueOn: ["Connected", 1],
                valueOff: ["Not connected", 0],
                description: "Electric valve(-s) connected to OUT2",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_1_config",
                endpointName: "7",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 1 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_2_config",
                endpointName: "8",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 2 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_3_config",
                endpointName: "9",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 3 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_4_config",
                endpointName: "10",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 4 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_5_config",
                endpointName: "11",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 5 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_6_config",
                endpointName: "12",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 6 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_7_config",
                endpointName: "13",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 7 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_8_config",
                endpointName: "14",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 8 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_9_config",
                endpointName: "15",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 9 configuration",
            }),
            m.enumLookup<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_10_config",
                endpointName: "16",
                cluster: "EnsystecLeakProtect",
                attribute: "inputConfig",
                lookup: {deactivated: 0, sensor: 1, meter: 2},
                reporting: false,
                description: "Input 10 configuration",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_1_leak_detect",
                endpointName: "7",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 1",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_2_leak_detect",
                endpointName: "8",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 2",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_3_leak_detect",
                endpointName: "9",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 3",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_4_leak_detect",
                endpointName: "10",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 4",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_5_leak_detect",
                endpointName: "11",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 5",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_6_leak_detect",
                endpointName: "12",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 6",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_7_leak_detect",
                endpointName: "13",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 7",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_8_leak_detect",
                endpointName: "14",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 8",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_9_leak_detect",
                endpointName: "15",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 9",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_10_leak_detect",
                endpointName: "16",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on input 10",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_1_wire_break_control",
                endpointName: "7",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 1",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_2_wire_break_control",
                endpointName: "8",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 2",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_3_wire_break_control",
                endpointName: "9",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 3",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_4_wire_break_control",
                endpointName: "10",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 4",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_5_wire_break_control",
                endpointName: "11",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 5",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_6_wire_break_control",
                endpointName: "12",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 6",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_7_wire_break_control",
                endpointName: "13",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 7",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_8_wire_break_control",
                endpointName: "14",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 8",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_9_wire_break_control",
                endpointName: "15",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 9",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "input_10_wire_break_control",
                endpointName: "16",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Wire break control on input 10",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_1_connection_control",
                endpointName: "17",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 1",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_2_connection_control",
                endpointName: "18",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 2",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_3_connection_control",
                endpointName: "19",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 3",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_4_connection_control",
                endpointName: "20",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 4",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_5_connection_control",
                endpointName: "21",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 5",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_6_connection_control",
                endpointName: "22",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 6",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_7_connection_control",
                endpointName: "23",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 7",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_8_connection_control",
                endpointName: "24",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 8",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_9_connection_control",
                endpointName: "25",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 9",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_10_connection_control",
                endpointName: "26",
                cluster: "EnsystecLeakProtect",
                attribute: "onLine",
                valueOn: ["online", 1],
                valueOff: ["offline", 0],
                access: "STATE_GET",
                description: "Connection control on wireless channel 10",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_1_leak_detect",
                endpointName: "17",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 1",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_2_leak_detect",
                endpointName: "18",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 2",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_3_leak_detect",
                endpointName: "19",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 3",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_4_leak_detect",
                endpointName: "20",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 4",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_5_leak_detect",
                endpointName: "21",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 5",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_6_leak_detect",
                endpointName: "22",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 6",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_7_leak_detect",
                endpointName: "23",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 7",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_8_leak_detect",
                endpointName: "24",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 8",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_9_leak_detect",
                endpointName: "25",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 9",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_10_leak_detect",
                endpointName: "26",
                cluster: "EnsystecLeakProtect",
                attribute: "leakDetect",
                valueOn: ["Leak", 1],
                valueOff: ["Dry", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Leak detection on wireless channel 10",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_1_battery_low",
                endpointName: "17",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 1",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_2_battery_low",
                endpointName: "18",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 2",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_3_battery_low",
                endpointName: "19",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 3",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_4_battery_low",
                endpointName: "20",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 4",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_5_battery_low",
                endpointName: "21",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 5",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_6_battery_low",
                endpointName: "22",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 6",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_7_battery_low",
                endpointName: "23",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 7",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_8_battery_low",
                endpointName: "24",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 8",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_9_battery_low",
                endpointName: "25",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 9",
            }),
            m.binary<"EnsystecLeakProtect", EnsystecLeakSensor>({
                name: "channel_10_battery_low",
                endpointName: "26",
                cluster: "EnsystecLeakProtect",
                attribute: "batteryLow",
                valueOn: ["Low", 1],
                valueOff: ["Normal", 0],
                reporting: {min: 0, max: 65000, change: 0},
                access: "STATE_GET",
                description: "Battery level of wireless sensor on channel 10",
            }),
        ],
        meta: {},
        ota: true,
    },
];
