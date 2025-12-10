import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as adurosmart from "../lib/adurosmart";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ADUROLIGHT_CSC"],
        model: "15090054",
        vendor: "AduroSmart",
        description: "Remote scene controller",
        fromZigbee: [fz.battery, fz.command_toggle, fz.command_recall],
        toZigbee: [],
        exposes: [e.battery(), e.action(["toggle", "recall_253", "recall_254", "recall_255"])],
    },
    {
        zigbeeModel: ["AD-RGBWH3001"],
        model: "AD-RGBWH3001",
        vendor: "AduroSmart",
        description: "ERIA Colors and White A19 Dimmable LED bulb",
        extend: [m.light({colorTemp: {range: [153, 500]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        zigbeeModel: ["AD-SmartPlug3001"],
        model: "81848",
        vendor: "AduroSmart",
        description: "ERIA smart plug (with power measurements)",
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ["ZLL-ExtendedColo", "ZLL-ExtendedColor"],
        model: "81809/81813",
        vendor: "AduroSmart",
        description: "ERIA colors and white shades smart light bulb A19/BR30",
        extend: [m.light({colorTemp: {range: undefined}, color: {applyRedFix: true}})],
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["AD-RGBW3001"],
        model: "81809FBA",
        vendor: "AduroSmart",
        description: "ERIA colors and white shades smart light bulb A19/BR30",
        extend: [m.light({colorTemp: {range: [153, 500]}, color: {modes: ["xy", "hs"], applyRedFix: true}})],
    },
    {
        zigbeeModel: ["AD-E14RGBW3001"],
        model: "81895",
        vendor: "AduroSmart",
        description: "ERIA E14 Candle Color",
        extend: [m.light({colorTemp: {range: [153, 500]}, color: true})],
    },
    {
        zigbeeModel: ["AD-DimmableLight3001"],
        model: "81810",
        vendor: "AduroSmart",
        description: "Zigbee Aduro Eria B22 bulb - warm white",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["Adurolight_NCC"],
        model: "81825",
        vendor: "AduroSmart",
        description: "ERIA smart wireless dimming switch",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step],
        exposes: [e.action(["on", "off", "up", "down"])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
        },
    },
    {
        zigbeeModel: ["AD-Dimmer"],
        model: "81849",
        vendor: "AduroSmart",
        description: "ERIA built-in multi dimmer module 300W",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["BDP3001"],
        model: "81855",
        vendor: "AduroSmart",
        description: "ERIA smart plug (dimmer)",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["BPU3"],
        model: "BPU3",
        vendor: "AduroSmart",
        description: "ERIA smart plug",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["Extended Color LED Strip V1.0"],
        model: "81863",
        vendor: "AduroSmart",
        description: "Eria color LED strip",
        extend: [m.light({colorTemp: {range: [153, 500]}, color: {modes: ["xy", "hs"], applyRedFix: true}})],
    },
    {
        zigbeeModel: ["AD-81812", "AD-ColorTemperature3001"],
        model: "81812/81814",
        vendor: "AduroSmart",
        description: "Eria tunable white A19/BR30 smart bulb",
        extend: [m.light({colorTemp: {range: [153, 500]}, color: {modes: ["xy", "hs"]}})],
    },
    {
        zigbeeModel: ["AD-E1XCTW3001"],
        model: "E1XCTW3001",
        vendor: "AduroSmart",
        description: "ERIA tunable-white candle bulb (E12)",
        extend: [m.light({colorTemp: {range: [153, 500]}})],
    },
    {
        zigbeeModel: ["ONOFFRELAY"],
        model: "81898",
        vendor: "AduroSmart",
        description: "AduroSmart on/off relay",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["AD-BR3RGBW3001"],
        model: "81813-V2",
        vendor: "AduroSmart",
        description: "BR30 light bulb",
        extend: [m.light({colorTemp: {range: [153, 500]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        fingerprint: [{modelID: "Smart Siren", manufacturerName: "AduroSmart Eria"}],
        model: "81868",
        vendor: "AduroSmart",
        description: "Siren",
        fromZigbee: [fz.battery, fz.ias_wd, fz.ias_enroll, fz.ias_siren],
        toZigbee: [tz.warning_simple, tz.ias_max_duration, tz.warning],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "ssIasZone", "ssIasWd"]);
            await endpoint.read("ssIasZone", ["zoneState", "iasCieAddr", "zoneId"]);
            await endpoint.read("ssIasWd", ["maxDuration"]);
        },
        exposes: [
            e.tamper(),
            e.warning(),
            e.numeric("max_duration", ea.ALL).withUnit("s").withValueMin(0).withValueMax(600).withDescription("Duration of Siren"),
            e.binary("alarm", ea.SET, "ON", "OFF").withDescription("Manual start of siren"),
        ],
    },
    {
        zigbeeModel: ["AD-CTW123001"],
        model: "AD-CTW123001",
        vendor: "AduroSmart",
        description: "ERIA smart light bubl A19",
        extend: [m.light({colorTemp: {range: [153, 500]}})],
    },
    {
        fingerprint: [{modelID: "ONOFF_METER_RELAY", manufacturerName: "AduroSmart ERIA"}],
        model: "81998",
        vendor: "AduroSmart",
        description: "ERIA built-in on/off relay (with power measurements)",
        extend: [m.onOff(), m.electricityMeter({cluster: "electrical"})],
    },
    {
        zigbeeModel: ["DimmerM3002"],
        model: "81949",
        vendor: "AduroSmart",
        description: "ERIA built-in dimmer module (with power measurements)",
        extend: [
            m.light({configureReporting: true}),
            m.electricityMeter({cluster: "electrical"}),
            adurosmart.extend.dimmerLoadControlMode(),
            adurosmart.extend.dimmerSwitchMode(),
            adurosmart.extend.dimmerInvertSwitch(),
            adurosmart.extend.dimmerSceneActivation(),
            adurosmart.extend.dimmerS1DoubleClickScene(),
            adurosmart.extend.dimmerS2DoubleClickScene(),
            adurosmart.extend.dimmerMinBrightnessLevel(),
            adurosmart.extend.dimmerMaxBrightnessLevel(),
            adurosmart.extend.dimmerManualDimmingStepSize(),
            adurosmart.extend.dimmerManualDimmingTime(),
        ],
    },
];
