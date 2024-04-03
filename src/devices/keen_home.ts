import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as lumi from '../lib/lumi';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['RS-THP-MP-1.0'],
        model: 'RS-THP-MP-1.0',
        vendor: 'Keen Home',
        description: 'Temperature Sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        // lumi.fromZigbee.lumi_temperature looks like a mistake, probably just fz.temperature
        fromZigbee: [fz.battery, lumi.fromZigbee.lumi_temperature, fz.humidity, fz.keen_home_smart_vent_pressure],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['SV01-410-MP-1.0', 'SV01-410-MP-1.1', 'SV01-410-MP-1.4', 'SV01-410-MP-1.5', 'SV01-412-MP-1.0', 'SV01-412-MP-1.1',
            'SV01-412-MP-1.3', 'SV01-412-MP-1.4', 'SV01-610-MP-1.0', 'SV01-610-MP-1.1', 'SV01-612-MP-1.0', 'SV01-612-MP-1.1', 'SV01-612-MP-1.2',
            'SV01-610-MP-1.4', 'SV01-612-MP-1.4'],
        model: 'SV01',
        vendor: 'Keen Home',
        description: 'Smart vent',
        fromZigbee: [fz.cover_position_via_brightness, fz.temperature, fz.battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report],
        toZigbee: [tz.cover_via_brightness],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.pressure(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.temperature(), e.battery(), e.pressure()],
    },
    {
        zigbeeModel: ['SV02-410-MP-1.3', 'SV02-412-MP-1.3', 'SV02-610-MP-1.0', 'SV02-610-MP-1.3', 'SV02-612-MP-1.2', 'SV02-612-MP-1.3',
            'SV02-410-MP-1.0', 'SV02-410-MP-1.2', 'SV02-412-MP-1.2'],
        model: 'SV02',
        vendor: 'Keen Home',
        description: 'Smart vent',
        fromZigbee: [fz.cover_position_via_brightness, fz.temperature, fz.battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report],
        toZigbee: [tz.cover_via_brightness],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.pressure(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.temperature(), e.battery(), e.pressure()],
    },
    {
        zigbeeModel: ['GW01-001-MP-1.0'],
        model: 'GW01',
        description: 'Signal repeater',
        vendor: 'Keen Home',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const payload = [{attribute: 'modelId', minimumReportInterval: 3600, maximumReportInterval: 14400, reportableChange: 1}];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.configureReporting('genBasic', payload);
            device.powerSource = 'Mains (single phase)';
        },
        exposes: [],
    },
    {
        zigbeeModel: ['GW02-001-MP-1.0'],
        model: 'GW02',
        description: 'Signal repeater',
        vendor: 'Keen Home',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const payload = [{attribute: 'modelId', minimumReportInterval: 3600, maximumReportInterval: 14400, reportableChange: 1}];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.configureReporting('genBasic', payload);
            device.powerSource = 'Mains (single phase)';
        },
        exposes: [],
    },
];

export default definitions;
module.exports = definitions;
