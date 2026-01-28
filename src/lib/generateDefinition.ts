import type {Models as ZHModels} from "zigbee-herdsman";

import {Zcl} from "zigbee-herdsman";
import type {Cluster} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";

import {logger} from "./logger";
import * as m from "./modernExtend";
import * as philips from "./philips";
import type {DefinitionWithExtend, ModernExtend, Zh} from "./types";
import {getClusterAttributeValue} from "./utils";

const NS = "zhc:gendef";

interface GeneratedExtend {
    getExtend(): ModernExtend;
    getSource(): string;
    lib?: string;
}

// Generator allows to define instances of GeneratedExtend that have typed arguments to extender.
class ExtendGenerator<T> implements GeneratedExtend {
    extend: (a: T) => ModernExtend;
    args?: T;
    source: string;
    lib?: string;

    constructor(args: {extend: (a: T) => ModernExtend; args?: T; source: string; lib?: string}) {
        this.extend = args.extend;
        this.args = args.args;
        this.source = args.source;
        this.lib = args.lib;
    }

    getExtend(): ModernExtend {
        return this.extend(this.args);
    }

    getSource(): string {
        let jsonArgs = JSON.stringify(this.args);
        if (!this.args || jsonArgs === "{}") {
            jsonArgs = "";
        }

        return `${this.source}(${jsonArgs})`;
    }
}

// Device passed as the first argument mostly to check
// if passed endpoint(if only one) is the first endpoint in the device.
type ExtenderGenerator = (device: Zh.Device, endpoints: Zh.Endpoint[]) => Promise<GeneratedExtend[]> | GeneratedExtend[];
type Extender = [string[], ExtenderGenerator];

type DefinitionWithZigbeeModel = DefinitionWithExtend & {zigbeeModel: string[]};

// If generator will have endpoint argument - generator implementation
// should not provide it if only the first device endpoint is passed in.
// If multiple endpoints provided(maybe including the first device endpoint) -
// they all should be passed as an argument, where possible, to be explicit.
const INPUT_EXTENDERS: Extender[] = [
    [
        ["msTemperatureMeasurement"],
        async (d, eps) => [new ExtendGenerator({extend: m.temperature, args: maybeEndpointArgs(d, eps), source: "temperature"})],
    ],
    [["msPressureMeasurement"], async (d, eps) => [new ExtendGenerator({extend: m.pressure, args: maybeEndpointArgs(d, eps), source: "pressure"})]],
    [["msRelativeHumidity"], async (d, eps) => [new ExtendGenerator({extend: m.humidity, args: maybeEndpointArgs(d, eps), source: "humidity"})]],
    [["msCO2"], async (d, eps) => [new ExtendGenerator({extend: m.co2, args: maybeEndpointArgs(d, eps), source: "co2"})]],
    [["genPowerCfg"], async (d, eps) => [new ExtendGenerator({extend: m.battery, source: "battery"})]],
    [["genOnOff", "genLevelCtrl", "lightingColorCtrl"], extenderOnOffLight],
    [["seMetering", "haElectricalMeasurement"], extenderElectricityMeter],
    [["closuresDoorLock"], extenderLock],
    [
        ["msIlluminanceMeasurement"],
        async (d, eps) => [new ExtendGenerator({extend: m.illuminance, args: maybeEndpointArgs(d, eps), source: "illuminance"})],
    ],
    [["msOccupancySensing"], async (d, eps) => [new ExtendGenerator({extend: m.occupancy, source: "occupancy"})]],
    [
        ["ssIasZone"],
        async (d, eps) => [
            new ExtendGenerator({
                extend: m.iasZoneAlarm,
                args: {
                    zoneType: "generic",
                    zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"],
                },
                source: "iasZoneAlarm",
            }),
        ],
    ],
    [["ssIasWd"], async (d, eps) => [new ExtendGenerator({extend: m.iasWarning, source: "iasWarning"})]],
    [
        ["genDeviceTempCfg"],
        async (d, eps) => [new ExtendGenerator({extend: m.deviceTemperature, args: maybeEndpointArgs(d, eps), source: "deviceTemperature"})],
    ],
    [["pm25Measurement"], async (d, eps) => [new ExtendGenerator({extend: m.pm25, args: maybeEndpointArgs(d, eps), source: "pm25"})]],
    [["msFlowMeasurement"], async (d, eps) => [new ExtendGenerator({extend: m.flow, args: maybeEndpointArgs(d, eps), source: "flow"})]],
    [["msSoilMoisture"], async (d, eps) => [new ExtendGenerator({extend: m.soilMoisture, args: maybeEndpointArgs(d, eps), source: "soilMoisture"})]],
    [
        ["closuresWindowCovering"],
        async (d, eps) => [new ExtendGenerator({extend: m.windowCovering, args: {controls: ["lift", "tilt"]}, source: "windowCovering"})],
    ],
    [["genBinaryInput"], extenderBinaryInput],
    [["genBinaryOutput"], extenderBinaryOutput],
    [["genAnalogInput"], extenderAnalogInput],
    [["genAnalogOutput"], extenderAnalogOutput],
];

const OUTPUT_EXTENDERS: Extender[] = [
    [["genOnOff"], async (d, eps) => [new ExtendGenerator({extend: m.commandsOnOff, args: maybeEndpointArgs(d, eps), source: "commandsOnOff"})]],
    [
        ["genLevelCtrl"],
        async (d, eps) => [new ExtendGenerator({extend: m.commandsLevelCtrl, args: maybeEndpointArgs(d, eps), source: "commandsLevelCtrl"})],
    ],
    [
        ["lightingColorCtrl"],
        async (d, eps) => [new ExtendGenerator({extend: m.commandsColorCtrl, args: maybeEndpointArgs(d, eps), source: "commandsColorCtrl"})],
    ],
    [
        ["closuresWindowCovering"],
        async (d, eps) => [
            new ExtendGenerator({extend: m.commandsWindowCovering, args: maybeEndpointArgs(d, eps), source: "commandsWindowCovering"}),
        ],
    ],
];

function generateSource(definition: DefinitionWithZigbeeModel, generatedExtend: GeneratedExtend[]): string {
    const imports = [...new Set(generatedExtend.map((e) => e.lib ?? "modernExtend"))];
    const importsStr = imports.map((e) => `import * as ${e === "modernExtend" ? "m" : e} from 'zigbee-herdsman-converters/lib/${e}';`).join("\n");
    const meta = definition.meta ? `\n    meta: ${JSON.stringify(definition.meta)},` : "";
    return `${importsStr}

export default {
    zigbeeModel: ['${definition.zigbeeModel}'],
    model: '${definition.model}',
    vendor: '${definition.vendor}',
    description: 'Automatically generated definition',
    extend: [${generatedExtend.map((e) => `${e.lib ?? "m"}.${e.getSource()}`).join(", ")}],${meta}
};
`;
}

function generateGreenPowerSource(definition: DefinitionWithExtend, ieeeAddr: string): string {
    return `import {genericGreenPower} from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    fingerprint: [{modelID: '${definition.model}', ieeeAddr: new RegExp('^${ieeeAddr}$')}],
    model: '${definition.model}',
    vendor: '${definition.vendor}',
    description: 'Automatically generated definition for Green Power',
    extend: [genericGreenPower()],
};`;
}

export async function generateDefinition(device: Zh.Device): Promise<{externalDefinitionSource: string; definition: DefinitionWithExtend}> {
    if (device.type === "GreenPower") {
        return generateGreenPowerDefinition(device);
    }

    // Map cluster to all endpoints that have this cluster.
    const mapClusters = (endpoint: ZHModels.Endpoint, clusters: Cluster[], clusterMap: Map<string, ZHModels.Endpoint[]>) => {
        for (const cluster of clusters) {
            if (!clusterMap.has(cluster.name)) {
                clusterMap.set(cluster.name, []);
            }

            const endpointsWithCluster = clusterMap.get(cluster.name);
            endpointsWithCluster.push(endpoint);
        }
    };

    const knownInputClusters = INPUT_EXTENDERS.flatMap((ext) => ext[0]);
    const knownOutputClusters = OUTPUT_EXTENDERS.flatMap((ext) => ext[0]);

    const inputClusterMap = new Map<string, ZHModels.Endpoint[]>();
    const outputClusterMap = new Map<string, ZHModels.Endpoint[]>();

    for (const endpoint of device.endpoints) {
        // Filter clusters to leave only the ones that we can generate extenders for.
        const inputClusters = endpoint.getInputClusters().filter((c) => knownInputClusters.find((known) => known === c.name));
        const outputClusters = endpoint.getOutputClusters().filter((c) => knownOutputClusters.find((known) => known === c.name));

        mapClusters(endpoint, inputClusters, inputClusterMap);
        mapClusters(endpoint, outputClusters, outputClusterMap);
    }
    // Generate extenders
    const usedExtenders: Extender[] = [];
    const generatedExtend: GeneratedExtend[] = [];

    const addGenerators = async (clusterName: string, endpoints: Zh.Endpoint[], extenders: Extender[]) => {
        const extender = extenders.find((e) => e[0].includes(clusterName));
        if (!extender || usedExtenders.includes(extender)) {
            return;
        }
        usedExtenders.push(extender);
        generatedExtend.push(...(await extender[1](device, endpoints)));
    };

    for (const [cluster, endpoints] of inputClusterMap) {
        await addGenerators(cluster, endpoints, INPUT_EXTENDERS);
    }

    for (const [cluster, endpoints] of outputClusterMap) {
        await addGenerators(cluster, endpoints, OUTPUT_EXTENDERS);
    }

    const extenders = generatedExtend.map((e) => e.getExtend());
    // Generated definition below will provide this.
    for (const extender of extenders) {
        extender.endpoint = undefined;
    }

    // Currently multiEndpoint is enabled if device has more then 1 endpoint.
    // It is possible to better check if device should be considered multiEndpoint
    // based, for example, on generator arguments(i.e. presence of "endpointNames"),
    // but this will be enough for now.
    const endpointsWithoutGreenPower = device.endpoints.filter((e) => e.ID !== 242);
    const multiEndpoint = endpointsWithoutGreenPower.length > 1;

    if (multiEndpoint) {
        const endpoints: {[n: string]: number} = {};
        for (const endpoint of endpointsWithoutGreenPower) {
            endpoints[endpoint.ID.toString()] = endpoint.ID;
        }
        // Add to beginning for better visibility.
        generatedExtend.unshift(new ExtendGenerator({extend: m.deviceEndpoints, args: {endpoints}, source: "deviceEndpoints"}));
        extenders.unshift(generatedExtend[0].getExtend());
    }

    const definition: DefinitionWithExtend = {
        zigbeeModel: [device.modelID],
        model: device.modelID ?? "",
        vendor: device.manufacturerName ?? "",
        description: "Automatically generated definition",
        extend: extenders,
        generated: true,
    };

    const externalDefinitionSource = generateSource(definition, generatedExtend);
    return {externalDefinitionSource, definition};
}

export function generateGreenPowerDefinition(device: Zh.Device): {externalDefinitionSource: string; definition: DefinitionWithExtend} {
    const definition: DefinitionWithExtend = {
        fingerprint: [{modelID: device.modelID, ieeeAddr: new RegExp(`^${device.ieeeAddr}$`)}],
        model: device.modelID ?? "",
        vendor: device.manufacturerName ?? "",
        description: "Automatically generated definition for Green Power",
        extend: [m.genericGreenPower()],
        generated: true,
    };

    const externalDefinitionSource = generateGreenPowerSource(definition, device.ieeeAddr);
    return {externalDefinitionSource, definition};
}

function stringifyEps(endpoints: ZHModels.Endpoint[]): string[] {
    return endpoints.map((e) => e.ID.toString());
}

// This function checks if provided array of endpoints contain
// only first device endpoint, which is passed in as `firstEndpoint`.
function onlyFirstDeviceEnpoint(device: Zh.Device, endpoints: ZHModels.Endpoint[]): boolean {
    return endpoints.length === 1 && endpoints[0].ID === device.endpoints[0].ID;
}

// maybeEndpoints returns either `toExtend` if only first device endpoint is provided
// as `endpoints`, or `endpointNames` with `toExtend`.
// This allows to drop unnecessary `endpointNames` argument if it is not needed.
function maybeEndpointArgs<T>(device: Zh.Device, endpoints: Zh.Endpoint[], toExtend?: T): T | undefined {
    if (onlyFirstDeviceEnpoint(device, endpoints)) {
        return toExtend;
    }

    return {endpointNames: stringifyEps(endpoints), ...toExtend};
}

async function extenderLock(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    // TODO: Support multiple endpoints
    if (endpoints.length > 1) {
        logger.warning("extenderLock can accept only one endpoint", NS);
    }

    const endpoint = endpoints[0];

    const pinCodeCount = await getClusterAttributeValue(endpoint, "closuresDoorLock", "numOfPinUsersSupported", 50);
    return [new ExtendGenerator({extend: m.lock, args: {pinCodeCount}, source: "lock"})];
}

async function extenderOnOffLight(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];

    const lightEndpoints = endpoints.filter((e) => e.supportsInputCluster("lightingColorCtrl") || e.supportsInputCluster("genLevelCtrl"));
    const onOffEndpoints = endpoints.filter((e) => lightEndpoints.findIndex((ep) => e.ID === ep.ID) === -1);

    if (onOffEndpoints.length !== 0) {
        let endpointNames: string[] | undefined;
        if (!onlyFirstDeviceEnpoint(device, onOffEndpoints)) {
            endpointNames = onOffEndpoints.map((e) => e.ID.toString());
        }
        generated.push(new ExtendGenerator({extend: m.onOff, args: {powerOnBehavior: false, endpointNames}, source: "onOff"}));
    }

    for (const endpoint of lightEndpoints) {
        let endpointNames: string[] | undefined;
        if (!onlyFirstDeviceEnpoint(device, lightEndpoints)) {
            endpointNames = lightEndpoints.map((e) => e.ID.toString());
        }
        // In case read fails, support all features with 31
        let colorCapabilities = 0;
        if (endpoint.supportsInputCluster("lightingColorCtrl")) {
            colorCapabilities = await getClusterAttributeValue(endpoint, "lightingColorCtrl", "colorCapabilities", 31);
        }
        const supportsHueSaturation = (colorCapabilities & (1 << 0)) > 0;
        const supportsEnhancedHueSaturation = (colorCapabilities & (1 << 1)) > 0;
        const supportsColorXY = (colorCapabilities & (1 << 3)) > 0;
        const supportsColorTemperature = (colorCapabilities & (1 << 4)) > 0;
        const args: m.LightArgs = {};
        args.endpointNames = endpointNames;

        if (supportsColorTemperature) {
            const minColorTemp = await getClusterAttributeValue(endpoint, "lightingColorCtrl", "colorTempPhysicalMin", 150);
            const maxColorTemp = await getClusterAttributeValue(endpoint, "lightingColorCtrl", "colorTempPhysicalMax", 500);
            args.colorTemp = {range: [minColorTemp, maxColorTemp]};
        }

        if (supportsColorXY) {
            args.color = true;
            if (supportsHueSaturation || supportsEnhancedHueSaturation) {
                args.color = {};
                if (supportsHueSaturation) args.color.modes = ["xy", "hs"];
                if (supportsEnhancedHueSaturation) args.color.enhancedHue = true;
            }
        }

        if (endpoint.getDevice().manufacturerID === Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V) {
            generated.push(new ExtendGenerator({extend: philips.m.light, args, source: "m.light", lib: "philips"}));
        } else {
            generated.push(new ExtendGenerator({extend: m.light, args, source: "light"}));
        }
    }

    return generated;
}

async function extenderElectricityMeter(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    // TODO: Support multiple endpoints
    if (endpoints.length > 1) {
        logger.warning("extenderElectricityMeter can accept only one endpoint", NS);
    }

    const endpoint = endpoints[0];

    const metering = endpoint.supportsInputCluster("seMetering");
    const electricalMeasurements = endpoint.supportsInputCluster("haElectricalMeasurement");
    const args: m.ElectricityMeterArgs = {};
    if (!metering || !electricalMeasurements) {
        args.cluster = metering ? "metering" : "electrical";
    }

    if (args.cluster === "electrical") {
        // If this value will be 0 then the value of 'args.electricalMeasurementType' will not be changed.
        const measurementType = await getClusterAttributeValue(endpoint, "haElectricalMeasurement", "measurementType", 0);
        // MeasurementType will have bit on index 6 set for DC measurement.
        const isDCMeasureType = ((measurementType >> 6) & 1) === 1;
        // Any of the first 6 bits would mean AC measurements.
        const isACMeasureType = (measurementType & 0b111111) !== 0;

        if (isDCMeasureType) {
            args.electricalMeasurementType = "dc";
        }
        if (isACMeasureType) {
            args.electricalMeasurementType = "ac";
        }
        if (isDCMeasureType && isACMeasureType) {
            args.electricalMeasurementType = "both";
        }
    }

    if (endpoint.ID !== 1) {
        args.endpointNames = stringifyEps([endpoint]);
    }

    return [new ExtendGenerator({extend: m.electricityMeter, args, source: "electricityMeter"})];
}

async function extenderBinaryInput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    let endpointName: string | undefined;
    for (const endpoint of endpoints) {
        if (!onlyFirstDeviceEnpoint(device, endpoints)) {
            endpointName = endpoint.ID.toString();
        }
        const name = await getClusterAttributeValue(endpoint, "genBinaryInput", "description", `binary_input_${endpoint.ID}`);
        let label: string | undefined;
        if (name !== `binary_input_${endpoint.ID}`) {
            label = name;
        }
        const description = `Binary Input ${name} on endpoint ${endpoint.ID}`;
        const args: m.BinaryArgs<"genBinaryInput"> = {
            name: name.replace(/\s+/g, "_").toLowerCase(),
            label: label,
            cluster: "genBinaryInput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: description,
            access: "STATE_GET",
            endpointName: endpointName,
        };
        generated.push(new ExtendGenerator({extend: m.binary, args, source: "binary"}));
    }
    return generated;
}

async function extenderBinaryOutput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    let endpointName: string | undefined;
    for (const endpoint of endpoints) {
        if (!onlyFirstDeviceEnpoint(device, endpoints)) {
            endpointName = endpoint.ID.toString();
        }
        const name = await getClusterAttributeValue(endpoint, "genBinaryOutput", "description", `binary_output_${endpoint.ID}`);
        let label: string | undefined;
        if (name !== `binary_output_${endpoint.ID}`) {
            label = name;
        }
        const description = `Binary Output ${name} on endpoint ${endpoint.ID}`;
        const args: m.BinaryArgs<"genBinaryOutput"> = {
            name: name.replace(/\s+/g, "_").toLowerCase(),
            label: label,
            cluster: "genBinaryOutput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: description,
            access: "ALL",
            endpointName: endpointName,
        };
        generated.push(new ExtendGenerator({extend: m.binary, args, source: "binary"}));
    }
    return generated;
}

function getUnitfromApplicationType(applicationType: number): string | undefined {
    // Map of applicationType to unit strings. Only take type ( Bits 16 to 23 ) into account.
    const type = (applicationType >> 16) & 0xff;
    const applicationTypeMap: {[key: number]: string} = {
        0: "°C", // Temp_Degrees_C
        1: "%", // Relative_Humidity_Percent
        2: "Pa", // Pressure_Pascal
        3: "L/s", // Flow_Liters_Per_Sec
        4: "%", // Percentage
        5: "ppm", // Parts_Per_Million
        6: "rpm", // Rotational_Speed_RPM
        7: "A", // Current_Amps
        8: "Hz", // Frequency_Hz
        9: "W", // Power_Watts
        10: "kW", // Power_Kilo_Watts
        11: "kWh", // Energy_Kilo_Watt_Hours
        12: undefined, // Count
        13: "kJ/kg", // Enthalpy_KJoules_Per_Kg
        14: "s", // Time_Seconds
    };

    return applicationTypeMap[type];
}

function getUnitfromBACnetUnit(bacnetUnit: number): string | undefined {
    const bacnetUnitMap: {[key: number]: string | undefined} = {
        0: "m²",
        1: "ft²",
        2: "mA",
        3: "A",
        4: "Ω",
        5: "V",
        6: "kV",
        7: "MV",
        8: "VA",
        9: "kVA",
        10: "MVA",
        11: "var",
        12: "kvar",
        13: "Mvar",
        14: "°phase",
        15: "pf",
        16: "J",
        17: "kJ",
        18: "Wh",
        19: "kWh",
        20: "Btu",
        21: "therm",
        22: "ton·h",
        23: "J/kg",
        24: "Btu/lb",
        25: "cycles/h",
        26: "cycles/min",
        27: "Hz",
        28: "g/kg",
        29: "%",
        30: "mm",
        31: "m",
        32: "in",
        33: "ft",
        34: "W/ft²",
        35: "W/m²",
        36: "lm",
        37: "lx",
        38: "fc",
        39: "kg",
        40: "lb",
        41: "tons",
        42: "kg/s",
        43: "kg/min",
        44: "kg/h",
        45: "lb/min",
        46: "lb/h",
        47: "W",
        48: "kW",
        49: "MW",
        50: "Btu/h",
        51: "hp",
        52: "ton",
        53: "Pa",
        54: "kPa",
        55: "bar",
        56: "psi",
        57: "cm H₂O",
        58: "in H₂O",
        59: "mmHg",
        60: "cm Hg",
        61: "in Hg",
        62: "°C",
        63: "K",
        64: "°F",
        65: "°C·d",
        66: "°F·d",
        67: "years",
        68: "months",
        69: "weeks",
        70: "days",
        71: "hours",
        72: "minutes",
        73: "seconds",
        74: "m/s",
        75: "km/h",
        76: "ft/s",
        77: "ft/min",
        78: "mph",
        79: "ft³",
        80: "m³",
        81: "imp gal",
        82: "L",
        83: "gal",
        84: "ft³/min",
        85: "m³/s",
        86: "imp gal/min",
        87: "L/s",
        88: "L/min",
        89: "gal/min",
        90: "°",
        91: "°C/h",
        92: "°C/min",
        93: "°F/h",
        94: "°F/min",
        95: undefined,
        96: "ppm",
        97: "ppb",
        98: "%",
        99: "%/s",
        100: "1/min",
        101: "1/s",
        102: "psi/°F",
        103: "rad",
        104: "rpm",
        105: "currency",
        106: "currency",
        107: "currency",
        108: "currency",
        109: "currency",
        110: "currency",
        111: "currency",
        112: "currency",
        113: "currency",
        114: "currency",
        115: "in²",
        116: "cm²",
        117: "Btu/lb",
        118: "cm",
        119: "lb/s",
        120: "Δ°F",
        121: "ΔK",
        122: "kΩ",
        123: "MΩ",
        124: "mV",
        125: "kJ/kg",
        126: "MJ",
        127: "J/K",
        128: "J/(kg·K)",
        129: "kHz",
        130: "MHz",
        131: "1/h",
        132: "mW",
        133: "hPa",
        134: "mbar",
        135: "m³/h",
        136: "L/h",
        137: "kWh/m²",
        138: "kWh/ft²",
        139: "MJ/m²",
        140: "MJ/ft²",
        141: "W/(m²·K)",
        142: "ft³/s",
        143: "% obscuration/ft",
        144: "% obscuration/m",
        145: "mΩ",
        146: "MWh",
        147: "kBtu",
        148: "MBtu",
        149: "kJ/kg_dry",
        150: "MJ/kg_dry",
        151: "kJ/K",
        152: "MJ/K",
        153: "N",
        154: "g/s",
        155: "g/min",
        156: "tons/h",
        157: "kBtu/h",
        158: "1/100 s",
        159: "ms",
        160: "N·m",
        161: "mm/s",
        162: "mm/min",
        163: "m/min",
        164: "m/h",
        165: "m³/min",
        166: "m/s²",
        167: "A/m",
        168: "A/m²",
        169: "A·m²",
        170: "F",
        171: "H",
        172: "Ω·m",
        174: "S/m",
        175: "T",
        176: "V/K",
        177: "V/m",
        178: "Wb",
        179: "cd",
        180: "cd/m²",
        181: "K/h",
        182: "K/min",
        183: "J·s",
        184: "rad/s",
        185: "m²/N",
        186: "kg/m³",
        187: "N·s",
        188: "N/m",
        189: "W/(m·K)",
        190: "µS/cm",
        191: "ft³/h",
        192: "gal/h",
        193: "km",
        194: "µm",
        195: "g",
        196: "mg",
        197: "mL",
        198: "mL/s",
        199: "dB",
        200: "dBm",
        201: "dBV",
        202: "mS/cm",
        203: "var·h",
        204: "kvar·h",
        205: "Mvar·h",
        206: "mm H₂O",
        207: "‰",
        208: "g/g",
        209: "kg/kg",
        210: "g/kg",
        211: "mg/g",
        212: "mg/kg",
        213: "g/mL",
        214: "g/L",
        215: "mg/L",
        216: "µg/L",
        217: "g/m³",
        218: "mg/m³",
        219: "µg/m³",
        220: "ng/m³",
        221: "g/cm³",
        222: "Bq",
        223: "kBq",
        224: "MBq",
        225: "Gy",
        226: "mGy",
        227: "µGy",
        228: "Sv",
        229: "mSv",
        230: "µSv",
        231: "µSv/h",
        232: "dBA",
        233: "NTU",
        234: "pH",
        235: "g/m²",
        236: "min/K",
        237: "Ω·m²/m",
        238: "A·s",
        239: "VA·h",
        240: "kVA·h",
        241: "MVA·h",
        242: "var·h",
        243: "kvar·h",
        244: "Mvar·h",
        245: "V²·h",
        246: "A²·h",
        247: "J/h",
        248: "ft³/d",
        249: "m³/d",
        250: "Wh/m³",
        251: "J/m³",
        252: "mol%",
        253: "Pa·s",
        254: "MMSCFM",
    };

    return bacnetUnitMap[bacnetUnit];
}

async function extenderAnalogInput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    let endpointNames: string[] | undefined;
    for (const endpoint of endpoints) {
        if (!onlyFirstDeviceEnpoint(device, endpoints)) {
            endpointNames = [endpoint.ID.toString()];
        }
        const name = await getClusterAttributeValue(endpoint, "genAnalogInput", "description", `analog_input_${endpoint.ID}`);
        let label: string | undefined;
        if (name !== `analog_input_${endpoint.ID}`) {
            label = name;
        }
        const description = `Analog Input ${name} on endpoint ${endpoint.ID}`;
        const applicationType = await getClusterAttributeValue(endpoint, "genAnalogInput", "applicationType", undefined);
        let unit: string | undefined;
        if (applicationType !== undefined) {
            unit = getUnitfromApplicationType(applicationType);
        }
        if (unit === undefined) {
            const bacnet_unit = await getClusterAttributeValue(endpoint, "genAnalogInput", "engineeringUnits", undefined);
            if (bacnet_unit !== undefined) {
                unit = getUnitfromBACnetUnit(bacnet_unit);
            }
        }
        const args: m.NumericArgs<"genAnalogInput"> = {
            name: name.replace(/\s+/g, "_").toLowerCase(),
            label: label,
            valueMin: await getClusterAttributeValue(endpoint, "genAnalogInput", "minPresentValue", undefined),
            valueMax: await getClusterAttributeValue(endpoint, "genAnalogInput", "maxPresentValue", undefined),
            valueStep: await getClusterAttributeValue(endpoint, "genAnalogInput", "resolution", undefined),
            cluster: "genAnalogInput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            description: description,
            access: "STATE_GET",
            endpointNames: endpointNames,
            unit: unit,
        };
        generated.push(new ExtendGenerator({extend: m.numeric, args, source: "numeric"}));
    }
    return generated;
}

async function extenderAnalogOutput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    let endpointNames: string[] | undefined;
    for (const endpoint of endpoints) {
        if (!onlyFirstDeviceEnpoint(device, endpoints)) {
            endpointNames = [endpoint.ID.toString()];
        }
        const name = await getClusterAttributeValue(endpoint, "genAnalogOutput", "description", `analog_output_${endpoint.ID}`);
        let label: string | undefined;
        if (name !== `analog_output_${endpoint.ID}`) {
            label = name;
        }
        const description = `Analog Output ${name} on endpoint ${endpoint.ID}`;
        const applicationType = await getClusterAttributeValue(endpoint, "genAnalogOutput", "applicationType", undefined);
        let unit: string | undefined;
        if (applicationType !== undefined) {
            unit = getUnitfromApplicationType(applicationType);
        }
        if (unit === undefined) {
            const bacnet_unit = await getClusterAttributeValue(endpoint, "genAnalogOutput", "engineeringUnits", undefined);
            if (bacnet_unit !== undefined) {
                unit = getUnitfromBACnetUnit(bacnet_unit);
            }
        }
        const args: m.NumericArgs<"genAnalogOutput"> = {
            name: name.replace(/\s+/g, "_").toLowerCase(),
            label: label,
            valueMin: await getClusterAttributeValue(endpoint, "genAnalogOutput", "minPresentValue", undefined),
            valueMax: await getClusterAttributeValue(endpoint, "genAnalogOutput", "maxPresentValue", undefined),
            valueStep: await getClusterAttributeValue(endpoint, "genAnalogOutput", "resolution", undefined),
            cluster: "genAnalogOutput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            description: description,
            access: "ALL",
            endpointNames: endpointNames,
            unit: unit,
        };
        generated.push(new ExtendGenerator({extend: m.numeric, args, source: "numeric"}));
    }
    return generated;
}
