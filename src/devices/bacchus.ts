import * as reporting from "../lib/reporting";

import {access as ea} from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {Configure, DefinitionWithExtend, Fz, ModernExtend, Tz} from "../lib/types";

import {getEndpointName, isString, validateValue} from "../lib/utils";

const defaultReporting = {min: 0, max: 3600, change: 0};
const defaultReportingOnOff = {min: 0, max: 3600, change: 0, attribute: "onOff"};

const time_to_str_min = (time: number) => {
    const date = new Date(null);
    date.setSeconds(time);
    return date.toISOString().slice(11, 16);
};

const str_min_to_time = (strMin: string) => {
    return Number(strMin.substring(0, 2)) * 60 * 60 + Number(strMin.substring(3, 5)) * 60;
};

function timeHHMM(args: m.TextArgs): ModernExtend {
    const {name, cluster, attribute, description, zigbeeCommandOptions, endpointName, reporting, entityCategory, validate} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? "ALL"];
    const mExtend = m.text(args);

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: cluster.toString(),
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data && (!endpointName || getEndpointName(msg, model, meta) === endpointName)) {
                    return {[name]: time_to_str_min(msg.data[attributeKey])};
                }
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          const value_str = str_min_to_time(value.toString());
                          const payload = isString(attribute) ? {[attribute]: value_str} : {[attribute.ID]: {value_str, type: attribute.type}};
                          await m.determineEndpoint(entity, meta, cluster).write(cluster, payload, zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await m.determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [];
    configure.push(m.setupConfigureForBinding(cluster, "input"));

    return {...mExtend, fromZigbee, toZigbee, configure, isModernExtend: true};
}

function binaryWithOnOffCommand(args: m.BinaryArgs): ModernExtend {
    const {name, valueOn, valueOff, cluster, attribute, zigbeeCommandOptions, endpointName, reporting} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? "ALL"];

    const mExtend = m.binary(args);

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          const state = isString(meta.message[key]) ? meta.message[key].toLowerCase() : null;
                          validateValue(state, ["toggle", "off", "on"]);
                          await m.determineEndpoint(entity, meta, cluster).command(cluster, state, {}, zigbeeCommandOptions);
                          await m.determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await m.determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [];
    if (reporting) {
        configure.push(m.setupConfigureForReporting(cluster, attribute, reporting, access));
    }

    return {...mExtend, toZigbee, configure, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Presence_Sensor_v2.6"],
        model: "Presence_Sensor_v2.6",
        vendor: "Bacchus",
        description: "Bacchus presence sensor with illuminance",
        meta: {multiEndpoint: true},
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3},
            }),
            m.occupancy({
                endpointNames: ["1"],
            }),
            m.illuminance({
                reporting: defaultReporting,
            }),
            m.numeric({
                name: "target_distance",
                unit: "cm",
                cluster: "msOccupancySensing",
                attribute: {ID: 0xf005, type: 0x21},
                description: "Target distance",
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.enumLookup({
                name: "target_type",
                lookup: {None: 0, Moving: 1, Stationary: 2, "Moving and stationary": 3},
                cluster: "msOccupancySensing",
                attribute: {ID: 0xf006, type: 0x30},
                description: "Target type",
                access: "STATE",
                reporting: defaultReporting,
            }),
            timeHHMM({
                name: "local_time",
                cluster: "genTime",
                attribute: "localTime",
                description: "Local time",
                access: "STATE_GET",
            }),
            m.enumLookup({
                endpointName: "3",
                name: "led_mode",
                lookup: {Always: 0, Never: 1, Night: 2},
                cluster: "genOnOff",
                attribute: {ID: 0xf004, type: 0x30},
                description: "Led working mode",
                access: "ALL",
            }),
            m.numeric({
                name: "illuminance_threshold",
                unit: "raw",
                valueMin: 0,
                valueMax: 50000,
                cluster: "msIlluminanceMeasurement",
                attribute: {ID: 0xf001, type: 0x21},
                description: "Illuminance threshold",
                access: "ALL",
            }),
            m.numeric({
                name: "measurement_period",
                unit: "sec",
                valueMin: 0,
                valueMax: 30,
                cluster: "msOccupancySensing",
                attribute: {ID: 0xf007, type: 0x21},
                description: "Illuminance threshold",
                access: "ALL",
            }),
            timeHHMM({
                name: "min_time",
                cluster: "genTime",
                attribute: "dstStart",
                description: "Day start",
                access: "ALL",
            }),
            timeHHMM({
                name: "max_time",
                cluster: "genTime",
                attribute: "dstEnd",
                description: "Day end",
                access: "ALL",
            }),
            binaryWithOnOffCommand({
                endpointName: "1",
                name: "sensor",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Enable sensor",
                access: "ALL",
                reporting: defaultReportingOnOff,
            }),
            binaryWithOnOffCommand({
                endpointName: "2",
                name: "day_output",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Day binding output",
                access: "STATE",
                reporting: defaultReportingOnOff,
            }),
            binaryWithOnOffCommand({
                endpointName: "3",
                name: "night_output",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Night binding output",
                access: "STATE",
                reporting: defaultReportingOnOff,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // In second endpoint onOff cluster is only output, so need this:
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(device.getEndpoint(2));

            await device.getEndpoint(1).read("genTime", ["dstEnd", "dstStart"]);
            await device.getEndpoint(1).read("msIlluminanceMeasurement", [0xf001]);
            await device.getEndpoint(1).read("msOccupancySensing", [0xf007]);
            await device.getEndpoint(1).read("genOnOff", ["onOff"]);
            await device.getEndpoint(3).read("genOnOff", [0xf004]);
        },
    },
    {
        zigbeeModel: ["Flower_Sensor_v2"],
        model: "Flower_Sensor_v2",
        vendor: "Bacchus",
        description: "Flower soil moisture sensor",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1}}),
            m.soilMoisture({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.temperature({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.illuminance({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.numeric({
                name: "report_delay",
                unit: "min",
                valueMin: 1,
                valueMax: 600,
                cluster: "msSoilMoisture",
                attribute: {ID: 0x0203, type: 0x21},
                description: "Reporting interval",
                access: "STATE_SET",
            }),
            m.numeric({
                name: "threshold",
                unit: "%",
                valueMin: 0,
                valueMax: 100,
                cluster: "msSoilMoisture",
                attribute: {ID: 0x0202, type: 0x21},
                description: "Reporting interval",
                access: "STATE_SET",
            }),
            m.battery({
                voltage: true,
                voltageReportingConfig: defaultReporting,
                percentageReportingConfig: defaultReporting,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).read("msSoilMoisture", [0x0202, 0x0203]);
        },
    },
];
