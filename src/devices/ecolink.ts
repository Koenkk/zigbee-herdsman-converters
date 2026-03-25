import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';
import * as e from 'zigbee-herdsman-converters/lib/exposes';

import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

const ffzb1BatteryFromZigbee = {
    cluster: 'genPowerCfg',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.hasOwnProperty('batteryVoltage')) {
            const rawValue = msg.data['batteryVoltage'];
            const volts = rawValue / 10;
            const minVolts = 2.2;
            const maxVolts = 3.0;
            let pct = Math.round(((volts - minVolts) / (maxVolts - minVolts)) * 100);
            pct = Math.min(100, Math.max(1, pct));
            return {battery: pct, voltage: rawValue * 100};
        }
    },
};

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
        zigbeeModel: ['FFZB1-SM-ECO'],
        model: 'FFZB1-SM-ECO',
        vendor: 'Ecolink',
        description: 'Audio Detector: Listens for the siren tone from a UL listed smoke detector in your home and sends signal to your Zigbee HUB',
        fromZigbee: [ffzb1BatteryFromZigbee],
        extend: [
            m.battery({voltageToPercentage: {min: 2200, max: 3000}}),
            m.temperature(),
            m.iasZoneAlarm({zoneType: 'generic', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
        ],
        exposes: [
            e.presets.battery(),
            e.presets.voltage(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
    
            try {
                await endpoint.command('genPollCtrl', 'setLongPollInterval', {newLongPollInterval: 0x000004B0});
                await endpoint.command('genPollCtrl', 'setShortPollInterval', {newShortPollInterval: 0x0002});
                await endpoint.write('genPollCtrl', {fastPollTimeout: 0x0028});
                await endpoint.write('genPollCtrl', {checkinInterval: 0x00001950});
    
                await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
                await reporting.batteryVoltage(endpoint);
    
            } catch (error) {
                logger.warn(`FFZB1-SM-ECO configure failed: ${error.message}`);
            }
        },
    },
];
