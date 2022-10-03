const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const utils = require('../lib/utils');
const ea = exposes.access;

const tzLocal = {
    aOneBacklight: {
        key: ['backlight_led'],
        convertSet: async (entity, key, value, meta) => {
            const state = value.toLowerCase();
            utils.validateValue(state, ['toggle', 'off', 'on']);
            const endpoint = meta.device.getEndpoint(3);
            await endpoint.command('genOnOff', state, {});
            return {state: {backlight_led: state.toUpperCase()}};
        },
    },
    backlight_brightness: {
        key: ['brightness'],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genLevelCtrl', 'moveToLevel', {level: value, transtime: 0}, utils.getOptions(meta.mapped, entity));
            return {state: {brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', ['currentLevel']);
        },
    },
};

const disableBatteryRotaryDimmerReporting = async (endpoint) => {
    // The default is for the device to also report the on/off and
    // brightness at the same time as sending on/off and step commands.
    // Disable the reporting by setting the max interval to 0xFFFF.
    await reporting.brightness(endpoint, {max: 0xFFFF});
    await reporting.onOff(endpoint, {max: 0xFFFF});
};

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
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['genIdentify', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);

            await disableBatteryRotaryDimmerReporting(endpoint);
        }
    },
    onEvent: async (type, data, device) => {
        // The rotary dimmer devices appear to lose the configured reportings when they
        // re-announce themselves which they do roughly every 6 hours.
        if (type === 'deviceAnnounce') {
            for (const endpoint of device.endpoints) {
                // First disable the default reportings (for the dimmer endpoints only)
                if ([1, 2].includes(endpoint.ID)) {
                    await disableBatteryRotaryDimmerReporting(endpoint);
                }
                // Then re-apply the configured reportings
                for (const c of endpoint.configuredReportings) {
                    await endpoint.configureReporting(c.cluster.name, [{
                        attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                        maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                    }]);
                }
            }
        }
    },
});

module.exports = [
    {
        zigbeeModel: ['TWBulb51AU'],
        model: 'AU-A1GSZ9CX',
        vendor: 'Aurora',
        description: 'AOne GLS lamp 9w tunable dimmable 2200-5000K',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 454]}),
    },
    {
        zigbeeModel: ['RGBCXStrip50AU'],
        model: 'AU-A1ZBSCRGBCX',
        vendor: 'Aurora',
        description: 'RGBW LED strip controller',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [166, 400]}),
    },
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
        zigbeeModel: ['RGBGU10Bulb50AU', 'RGBGU10Bulb50AU2'],
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
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_recall, fz.command_store],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'recall_1', 'store_1'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'genScenes']);
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
        exposes: [...extend.light_onoff_brightness({noConfigure: true}).exposes,
            exposes.binary('backlight_led', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable or disable the blue backlight LED')],
        toZigbee: [...extend.light_onoff_brightness({noConfigure: true}).toZigbee, tzLocal.aOneBacklight],
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
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.brightness],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'), e.power().withEndpoint('right'),
            exposes.numeric('brightness', ea.ALL).withValueMin(0).withValueMax(254)
                .withDescription('Brightness of this backlight LED')],
        toZigbee: [tzLocal.backlight_brightness, tz.on_off],
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
