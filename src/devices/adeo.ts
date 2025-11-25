import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import {nodonPilotWire} from "../lib/nodon";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    LDSENK08: {
        cluster: "ssIasZone",
        type: "commandStatusChangeNotification",
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !((zoneStatus & 1) > 0),
                vibration: (zoneStatus & (1 << 1)) > 0,
                tamper: (zoneStatus & (1 << 2)) > 0,
                battery_low: (zoneStatus & (1 << 3)) > 0,
            };
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification">,
};

const tzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    LDSENK08_sensitivity: {
        key: ["sensitivity"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("ssIasZone", {19: {value, type: 0x20}});
            return {state: {sensitivity: value}};
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LDSENK06"],
        model: "LDSENK06",
        vendor: "ADEO",
        description: "ENKI LEXMAN indoor siren 85db",
        extend: [m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"]}), m.iasWarning()],
    },
    {
        zigbeeModel: ["LDSENK08"],
        model: "LDSENK08",
        vendor: "ADEO",
        description: "ENKI LEXMAN wireless smart door window sensor with vibration",
        fromZigbee: [fzLocal.LDSENK08, fz.battery],
        toZigbee: [tzLocal.LDSENK08_sensitivity],
        exposes: [
            e.battery_low(),
            e.contact(),
            e.vibration(),
            e.tamper(),
            e.battery(),
            e.numeric("sensitivity", ea.STATE_SET).withValueMin(0).withValueMax(4).withDescription("Sensitivity of the motion sensor"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["LDSENK09"],
        model: "LDSENK09",
        vendor: "ADEO",
        description: "Security system key fob",
        fromZigbee: [fz.command_arm, fz.command_panic],
        toZigbee: [],
        exposes: [e.action(["panic", "disarm", "arm_partial_zones", "arm_all_zones"])],
        extend: [m.iasArmCommandDefaultResponse()],
    },
    {
        zigbeeModel: ["ZBEK-1"],
        model: "IA-CDZOTAAA007MA-MAN",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 7.2 to 60W LED RGBW",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-2"],
        model: "IG-CDZOTAAG014RA-MAN",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 14W to 100W LED RGBW v2",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-3"],
        model: "IP-CDZOTAAP005JA-MAN",
        vendor: "ADEO",
        description: "ENKI LEXMAN E14 LED RGBW",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-4"],
        model: "IM-CDZDGAAA0005KA_MAN",
        vendor: "ADEO",
        description: "ENKI LEXMAN RGBTW GU10 Bulb",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-5"],
        model: "IST-CDZFB2AS007NA-MZN-01",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED white",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["SIN-4-1-21_EQU"],
        model: "SIN-4-1-21_EQU",
        vendor: "ADEO",
        description: "Multifunction relay switch with metering",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
    },
    {
        zigbeeModel: ["ZBEK-7"],
        model: "IST-CDZFB2AS007NA-MZN-02",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED Edison white filament 806 lumen",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-8"],
        model: "IG-CDZFB2G009RA-MZN-02",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED white filament 1055 lumen",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-9"],
        model: "IA-CDZFB2AA007NA-MZN-02",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED white",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-6"],
        model: "IG-CDZB2AG009RA-MZN-01",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 Led white bulb",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },

    {
        zigbeeModel: ["ZBEK-10"],
        model: "IC-CDZFB2AC004HA-MZN",
        vendor: "ADEO",
        description: "ENKI LEXMAN E14 LED white",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-11"],
        model: "IM-CDZDGAAG005KA-MZN",
        vendor: "ADEO",
        description: "ENKI LEXMAN GU-10 LED white",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-12"],
        model: "IA-CDZFB2AA007NA-MZN-01",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED white",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-13"],
        model: "IG-CDZFB2AG010RA-MNZ",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED white",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-14"],
        model: "IC-CDZFB2AC005HA-MZN",
        vendor: "ADEO",
        description: "ENKI LEXMAN E14 LED white",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["ZBEK-22"],
        model: "BD05C-FL-21-G-ENK",
        vendor: "ADEO",
        description: "ENKI LEXMAN RGBCCT lamp",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-27"],
        model: "84845506",
        vendor: "ADEO",
        description: "ENKI LEXMAN Gdansk",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-29"],
        model: "84845509",
        vendor: "ADEO",
        description: "ENKI LEXMAN Gdansk LED panel",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-28"],
        model: "PEZ1-042-1020-C1D1",
        vendor: "ADEO",
        description: "ENKI LEXMAN Gdansk",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-30"],
        model: "ZBEK-30",
        vendor: "Adeo",
        description: "ENKI LEXMAN Gdansk",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        zigbeeModel: ["ZBEK-31"],
        model: "84870054",
        vendor: "ADEO",
        description: "ENKI LEXMAN Extraflat 85",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-32"],
        model: "ZBEK-32",
        vendor: "ADEO",
        description: "ENKI Inspire Extraflat D12",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-33"],
        model: "ZBEK-33",
        vendor: "ADEO",
        description: "ENKI Inspire Extraflat 2400Lumens",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZBEK-34"],
        model: "84870058",
        vendor: "ADEO",
        description: "ENKI LEXMAN Extraflat 225 ",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["LDSENK01F"],
        model: "LDSENK01F",
        vendor: "ADEO",
        description: "10A EU smart plug",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["LDSENK01S"],
        model: "LDSENK01S",
        vendor: "ADEO",
        description: "10A EU smart plug",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["LXEK-5", "ZBEK-26"],
        model: "HR-C99C-Z-C045",
        vendor: "ADEO",
        description: "RGB CTT LEXMAN ENKI remote control",
        fromZigbee: [
            fz.battery,
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_stop,
            fz.command_step_color_temperature,
            fz.command_step_hue,
            fz.command_step_saturation,
            fz.color_stop_raw,
            fz.scenes_recall_scene_65024,
        ],
        toZigbee: [],
        exposes: [
            e.battery(),
            e.action([
                "on",
                "off",
                "scene_1",
                "scene_2",
                "scene_3",
                "scene_4",
                "color_saturation_step_up",
                "color_saturation_step_down",
                "color_stop",
                "color_hue_step_up",
                "color_hue_step_down",
                "color_temperature_step_up",
                "color_temperature_step_down",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_stop",
            ]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genOnOff", "genPowerCfg", "lightingColorCtrl", "genLevelCtrl"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["LXEK-1"],
        model: "9CZA-A806ST-Q1A",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED RGBW",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["LXEK-3"],
        model: "9CZA-P470T-A1A",
        vendor: "ADEO",
        description: "ENKI LEXMAN E14 LED RGBW",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["LXEK-4"],
        model: "9CZA-M350ST-Q1A",
        vendor: "ADEO",
        description: "ENKI LEXMAN GU-10 LED RGBW",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["LXEK-2"],
        model: "9CZA-G1521-Q1A",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 14W to 100W LED RGBW",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["LDSENK07"],
        model: "LDSENK07",
        vendor: "ADEO",
        description: "ENKI LEXMAN wireless smart outdoor siren",
        fromZigbee: [fz.battery, fz.ias_siren],
        toZigbee: [tz.warning],
        exposes: [e.warning(), e.battery(), e.battery_low(), e.tamper()],
        extend: [m.quirkCheckinInterval(0)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint.binds.some((b) => b.cluster.name === "genPollCtrl")) {
                await endpoint.unbind("genPollCtrl", coordinatorEndpoint);
            }
        },
    },
    {
        zigbeeModel: ["LXEK-7"],
        model: "9CZA-A806ST-Q1Z",
        vendor: "ADEO",
        description: "ENKI LEXMAN E27 LED white",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["LDSENK02F"],
        model: "LDSENK02F",
        description: "10A/16A EU smart plug",
        vendor: "ADEO",
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["LDSENK10"],
        model: "LDSENK10",
        vendor: "ADEO",
        description: "ENKI LEXMAN motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["LDSENK02S"],
        model: "LDSENK02S",
        vendor: "ADEO",
        description: "ENKI LEXMAN 16A EU smart plug",
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["SIN-4-1-20_LEX"],
        model: "SIN-4-1-20_LEX",
        vendor: "ADEO",
        description: "ENKI LEXMAN 3680W single output relay",
        extend: [m.onOff()],
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ["SIN-4-1-20_EQU"],
        model: "SIN-4-1-20_EQU",
        vendor: "Adeo",
        description: "Dry contact switch for central heating boilers",
        extend: [m.onOff(), m.commandsOnOff()],
    },

    {
        zigbeeModel: ["SIN-4-RS-20_LEX"],
        model: "SIN-4-RS-20_LEX",
        vendor: "ADEO",
        description: "Roller shutter controller (Leroy Merlin version)",
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
            await reporting.currentPositionTiltPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ["SIN-4-1-22_LEX"],
        model: "SIN-4-1-22_LEX",
        vendor: "ADEO",
        description: "ENKI LEXMAN Access Control",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["SIN-4-FP-21_EQU"],
        model: "SIN-4-FP-21_EQU",
        vendor: "ADEO",
        description: "Equation pilot wire heating module",
        ota: true,
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ["genBasic", "genIdentify", "genOnOff", "seMetering"]);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
        },
        extend: [...nodonPilotWire(true)],
    },
    {
        zigbeeModel: ["ZB-Remote-D0001"],
        model: "83633204",
        vendor: "ADEO",
        description: "1-key remote control",
        fromZigbee: [fz.adeo_button_65024, fz.battery],
        exposes: [e.action(["single", "double", "hold"]), e.battery()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["ZB-SMART-PIRTH-V3"],
        model: "83633205",
        vendor: "ADEO",
        description: "Smart 4 in 1 sensor",
        extend: [
            m.battery(),
            m.illuminance(),
            m.temperature(),
            m.humidity(),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
        ],
    },
    {
        zigbeeModel: ["ZB-DoorSensor-D0007"],
        model: "ZB-DoorSensor-D0007",
        vendor: "ADEO",
        description: "ENKI LEXMAN wireless smart door window sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "tamper", "battery_low"]})],
    },
    {
        zigbeeModel: ["ZB-WaterSensor-D0001"],
        model: "83633206",
        vendor: "ADEO",
        description: "ENKI LEXMAN water leak sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"]})],
    },
    {
        zigbeeModel: ["WSD005"],
        model: "WSD005",
        vendor: "ADEO",
        description: "ENKI LEXMAN motor for roller shutler",
        extend: [m.windowCovering({controls: ["lift"]})],
    },
];
