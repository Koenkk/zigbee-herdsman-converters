import {develcoModernExtend} from "../lib/develco";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

// NOTE! Develco and Frient is the same company, therefore we use develco specific things in here.

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["WISZB-131"],
        model: "WISZB-131",
        vendor: "Frient",
        description: "Temperature and contact sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]}), m.temperature()],
    },
    {
        zigbeeModel: ["EMIZB-141"],
        model: "EMIZB-141",
        vendor: "Frient",
        description: "Electricity meter interface 2 LED",
        extend: [
            m.electricityMeter({cluster: "metering", power: {divisor: 1000, multiplier: 1}, energy: {divisor: 1000, multiplier: 1}}),
            m.battery(),
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.pulseConfiguration(),
            develcoModernExtend.currentSummation(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SMRZB-153"],
        model: "SMRZB-153",
        vendor: "Frient",
        description: "Smart Cable - Power switch with power measurement",
        extend: [m.onOff({configureReporting: false}), m.electricityMeter()],
        ota: true,
        endpoint: () => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["EMIZB-151"],
        model: "EMIZB-151",
        vendor: "Frient",
        description: "Electricity Meter Interface 2 P1",
        extend: [m.electricityMeter({threePhase: true, producedEnergy: true, tariffs: true})],
        ota: true,
        endpoint: (device) => ({default: 2}),
    },
];
