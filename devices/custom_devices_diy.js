const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const tzCustom = {
    node_config: {
        key: ['report_delay'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                report_delay: ['genPowerCfg', {0x0201: {value, type: 0x21}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
};

const fzCustom = {
    node_config: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0201)) {
                result.report_delay = msg.data[0x0201];
            }
            return result;
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['ti.router'],
        model: 'ti.router',
        vendor: 'Custom devices (DiY)',
        description: 'Texas Instruments router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(8);
            const payload = [{attribute: 'zclVersion', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.configureReporting('genBasic', payload);
        },
    },
    {
        zigbeeModel: ['lumi.router'],
        model: 'CC2530.ROUTER',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 router](http://ptvo.info/cc2530-based-zigbee-coordinator-and-router-112/)',
        fromZigbee: [fz.CC2530ROUTER_led, fz.CC2530ROUTER_meta, fz.ignore_basic_report],
        toZigbee: [tz.ptvo_switch_trigger],
        exposes: [exposes.binary('led', ea.STATE, true, false)],
    },
    {
        zigbeeModel: ['cc2538.router.v1'],
        model: 'CC2538.ROUTER.V1',
        vendor: 'Custom devices (DiY)',
        description: '[MODKAM stick СС2538 router](https://github.com/jethome-ru/zigbee-firmware/tree/master/ti/router/cc2538_cc2592)',
        fromZigbee: [fz.ignore_basic_report],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['cc2538.router.v2'],
        model: 'CC2538.ROUTER.V2',
        vendor: 'Custom devices (DiY)',
        description: '[MODKAM stick СС2538 router with temperature sensor]' +
            '(https://github.com/jethome-ru/zigbee-firmware/tree/master/ti/router/cc2538_cc2592)',
        fromZigbee: [fz.ignore_basic_report, fz.device_temperature],
        toZigbee: [],
        exposes: [e.device_temperature()],
    },
    {
        zigbeeModel: ['ptvo.switch'],
        model: 'ptvo.switch',
        vendor: 'Custom devices (DiY)',
        description: '[Multi-channel relay switch](https://ptvo.info/zigbee-switch-configurable-firmware-router-199/)',
        fromZigbee: [fz.on_off, fz.ptvo_multistate_action, fz.legacy.ptvo_switch_buttons, fz.ptvo_switch_uart,
            fz.ptvo_switch_analog_input, fz.brightness, fz.ignore_basic_report],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_uart, tz.ptvo_switch_analog_input, tz.ptvo_switch_light_brightness, tz.on_off],
        exposes: [exposes.text('action').withAccess(ea.STATE_SET)].concat(((enpoinsCount) => {
            const features = [];
            for (let i = 1; i <= enpoinsCount; i++) {
                const epName = `l${i}`;
                features.push(e.switch().withEndpoint(epName));
                features.push(exposes.text(epName, ea.ALL).withEndpoint(epName)
                    .withProperty(epName).withDescription('State or sensor value'));
            }
            return features;
        })(16)),
        meta: {multiEndpoint: true, tuyaThermostatPreset: fz.legacy /* for subclassed custom converters */},
        endpoint: (device) => {
            return {
                l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6, l7: 7, l8: 8,
                l9: 9, l10: 10, l11: 11, l12: 12, l13: 13, l14: 14, l15: 15, l16: 16,
                action: 1,
            };
        },
    },
    {
        zigbeeModel: ['DNCKAT_D001'],
        model: 'DNCKATSD001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall dimmable light switch](https://github.com/dzungpv/dnckatsw00x/)',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['DNCKAT_S001'],
        model: 'DNCKATSW001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['DNCKAT_S002'],
        model: 'DNCKATSW002',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT double key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        fromZigbee: [fz.on_off, fz.DNCKAT_S00X_buttons],
        meta: {multiEndpoint: true},
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.action(['release_left', 'hold_left', 'release_right', 'hold_right'])],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
    },
    {
        zigbeeModel: ['DNCKAT_S003'],
        model: 'DNCKATSW003',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT triple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        fromZigbee: [fz.on_off, fz.DNCKAT_S00X_buttons],
        meta: {multiEndpoint: true},
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.switch().withEndpoint('center'),
            e.action(['release_left', 'hold_left', 'release_right', 'hold_right', 'release_center', 'hold_center'])],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
    },
    {
        zigbeeModel: ['DNCKAT_S004'],
        model: 'DNCKATSW004',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT quadruple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        fromZigbee: [fz.on_off, fz.DNCKAT_S00X_buttons],
        meta: {multiEndpoint: true},
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('bottom_right'),
            e.switch().withEndpoint('top_left'), e.switch().withEndpoint('top_right'),
            e.action([
                'release_bottom_left', 'hold_bottom_left', 'release_bottom_right', 'hold_bottom_right',
                'release_top_left', 'hold_top_left', 'release_top_right', 'hold_top_right',
            ])],
        endpoint: (device) => {
            return {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4};
        },
    },
    {
        zigbeeModel: ['ZigUP'],
        model: 'ZigUP',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 based ZigBee relais, switch, sensor and router](https://github.com/formtapez/ZigUP/)',
        fromZigbee: [fz.ZigUP],
        toZigbee: [tz.on_off, tz.light_color, tz.ZigUP_lock],
        exposes: [e.switch()],
    },
    {
        zigbeeModel: ['ZWallRemote0'],
        model: 'ZWallRemote0',
        vendor: 'Custom devices (DiY)',
        description: '[Matts Wall Switch Remote](https://github.com/mattlokes/ZWallRemote)',
        fromZigbee: [fz.command_toggle],
        toZigbee: [],
        exposes: [e.action(['toggle'])],
    },
    {
        zigbeeModel: ['ZeeFlora'],
        model: 'ZeeFlora',
        vendor: 'Custom devices (DiY)',
        description: 'Flower sensor with rechargeable battery',
        fromZigbee: [fz.temperature, fz.illuminance, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 3600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.illuminance(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature()],
    },
    {
        zigbeeModel: ['EFEKTA_PWS'],
        model: 'EFEKTA_PWS',
        vendor: 'Custom devices (DiY)',
        description: '[Plant Wattering Sensor]',
        fromZigbee: [fz.temperature, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.temperature()],
    },
    {
        zigbeeModel: ['EFEKTA_THP_LR'],
        model: 'EFEKTA_THP_LR',
        vendor: 'Custom devices (DiY)',
        description: 'DIY outdoor long-range sensor for temperature, humidity and atmospheric pressure',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']);
            const overides = {min: 0, max: 64800, change: 0};
            await reporting.batteryVoltage(endpoint, overides);
            await reporting.batteryPercentageRemaining(endpoint, overides);
            await reporting.temperature(endpoint, overides);
            await reporting.humidity(endpoint, overides);
            await reporting.pressureExtended(endpoint, overides);
            await endpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure()],
    },
    {
        zigbeeModel: ['EFEKTA_ePWS'],
        model: 'EFEKTA_ePWS',
        vendor: 'Custom devices (DiY)',
        description: '[Plant wattering sensor with e-ink display](https://efektalab.com/epws102)',
        fromZigbee: [fz.temperature, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.temperature()],
    },
    {
        zigbeeModel: ['EFEKTA_eON213z'],
        model: 'EFEKTA_eON213z',
        vendor: 'Custom devices (DiY)',
        description: '[Temperature and humidity sensor with e-ink2.13](http://efektalab.com/eON213z)',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overides);
            await reporting.batteryPercentageRemaining(endpoint, overides);
            await reporting.temperature(endpoint, overides);
            await reporting.humidity(endpoint, overides);
        },
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_miniPWS'],
        model: 'EFEKTA_miniPWS',
        vendor: 'Custom devices (DiY)',
        description: '[Mini plant wattering sensor](http://efektalab.com/miniPWS)',
        fromZigbee: [fz.soil_moisture, fz.battery, fzCustom.node_config],
        toZigbee: [tz.factory_reset, tzCustom.node_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ['genPowerCfg', 'msSoilMoisture']);
        },
        exposes: [e.soil_moisture(), e.battery(),
            exposes.numeric('report_delay', ea.STATE_SET).withUnit('min').withDescription('Adjust Report Delay, by default 60 minutes')
                .withValueMin(1).withValueMax(180)],
    },
    {
        zigbeeModel: ['EFEKTA_eON213wz'],
        model: 'EFEKTA_eON213wz',
        vendor: 'Custom devices (DiY)',
        description: '[Mini weather station, digital barometer, forecast, charts, temperature, humidity](http://efektalab.com/eON213wz)',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overides);
            await reporting.batteryPercentageRemaining(endpoint, overides);
            await reporting.temperature(endpoint, overides);
            await reporting.humidity(endpoint, overides);
            await reporting.pressureExtended(endpoint, overides);
            await endpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure()],
    },
    {
        zigbeeModel: ['EFEKTA_THP'],
        model: 'EFEKTA_THP',
        vendor: 'Custom devices (DiY)',
        description: '[DIY temperature, humidity and atmospheric pressure sensor, long battery life](http://efektalab.com/eON_THP)',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overides);
            await reporting.batteryPercentageRemaining(endpoint, overides);
            await reporting.temperature(endpoint, overides);
            await reporting.humidity(endpoint, overides);
            await reporting.pressureExtended(endpoint, overides);
            await endpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure()],
    },
    {
        zigbeeModel: ['EFEKTA_PWS_Max'],
        model: 'EFEKTA_PWS_Max',
        vendor: 'Custom devices (DiY)',
        description: '[Plant watering sensor EFEKTA PWS max](http://efektalab.com/PWS_Max)',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.humidity(firstEndpoint, overides);
            await reporting.illuminance(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_PWS_MaxPro'],
        model: 'EFEKTA_PWS_MaxPro',
        vendor: 'Custom devices (DiY)',
        description: '[Plant watering sensor EFEKTA PWS Max Pro,  long battery life](http://efektalab.com/PWS_MaxPro)',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.humidity(firstEndpoint, overides);
            await reporting.illuminance(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_eON29wz'],
        model: 'EFEKTA_eON29wz',
        vendor: 'Custom devices (DiY)',
        description: '[Mini weather station, barometer, forecast, charts, temperature, humidity, light](http://efektalab.com/eON290wz)',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.illuminance, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement', 'msIlluminanceMeasurement']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overides);
            await reporting.batteryPercentageRemaining(endpoint, overides);
            await reporting.temperature(endpoint, overides);
            await reporting.humidity(endpoint, overides);
            await reporting.illuminance(endpoint, overides);
            await reporting.pressureExtended(endpoint, overides);
            await endpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.battery(), e.illuminance(), e.temperature(), e.humidity(), e.pressure()],
    },
    {
        zigbeeModel: ['EFEKTA_eFlower_Pro'],
        model: 'EFEKTA_eFlower_Pro',
        vendor: 'Custom devices (DiY)',
        description: '[Plant Wattering Sensor with e-ink display 2.13](https://efektalab.com/eFlowerPro)',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.humidity(firstEndpoint, overides);
            await reporting.illuminance(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_eTH102'],
        model: 'EFEKTA_eTH102',
        vendor: 'Custom devices (DiY)',
        description: '[Mini digital thermometer & hygrometer with e-ink1.02](http://efektalab.com/eTH102)',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [tz.factory_reset],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overides);
            await reporting.batteryPercentageRemaining(endpoint, overides);
            await reporting.temperature(endpoint, overides);
            await reporting.humidity(endpoint, overides);
        },
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
];
