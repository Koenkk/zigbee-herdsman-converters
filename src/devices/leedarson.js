const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ZBT-DIMLight-GLS0800'],
        model: 'ZBT-DIMLight-GLS0800',
        vendor: 'Leedarson',
        description: 'LED E27 warm white',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-GLS0904'],
        model: 'ZBT-CCTLight-GLS0904',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-Candle0904'],
        model: 'ZBT-CCTLight-Candle0904',
        vendor: 'Leedarson',
        description: 'LED E14 tunable white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['LED_GU10_OWDT'],
        model: 'ZM350STW1TCF',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10 tunable white',
        extend: extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
    },
    {
        zigbeeModel: ['M350ST-W1R-01', 'A470S-A7R-04'],
        model: 'M350STW1',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LED_E27_ORD'],
        model: 'A806S-Q1G',
        vendor: 'Leedarson',
        description: 'LED E27 color',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['ZHA-DimmableLight'],
        model: 'A806S-Q1R',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LED_E27_OWDT'],
        model: 'ZA806SQ1TCF',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZBT-CCTSwitch-D0001'],
        model: '6ARCZABZH',
        vendor: 'Leedarson',
        description: '4-Key Remote Controller',
        fromZigbee: [fz.command_on, fz.command_off, fz.legacy.CCTSwitch_D0001_on_off, fz.CCTSwitch_D0001_levelctrl,
            fz.CCTSwitch_D0001_lighting, fz.battery],
        exposes: [e.battery(), e.action(['colortemp_up_release', 'colortemp_down_release', 'on', 'off', 'brightness_up', 'brightness_down',
            'colortemp_up', 'colortemp_down', 'colortemp_up_hold', 'colortemp_down_hold'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        extend: extend.light_onoff_brightness_colortemp(),
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
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
];
