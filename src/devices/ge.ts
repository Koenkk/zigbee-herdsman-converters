import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SoftWhite"],
        model: "PSB19-SW27",
        vendor: "GE",
        description: "Link smart LED light bulb, A19 soft white (2700K)",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["ZLL Light"],
        model: "22670",
        vendor: "GE",
        description: "Link smart LED light bulb, A19/BR30 soft white (2700K)",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["Daylight"],
        model: "PQC19-DY01",
        vendor: "GE",
        description: "Link smart LED light bulb, A19/BR30 cold white (5000K)",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["45852"],
        model: "45852GE",
        vendor: "GE",
        description: "Zigbee plug-in smart dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["45853"],
        model: "45853GE",
        vendor: "GE",
        description: "Plug-in smart switch",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off, tz.ignore_transition],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 10, change: 2});
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ["45856"],
        model: "45856GE",
        vendor: "GE",
        description: "In-wall smart switch",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.energy(), e.power()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 10000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ["45857"],
        model: "45857GE",
        vendor: "GE",
        description: "Zigbee in-wall smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter({cluster: "metering"})],
    },
    {
        zigbeeModel: ["Smart Switch"],
        model: "PTAPT-WH02",
        vendor: "GE",
        description: "Quirky smart switch",
        extend: [m.onOff()],
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["ZHA Smart Plug"],
        model: "POTLK-WH02",
        vendor: "GE",
        description: "Outlink smart remote outlet",
        extend: [m.onOff()],
    },
];
