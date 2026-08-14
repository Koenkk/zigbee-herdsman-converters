import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["4655BC0-R"],
        model: "4655BC0-R",
        vendor: "Ecolink",
        description: "Contact sensor",
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            await reporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ["FFZB1-SM-ECO"],
        model: "FFZB1-SM-ECO",
        vendor: "Ecolink",
        description: "Audio Detector: Listens for the siren tone from a UL listed smoke detector in your home and sends signal to your Zigbee HUB",
        extend: [
            m.temperature(),
            m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
            m.battery({voltageToPercentage: {min: 2200, max: 3000}, voltage: true, percentageReporting: false}),
        ],
    },
];
