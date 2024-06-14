import {Zcl, ZSpec} from 'zigbee-herdsman';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import * as constants from '../lib/constants';
import * as globalStore from '../lib/store';
import {
    Tz, Fz, Definition, KeyValue, ModernExtend, Expose,
} from '../lib/types';
import {logger} from '../lib/logger';
const e = exposes.presets;
const ea = exposes.access;


const definition = {
    zigbeeModel: ['Aidoo Zigbee'],
    model: 'Aidoo Zigbee AZAI6ZBEMHI',
    vendor: 'Airzone',
    description: 'Gateway for two-way control and integration of AirCon Units.AZAI6ZBEMHI for Mitsubishi Heavy',
    fromZigbee: [fz.thermostat, fz.on_off, fz.fan],
    toZigbee: [
        tz.thermostat_local_temperature,
        tz.thermostat_occupied_heating_setpoint,
        tz.thermostat_occupied_cooling_setpoint,
        tz.thermostat_system_mode,
        tz.on_off,
        tz.fan_mode,
    ],
    exposes: [
        e.climate()
            .withLocalTemperature()
            .withSystemMode(['off', 'auto', 'cool', 'heat', 'fan_only', 'dry'])
            .withFanMode(['off', 'low', 'medium', 'high', 'on', 'auto'])
            .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
            .withSetpoint('occupied_cooling_setpoint', 5, 30, 0.5),
        e.switch(),
    ],
    endpoint: (device) => {
        return { 'system': 1 };
    },
    meta: { configureKey: 1 },
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl', 'genOnOff']);
        await reporting.thermostatTemperature(endpoint);
        await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        await reporting.onOff(endpoint);
        await reporting.fanMode(endpoint);
    },
};

module.exports = definition;