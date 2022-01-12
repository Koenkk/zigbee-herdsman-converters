const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

const batteryRotaryDimmer = (...endpointsIds) => ({
    fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_step_color_temperature],
    toZigbee: [],
    exposes: [e.battery(), e.action([
        'on', 'off', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down'])],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoints = endpointsIds.map((endpoint) => device.getEndpoint(endpoint));

        // Battery level is only reported on first endpoint
        await reporting.batteryVoltage(endpoints[0]);

        for await (const endpoint of endpoints) {
            logger.debug(`processing endpoint ${endpoint.ID}`);
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['genIdentify', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);

            // The default is for the device to also report the on/off and
            // brightness at the same time as sending on/off and step commands.
            // Disable the reporting by setting the max interval to 0xFFFF.
            await reporting.brightness(endpoint, {max: 0xFFFF});
            await reporting.onOff(endpoint, {max: 0xFFFF});
        }
    },
});

module.exports = [
    {
        zigbeeModel: ['TWGU10Bulb50AU'],
        model: 'AU-A1GUZBCX5',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.4W smart tuneable GU10 lamp',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['FWG125Bulb50AU'],
        model: 'AU-A1VG125Z5E/19',
        vendor: 'Aurora Lighting',
        description: 'AOne 4W smart dimmable G125 lamp 1900K',
        meta: {turnsOffAtBrightness1: true},
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWGU10Bulb50AU', 'FWGU10Bulb01UK'],
        model: 'AU-A1GUZB5/30',
        vendor: 'Aurora Lighting',
        description: 'AOne 4.8W smart dimmable GU10 lamp 3000K',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWA60Bulb50AU'],
        model: 'AU-A1VGSZ5E/19',
        vendor: 'Aurora Lighting',
        description: 'AOne 4W smart dimmable Vintage GLS lamp 1900K',
        extend: extend.light_onoff_brightness({disableEffect: true}),
    },
    {
        zigbeeModel: ['RGBGU10Bulb50AU'],
        model: 'AU-A1GUZBRGBW',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.6w smart RGBW tuneable GU10 lamp',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['RGBBulb01UK', 'RGBBulb02UK', 'RGBBulb51AU'],
        model: 'AU-A1GSZ9RGBW_HV-GSCXZB269K',
        vendor: 'Aurora Lighting',
        description: 'AOne 9.5W smart RGBW GLS E27/B22',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['Remote50AU'],
        model: 'AU-A1ZBRC',
        vendor: 'Aurora Lighting',
        description: 'AOne smart remote',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['MotionSensor51AU'],
        model: 'AU-A1ZBPIRS',
        vendor: 'Aurora Lighting',
        description: 'AOne PIR sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.illuminance],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(39);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['SingleSocket50AU'],
        model: 'AU-A1ZBPIAB',
        vendor: 'Aurora Lighting',
        description: 'Power plug Zigbee EU',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['WindowSensor51AU'],
        model: 'AU-A1ZBDWS',
        vendor: 'Aurora Lighting',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['WallDimmerMaster'],
        model: 'AU-A1ZB2WDM',
        vendor: 'Aurora Lighting',
        description: 'AOne 250W smart rotary dimmer module',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
        },
    },
    {
        zigbeeModel: ['DoubleSocket50AU'],
        model: 'AU-A1ZBDSS',
        vendor: 'Aurora Lighting',
        description: 'Double smart socket UK',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'), e.power().withEndpoint('right')],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['SmartPlug51AU'],
        model: 'AU-A1ZBPIA',
        vendor: 'Aurora Lighting',
        description: 'Aurora smart plug',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        exposes: [e.switch(), e.power(), e.voltage(), e.current(), e.device_temperature(), e.energy()],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genIdentify', 'haElectricalMeasurement', 'seMetering',
                'genDeviceTempCfg']);

            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);

            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            // Report 5v voltage change, 5a current, 5 watt power change to reduce the noise
            await reporting.rmsVoltage(endpoint, {change: 500});
            await reporting.rmsCurrent(endpoint, {change: 500});
            await reporting.activePower(endpoint, {change: 5});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {change: 500});
        },
    },
    {
        zigbeeModel: ['1GBatteryDimmer50AU'],
        model: 'AU-A1ZBR1GW',
        vendor: 'Aurora Lighting',
        description: 'AOne one gang wireless battery rotary dimmer',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        // One gang battery rotary dimmer with endpoint ID 1
        ...batteryRotaryDimmer(1),
    },
    {
        zigbeeModel: ['2GBatteryDimmer50AU'],
        model: 'AU-A1ZBR2GW',
        vendor: 'Aurora Lighting',
        description: 'AOne two gang wireless battery rotary dimmer',
        meta: {multiEndpoint: true, battery: {voltageToPercentage: '3V_2100'}},
        endpoint: (device) => {
            return {'right': 1, 'left': 2};
        },
        // Two gang battery rotary dimmer with endpoint IDs 1 and 2
        ...batteryRotaryDimmer(1, 2),
    },
];
