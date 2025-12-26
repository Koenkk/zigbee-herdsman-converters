import type {RawClusterAttributes} from "zigbee-herdsman/dist/controller/tstype";
import type {TPartialClusterAttributes} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import {access as ea} from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {Configure, DefinitionWithExtend, Fz, ModernExtend, Tz} from "../lib/types";
import {assertNumber, determineEndpoint, getEndpointName, isString, precisionRound, validateValue} from "../lib/utils";

const defaultReporting = {min: 0, max: 3600, change: 0};
const electicityReporting = {min: 0, max: 30, change: 1};
const defaultReportingOnOff = {min: 0, max: 3600, change: 0, attribute: "onOff" as const};
const defaultReportingOOS = {min: 0, max: 3600, change: 0, attribute: "outOfService" as const};

const time_to_str_min = (time: number) => {
    const date = new Date(null);
    date.setSeconds(time);
    return date.toISOString().slice(11, 16);
};

const str_min_to_time = (strMin: string) => {
    return Number(strMin.substring(0, 2)) * 60 * 60 + Number(strMin.substring(3, 5)) * 60;
};

function timeHHMM(args: m.TextArgs<"genTime">): ModernExtend {
    const {name, cluster, attribute, zigbeeCommandOptions, endpointName} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? "ALL"];
    const mExtend = m.text(args);

    const fromZigbee = [
        {
            cluster: "genTime",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data && (!endpointName || getEndpointName(msg, model, meta) === endpointName)) {
                    return {[name]: time_to_str_min(msg.data[attributeKey] as number)};
                }
            },
        } satisfies Fz.Converter<"genTime", undefined, ["attributeReport", "readResponse"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          const value_str = str_min_to_time(value.toString());
                          const payload: TPartialClusterAttributes<"genTime"> | RawClusterAttributes = isString(attribute)
                              ? {[attribute]: value_str}
                              : {[attribute.ID]: {value: value_str, type: attribute.type}};
                          await determineEndpoint(entity, meta, cluster).write(cluster, payload, zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [];
    configure.push(m.setupConfigureForBinding(cluster, "input"));

    return {...mExtend, fromZigbee, toZigbee, configure, isModernExtend: true};
}

function binaryWithOnOffCommand(args: m.BinaryArgs<"genOnOff", undefined>): ModernExtend {
    const {name, cluster, attribute, zigbeeCommandOptions, endpointName, reporting} = args;
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
                          await determineEndpoint(entity, meta, cluster).command(cluster, state as "toggle" | "off" | "on", {}, zigbeeCommandOptions);
                          await determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [];
    if (reporting) {
        configure.push(m.setupConfigureForReporting(cluster, attribute, {config: reporting, access, endpointNames: [endpointName]}));
    }

    return {...mExtend, toZigbee, configure, isModernExtend: true};
}

function energy(args: m.NumericArgs<"seMetering">): ModernExtend {
    const {name, cluster, attribute, zigbeeCommandOptions, reporting, scale, precision, endpointNames} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? "ALL"];
    const mExtend = m.numeric(args);

    const fromZigbee = [
        {
            cluster: "seMetering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data) {
                    let value = (msg.data[attributeKey] as number) & 0xffffffff;
                    assertNumber(value);

                    if (scale !== undefined) {
                        value = typeof scale === "number" ? value / scale : scale(value, "from");
                    }
                    assertNumber(value);
                    if (precision != null) value = precisionRound(value, precision);

                    return {[name]: value};
                }
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          assertNumber(value, key);
                          let payloadValue = value;
                          if (scale !== undefined) {
                              payloadValue = typeof scale === "number" ? payloadValue * scale : scale(payloadValue, "to");
                          }
                          assertNumber(payloadValue);
                          if (precision != null) payloadValue = precisionRound(payloadValue, precision);
                          const payload: TPartialClusterAttributes<"genTime"> | RawClusterAttributes = isString(attribute)
                              ? {[attribute]: payloadValue}
                              : {[attribute.ID]: {value: payloadValue, type: attribute.type}};
                          await determineEndpoint(entity, meta, cluster).write(cluster, payload, zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [];
    configure.push(m.setupConfigureForBinding(cluster, "input"));
    if (reporting) {
        configure.push(m.setupConfigureForReporting(cluster, attribute, {config: reporting, access, endpointNames}));
    }

    return {...mExtend, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mercury_Counter"],
        model: "Mercury_Counter",
        description: "Zigbee Mercury electricity meter",
        vendor: "Bacchus",
        extend: [
            m.electricityMeter({
                cluster: "electrical",
                electricalMeasurementType: "ac",
                voltage: electicityReporting,
                current: electicityReporting,
                power: electicityReporting,
            }),
            energy({
                name: "energy_t1",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier1SummDelivered",
                description: "Energy on tariff 1",
                access: "STATE_GET",
                scale: 100,
                precision: 2,
                reporting: electicityReporting,
            }),
            energy({
                name: "energy_t2",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier2SummDelivered",
                description: "Energy on tariff 2",
                access: "STATE_GET",
                scale: 100,
                precision: 2,
                reporting: electicityReporting,
            }),
            energy({
                name: "energy_t3",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier3SummDelivered",
                description: "Energy on tariff 3",
                access: "STATE_GET",
                scale: 100,
                precision: 2,
                reporting: electicityReporting,
            }),
            energy({
                name: "energy_t4",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier4SummDelivered",
                description: "Energy on tariff 4",
                access: "STATE_GET",
                scale: 100,
                precision: 2,
                reporting: electicityReporting,
            }),
            m.numeric({
                name: "measurement_period",
                unit: "sec",
                valueMin: 10,
                valueMax: 600,
                cluster: "seMetering",
                attribute: {ID: 0xf002, type: 0x21},
                description: "Measurement Period",
                access: "ALL",
            }),
            m.numeric({
                name: "device_address",
                cluster: "seMetering",
                attribute: {ID: 0xf001, type: 0x23},
                description: "Device Address",
                access: "ALL",
                valueMin: 0,
                valueMax: 99999999,
            }),
            m.temperature({
                precision: 2,
                reporting: defaultReporting,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(2).read("seMetering", [0xf001, 0xf002]);
        },
    },
    {
        zigbeeModel: ["Mercury_3ph_Counter"],
        model: "Mercury_3ph_Counter",
        description: "Zigbee Mercury 3 Phase electricity meter",
        vendor: "Bacchus",
        extend: [
            m.electricityMeter({
                cluster: "electrical",
                electricalMeasurementType: "ac",
                voltage: electicityReporting,
                current: electicityReporting,
                power: electicityReporting,
                threePhase: true,
            }),
            energy({
                name: "energy_t1",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier1SummDelivered",
                description: "Energy on tariff 1",
                access: "STATE_GET",
                scale: 1000,
                precision: 3,
                reporting: electicityReporting,
            }),
            energy({
                name: "energy_t2",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier2SummDelivered",
                description: "Energy on tariff 2",
                access: "STATE_GET",
                scale: 1000,
                precision: 3,
                reporting: electicityReporting,
            }),
            energy({
                name: "energy_t3",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier3SummDelivered",
                description: "Energy on tariff 3",
                access: "STATE_GET",
                scale: 1000,
                precision: 3,
                reporting: electicityReporting,
            }),
            energy({
                name: "energy_t4",
                unit: "kWh",
                cluster: "seMetering",
                attribute: "currentTier4SummDelivered",
                description: "Energy on tariff 4",
                access: "STATE_GET",
                scale: 1000,
                precision: 3,
                reporting: electicityReporting,
            }),
            m.numeric({
                name: "measurement_period",
                unit: "sec",
                valueMin: 10,
                valueMax: 600,
                cluster: "seMetering",
                attribute: {ID: 0xf002, type: 0x21},
                description: "Measurement Period",
                access: "ALL",
            }),
            m.numeric({
                name: "device_address",
                cluster: "seMetering",
                attribute: {ID: 0xf001, type: 0x23},
                description: "Device Address",
                access: "ALL",
                valueMin: 0,
                valueMax: 99999999,
            }),
            m.temperature({
                precision: 2,
                reporting: defaultReporting,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(2).read("seMetering", [0xf001, 0xf002]);
        },
    },
    {
        fingerprint: [
            {modelID: "Water_Station", manufacturerName: "Bacchus"},
            {modelID: "Water_Station.Modkam", manufacturerName: "Bacchus"},
        ],
        model: "Water_Station",
        vendor: "Bacchus",
        description: "Water_Station",
        meta: {multiEndpoint: true},
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6},
            }),
            binaryWithOnOffCommand({
                endpointName: "1",
                name: "pump_1",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Enable first pump",
                access: "ALL",
                reporting: defaultReportingOnOff,
            }),
            m.numeric({
                endpointNames: ["1"],
                name: "pump_1_duration",
                unit: "sec",
                valueMin: 0,
                valueMax: 600,
                cluster: "genOnOff",
                attribute: {ID: 0xf003, type: 0x21},
                description: "Duration of pump 1",
                access: "ALL",
            }),
            binaryWithOnOffCommand({
                endpointName: "2",
                name: "pump_2",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Enable second pump",
                access: "ALL",
                reporting: defaultReportingOnOff,
            }),
            m.numeric({
                endpointNames: ["2"],
                name: "pump_3_duration",
                unit: "sec",
                valueMin: 0,
                valueMax: 600,
                cluster: "genOnOff",
                attribute: {ID: 0xf003, type: 0x21},
                description: "Duration of pump 2",
                access: "ALL",
            }),
            binaryWithOnOffCommand({
                endpointName: "3",
                name: "pump_3",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Enable third pump",
                access: "ALL",
                reporting: defaultReportingOnOff,
            }),
            m.numeric({
                endpointNames: ["3"],
                name: "pump_3_duration",
                unit: "sec",
                valueMin: 0,
                valueMax: 600,
                cluster: "genOnOff",
                attribute: {ID: 0xf003, type: 0x21},
                description: "Duration of pump 3",
                access: "ALL",
            }),
            binaryWithOnOffCommand({
                endpointName: "4",
                name: "pump_all",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Enable all pumps",
                access: "ALL",
                reporting: defaultReportingOnOff,
            }),
            binaryWithOnOffCommand({
                endpointName: "5",
                name: "beeper",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: "onOff",
                description: "Beeper",
                access: "ALL",
                reporting: defaultReportingOnOff,
            }),
            m.binary({
                endpointName: "1",
                name: "beeper_on_leak",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: {ID: 0xf005, type: 0x10},
                description: "Beeper",
                access: "ALL",
            }),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1"],
                manufacturerZoneAttributes: [
                    {
                        bit: 1,
                        name: "full",
                        valueOn: true,
                        valueOff: false,
                        description: "Indicates whether the water tank is full",
                    },
                ],
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ["ssIasZone"]);
        },
    },
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
        zigbeeModel: ["Presence_Sensor_v2"],
        model: "Presence_Sensor_v2",
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
                cluster: "msIlluminanceLevelSensing",
                attribute: {ID: 0x0010, type: 0x21},
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
            await device.getEndpoint(1).read("msIlluminanceLevelSensing", [0x0010]);
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
    {
        zigbeeModel: ["Bacchus Water level meter"],
        model: "Bacchus Water level meter",
        vendor: "Bacchus",
        description: "Bacchus tank water level sensor",
        extend: [
            m.numeric({
                name: "water_level",
                unit: "cm",
                scale: 10,
                cluster: "genAnalogInput",
                attribute: "presentValue",
                description: "Current water level in cm",
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.binary({
                name: "out_of_service",
                valueOn: ["True", 1],
                valueOff: ["False", 0],
                cluster: "genAnalogInput",
                attribute: "outOfService",
                description: "Level is out if service",
                access: "STATE",
                reporting: defaultReportingOOS,
            }),
            m.numeric({
                name: "filling",
                unit: "%",
                cluster: "genAnalogInput",
                attribute: {ID: 0xf006, type: 0x39},
                description: "Tank filling",
                access: "STATE",
            }),
            m.temperature({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.numeric({
                name: "tank_height",
                unit: "cm",
                valueMin: 0,
                valueMax: 450,
                scale: 10,
                cluster: "genAnalogInput",
                attribute: {ID: 0xf005, type: 0x0039},
                description: "Water tank height in cm",
                access: "STATE_SET",
            }),
            m.numeric({
                name: "alarm_min_threshold",
                unit: "%",
                valueMin: 0,
                valueMax: 100,
                cluster: "genAnalogInput",
                attribute: "minPresentValue",
                description: "Min threshold for alarm binding",
                access: "STATE_SET",
            }),
            m.numeric({
                name: "alarm_max_threshold",
                unit: "%",
                valueMin: 0,
                valueMax: 100,
                cluster: "genAnalogInput",
                attribute: "maxPresentValue",
                description: "Max threshold for alarm binding",
                access: "STATE_SET",
            }),
            m.binary({
                name: "invert_threshold",
                valueOn: ["True", 1],
                valueOff: ["False", 0],
                cluster: "genOnOff",
                attribute: {ID: 0xf008, type: 0x0010},
                description: "Invert thresholds for on and off commands",
                access: "STATE_SET",
            }),
            m.numeric({
                name: "measurment_period",
                unit: "min",
                valueMin: 0,
                valueMax: 3600,
                cluster: "genAnalogInput",
                attribute: {ID: 0xf007, type: 0x0021},
                description: "Max threshold for alarm binding",
                access: "STATE_SET",
            }),
            m.battery({
                voltage: true,
                voltageReportingConfig: defaultReporting,
                percentageReportingConfig: defaultReporting,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).read("genAnalogInput", [0xf005, 0xf007, "minPresentValue", "maxPresentValue", "outOfService"]);
            await device.getEndpoint(1).read("genOnOff", [0xf008]);
        },
    },
    {
        zigbeeModel: ["Duck Pool Thermometer"],
        model: "Duck Pool Thermometer",
        vendor: "Bacchus",
        description: "Bacchus Duck pool thermomemeter",
        extend: [
            m.temperature({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.numeric({
                name: "measurment_period",
                unit: "sec",
                valueMin: 0,
                valueMax: 3600,
                cluster: "msTemperatureMeasurement",
                attribute: {ID: 0xf002, type: 0x21},
                description: "Temperature measurement period",
                access: "STATE_SET",
            }),
            m.numeric({
                name: "threshold",
                unit: "°C",
                valueMin: 0,
                valueMax: 30,
                cluster: "msTemperatureMeasurement",
                attribute: {ID: 0xf001, type: 0x21},
                description: "Min threshold for alarm binding",
                access: "STATE_SET",
            }),
            m.battery({
                voltage: true,
                voltageReportingConfig: defaultReporting,
                percentageReportingConfig: defaultReporting,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).read("msTemperatureMeasurement", [0xf001, 0xf002]);
            await device.getEndpoint(1).read("genAnalogInput", [0xf005, 0xf007, "minPresentValue", "maxPresentValue"]);
        },
    },
];
