import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import * as reporting from '../lib/reporting';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZBT-DIMLight-GLS0800'],
        model: 'ZBT-DIMLight-GLS0800',
        vendor: 'Leedarson',
        description: 'LED E27 warm white',
        extend: [light()],
    },
    {
        zigbeeModel: ['ZBT-CCTLight-GLS0904'],
        model: 'ZBT-CCTLight-GLS0904',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['ZBT-CCTLight-Candle0904'],
        model: 'ZBT-CCTLight-Candle0904',
        vendor: 'Leedarson',
        description: 'LED E14 tunable white',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['LED_GU10_OWDT'],
        model: 'ZM350STW1TCF',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10 tunable white',
        extend: [light({colorTemp: {range: undefined, startup: false}})],
    },
    {
        zigbeeModel: ['M350ST-W1R-01', 'A470S-A7R-04'],
        model: 'M350STW1',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10',
        extend: [light()],
    },
    {
        zigbeeModel: ['LED_E27_ORD'],
        model: 'A806S-Q1G',
        vendor: 'Leedarson',
        description: 'LED E27 color',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['ZHA-DimmableLight'],
        model: 'A806S-Q1R',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: [light()],
    },
    {
        zigbeeModel: ['LED_E27_OWDT'],
        model: 'ZA806SQ1TCF',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['ZBT-CCTSwitch-D0001'],
        model: '6ARCZABZH',
        vendor: 'Leedarson',
        description: '4-Key Remote Controller',
        fromZigbee: [fz.command_on, fz.command_off, legacy.fz.CCTSwitch_D0001_on_off, fz.CCTSwitch_D0001_levelctrl,
            fz.CCTSwitch_D0001_lighting, fz.battery],
        exposes: [e.battery(), e.action(['colortemp_up_release', 'colortemp_down_release', 'on', 'off', 'brightness_up', 'brightness_down',
            'colortemp_up', 'colortemp_down', 'colortemp_up_hold', 'colortemp_down_hold'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TWGU10Bulb02UK'],
        model: '6xy-M350ST-W1Z',
        vendor: 'Leedarson',
        description: 'PAR16 tunable white',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        fingerprint: [{modelID: 'ZHA-PIRSensor', manufacturerName: 'Leedarson'}],
        model: '5AA-SS-ZA-H0',
        vendor: 'Leedarson',
        description: 'Motion sensor',
        fromZigbee: [fz.occupancy, fz.illuminance, fz.ignore_occupancy_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['ZB-SMART-PIRTH-V1'],
        model: '7A-SS-ZABC-H0',
        vendor: 'Leedarson',
        description: '4-in-1-Sensor',
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1, fz.illuminance, fz.temperature, fz.humidity, fz.ignore_occupancy_report],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.temperature(), e.illuminance(), e.illuminance_lux(), e.humidity()],
    },
    {
        zigbeeModel: ['ZB-MotionSensor-S0000'],
        model: '8A-SS-BA-H0',
        vendor: 'Leedarson',
        description: 'Motion Sensor',
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_occupancy_report],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy()],
    },
    {
        zigbeeModel: ['LDHD2AZW'],
        model: 'LDHD2AZW',
        vendor: 'Leedarson',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
