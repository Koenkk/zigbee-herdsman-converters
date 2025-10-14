import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Sonesse 28 WF Li-Ion Roller", "Sonesse 28 WF Roller"],
        model: "1241755",
        vendor: "SOMFY",
        description: "Sonesse 28 WF Li-Ion roller shades",
        extend: [m.battery(), m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Sonesse2 28 WF Roller"],
        model: "1003296",
        vendor: "SOMFY",
        description: "Sonesse2 28 WF roller shades",
        extend: [m.battery(), m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Sonesse2 28 WF Li-Ion Roller"],
        model: "1245943",
        vendor: "SOMFY",
        description: "Sonesse2 28 WF Li-Ion roller shades",
        extend: [m.battery(), m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Sonesse Ultra 30 WF Li-Ion Rolle"],
        model: "SOMFY-1241752",
        vendor: "SOMFY",
        description: "Blinds",
        extend: [m.windowCovering({controls: ["lift"]}), m.battery()],
    },
    {
        zigbeeModel: ["Sonesse 30 DC 24V Roller"],
        model: "1241970",
        vendor: "SOMFY",
        description: "Sonesse 30 DC 24V roller shades",
        extend: [m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Ysia 5 HP Zigbee"],
        model: "1871154",
        vendor: "SOMFY",
        description: "Ysia 5 channel blinds remote",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "232": 232}}),
            m.battery(),
            m.commandsOnOff({endpointNames: ["1", "2", "3", "4", "5"]}),
            m.commandsWindowCovering({endpointNames: ["1", "2", "3", "4", "5"]}),
        ],
    },
    {
        zigbeeModel: ["1822647"],
        model: "1822647A",
        vendor: "SOMFY",
        description: "Zigbee smart plug",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(12);
            await reporting.bind(ep, coordinatorEndpoint, ["genBasic", "genIdentify", "genOnOff", "seMetering"]);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            await reporting.currentSummReceived(ep);
        },
    },
    {
        zigbeeModel: ["1811680"],
        model: "1811680",
        vendor: "SOMFY",
        description: "Zigbee opening sensor",
        extend: [m.identify(), m.iasZoneAlarm({zoneType: "generic", zoneAttributes: ["alarm_1", "battery_low"]}), m.battery()],
    },
    {
        zigbeeModel: ["1811681"],
        model: "1811681",
        vendor: "SOMFY",
        description: "Zigbee motion sensor",
        extend: [m.identify(), m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "battery_low"]}), m.battery()],
    },
    {
        zigbeeModel: ["Glydea Ultra Curtain"],
        model: "9028412A",
        vendor: "SOMFY",
        description: "Glydea Curtain motor Zigbee module",
        extend: [m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Tilt & Lift 25 WF Roller"],
        model: "1245602",
        vendor: "SOMFY",
        description: "Tilt and lift blinds motor",
        extend: [m.windowCovering({controls: ["lift", "tilt"]}), m.battery(), m.identify()],
    },
    {
        zigbeeModel: ["1871215B"],
        model: "1871215B",
        vendor: "Somfy",
        description: "Connected plug E type with power monitoring",
        extend: [m.onOff(), m.electricityMeter()],
    },
];
