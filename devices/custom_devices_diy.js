const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const constants = require('../lib/constants');
const e = exposes.presets;
const ea = exposes.access;
const {calibrateAndPrecisionRoundOptions} = require('../lib/utils');


const tzLocal = {
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
    local_time: {
        key: ['local_time'],
        convertSet: async (entity, key, value, meta) => {
            const firstEndpoint = meta.device.getEndpoint(1);
            const time = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000 + ((new Date())
                .getTimezoneOffset() * -1) * 60);
            await firstEndpoint.write('genTime', {time: time});
            return {state: {local_time: time}};
        },
    },
    co2_config: {
        key: ['auto_brightness', 'forced_recalibration', 'factory_reset_co2', 'long_chart_period', 'set_altitude',
            'manual_forced_recalibration', 'light_indicator', 'light_indicator_level'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                auto_brightness: ['msCO2', {0x0203: {value, type: 0x10}}],
                forced_recalibration: ['msCO2', {0x0202: {value, type: 0x10}}],
                factory_reset_co2: ['msCO2', {0x0206: {value, type: 0x10}}],
                long_chart_period: ['msCO2', {0x0204: {value, type: 0x10}}],
                set_altitude: ['msCO2', {0x0205: {value, type: 0x21}}],
                manual_forced_recalibration: ['msCO2', {0x0207: {value, type: 0x21}}],
                light_indicator: ['msCO2', {0x0211: {value, type: 0x10}}],
                light_indicator_level: ['msCO2', {0x0209: {value, type: 0x20}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
    temperature_config: {
        key: ['temperature_offset'],
        convertSet: async (entity, key, rawValue, meta) => {
            const value = parseInt(rawValue, 10);
            const payloads = {
                temperature_offset: ['msTemperatureMeasurement', {0x0210: {value, type: 0x29}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
    humidity_config: {
        key: ['humidity_offset'],
        convertSet: async (entity, key, rawValue, meta) => {
            const value = parseInt(rawValue, 10);
            const payloads = {
                humidity_offset: ['msRelativeHumidity', {0x0210: {value, type: 0x29}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
    termostat_config: {
        key: ['high_temperature', 'low_temperature', 'enable_temperature'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                high_temperature: ['msTemperatureMeasurement', {0x0221: {value, type: 0x29}}],
                low_temperature: ['msTemperatureMeasurement', {0x0222: {value, type: 0x29}}],
                enable_temperature: ['msTemperatureMeasurement', {0x0220: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
    hydrostat_config: {
        key: ['high_humidity', 'low_humidity', 'enable_humidity'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                high_humidity: ['msRelativeHumidity', {0x0221: {value, type: 0x21}}],
                low_humidity: ['msRelativeHumidity', {0x0222: {value, type: 0x21}}],
                enable_humidity: ['msRelativeHumidity', {0x0220: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
    co2_gasstat_config: {
        key: ['high_gas', 'low_gas', 'enable_gas'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                high_gas: ['msCO2', {0x0221: {value, type: 0x21}}],
                low_gas: ['msCO2', {0x0222: {value, type: 0x21}}],
                enable_gas: ['msCO2', {0x0220: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
};

const fzLocal = {
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
    co2: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('measuredValue')) {
                const co2 = msg.data['measuredValue'];
                return {co2: calibrateAndPrecisionRoundOptions(co2, options, 'co2')};
            }
        },
    },
    co2_config: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0203)) {
                result.auto_brightness = ['OFF', 'ON'][msg.data[0x0203]];
            }
            if (msg.data.hasOwnProperty(0x0202)) {
                result.forced_recalibration = ['OFF', 'ON'][msg.data[0x0202]];
            }
            if (msg.data.hasOwnProperty(0x0206)) {
                result.factory_reset_co2 = ['OFF', 'ON'][msg.data[0x0206]];
            }
            if (msg.data.hasOwnProperty(0x0204)) {
                result.long_chart_period = ['OFF', 'ON'][msg.data[0x0204]];
            }
            if (msg.data.hasOwnProperty(0x0205)) {
                result.set_altitude = msg.data[0x0205];
            }
            if (msg.data.hasOwnProperty(0x0207)) {
                result.manual_forced_recalibration = msg.data[0x0207];
            }
            if (msg.data.hasOwnProperty(0x0211)) {
                result.light_indicator = ['OFF', 'ON'][msg.data[0x0211]];
            }
            if (msg.data.hasOwnProperty(0x0209)) {
                result.light_indicator_level = msg.data[0x0209];
            }
            return result;
        },
    },
    temperature_config: {
        cluster: 'msTemperatureMeasurement',
        type: 'readResponse',
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0210)) {
                result.temperature_offset = msg.data[0x0210];
            }
            return result;
        },
    },
    humidity_config: {
        cluster: 'msRelativeHumidity',
        type: 'readResponse',
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0210)) {
                result.humidity_offset = msg.data[0x0210];
            }
            return result;
        },
    },
    termostat_config: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0221)) {
                result.high_temperature = msg.data[0x0221];
            }
            if (msg.data.hasOwnProperty(0x0222)) {
                result.low_temperature = msg.data[0x0222];
            }
            if (msg.data.hasOwnProperty(0x0220)) {
                result.enable_temperature = ['OFF', 'ON'][msg.data[0x0220]];
            }
            return result;
        },
    },
    hydrostat_config: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0221)) {
                result.high_humidity = msg.data[0x0221];
            }
            if (msg.data.hasOwnProperty(0x0222)) {
                result.low_humidity = msg.data[0x0222];
            }
            if (msg.data.hasOwnProperty(0x0220)) {
                result.enable_humidity = ['OFF', 'ON'][msg.data[0x0220]];
            }
            return result;
        },
    },
    co2_gasstat_config: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0221)) {
                result.high_gas = msg.data[0x0221];
            }
            if (msg.data.hasOwnProperty(0x0222)) {
                result.low_gas = msg.data[0x0222];
            }
            if (msg.data.hasOwnProperty(0x0220)) {
                result.enable_gas = ['OFF', 'ON'][msg.data[0x0220]];
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
        description: '[Plant Wattering Sensor, CR2450, CR2477 batteries, temperature ]',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.battery, fzLocal.node_config],
        toZigbee: [tz.factory_reset, tzLocal.node_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
            const payload1 = [{attribute: {ID: 0x0201, type: 0x21},
                minimumReportInterval: 0, maximumReportInterval: 21600, reportableChange: 0}];
            await firstEndpoint.configureReporting('genPowerCfg', payload1);
        },
        exposes: [e.soil_moisture(), e.battery(), e.temperature(),
            exposes.numeric('report_delay', ea.STATE_SET).withUnit('Minutes').withValueMin(1).withValueMax(240)
                .withDescription('Adjust Report Delay. Setting the time in minutes, by default 15 minutes')],
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
        fromZigbee: [fz.soil_moisture, fz.battery, fzLocal.node_config],
        toZigbee: [tz.factory_reset, tzLocal.node_config],
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
    {
        zigbeeModel: ['EFEKTA_iAQ'],
        model: 'EFEKTA_iAQ',
        vendor: 'Custom devices (DiY)',
        description: '[CO2 Monitor with IPS TFT Display, outdoor temperature and humidity, date and time](http://efektalab.com/iAQ)',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fzLocal.co2, fzLocal.co2_config,
            fzLocal.temperature_config, fzLocal.humidity_config],
        toZigbee: [tz.factory_reset, tzLocal.co2_config, tzLocal.temperature_config, tzLocal.humidity_config, tzLocal.local_time],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msCO2'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            for (const cluster of clusters) {
                await endpoint.configureReporting(cluster, [
                    {attribute: 'measuredValue', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
                ]);
            }
            const payload1 = [{attribute: {ID: 0x0203, type: 0x10},
                minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await endpoint.configureReporting('msCO2', payload1);
            const payload2 = [{attribute: {ID: 0x0202, type: 0x10},
                minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await endpoint.configureReporting('msCO2', payload2);
            const payload3 = [{attribute: {ID: 0x0204, type: 0x10},
                minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await endpoint.configureReporting('msCO2', payload3);
            const payload4 = [{attribute: {ID: 0x0205, type: 0x21},
                minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await endpoint.configureReporting('msCO2', payload4);
            const payload5 = [{attribute: {ID: 0x0206, type: 0x10},
                minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await endpoint.configureReporting('msCO2', payload5);
            const payload6 = [{attribute: {ID: 0x0207, type: 0x21},
                minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await endpoint.configureReporting('msCO2', payload6);
            const time = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000 + ((new Date())
                .getTimezoneOffset() * -1) * 60);
            const values = {time: time};
            endpoint.write('genTime', values);
        },
        exposes: [e.co2(), e.temperature(), e.humidity(), e.illuminance(),
            exposes.binary('auto_brightness', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Enable or Disable Auto Brightness of the Display'),
            exposes.binary('long_chart_period', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('The period of plotting the CO2 level(OFF - 1H | ON - 24H)'),
            exposes.numeric('set_altitude', ea.STATE_SET).withUnit('meters')
                .withDescription('Setting the altitude above sea level (for high accuracy of the CO2 sensor)')
                .withValueMin(0).withValueMax(3000),
            exposes.enum('local_time', ea.STATE_SET, ['set']).withDescription('Set date and time'),
            exposes.numeric('temperature_offset', ea.STATE_SET).withUnit('°C').withDescription('Adjust temperature')
                .withValueMin(-30).withValueMax(60),
            exposes.numeric('humidity_offset', ea.STATE_SET).withUnit('%').withDescription('Adjust humidity')
                .withValueMin(0).withValueMax(99),
            exposes.binary('forced_recalibration', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Start FRC (Perform Forced Recalibration of the CO2 Sensor)'),
            exposes.binary('factory_reset_co2', ea.STATE_SET, 'ON', 'OFF').withDescription('Factory Reset CO2 sensor'),
            exposes.numeric('manual_forced_recalibration', ea.STATE_SET).withUnit('ppm')
                .withDescription('Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)')
                .withValueMin(0).withValueMax(5000)],
    },
    {
        zigbeeModel: ['EFEKTA_CO2_Smart_Monitor'],
        model: 'EFEKTA_CO2_Smart_Monitor',
        vendor: 'Custom devices (DiY)',
        description: '[EFEKTA CO2 Smart Monitor, ws2812b indicator, can control the relay, binding](https://efektalab.com/CO2_Monitor)',
        fromZigbee: [fz.temperature, fz.humidity, fzLocal.co2, fzLocal.co2_config, fzLocal.temperature_config,
            fzLocal.humidity_config, fzLocal.termostat_config, fzLocal.hydrostat_config, fzLocal.co2_gasstat_config],
        toZigbee: [tz.factory_reset, tzLocal.co2_config, tzLocal.temperature_config, tzLocal.humidity_config,
            tzLocal.termostat_config, tzLocal.hydrostat_config, tzLocal.co2_gasstat_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msCO2'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            for (const cluster of clusters) {
                await endpoint.configureReporting(cluster, [
                    {attribute: 'measuredValue', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
                ]);
            }
        },
        exposes: [e.co2(), e.temperature(), e.humidity(),
            exposes.binary('light_indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable or Disable light_indicator'),
            exposes.numeric('light_indicator_level', ea.STATE_SET).withUnit('%').withDescription('light_indicator_level')
                .withValueMin(0).withValueMax(100),
            exposes.numeric('set_altitude', ea.STATE_SET).withUnit('meters')
                .withDescription('Setting the altitude above sea level (for high accuracy of the CO2 sensor)')
                .withValueMin(0).withValueMax(3000),
            exposes.numeric('temperature_offset', ea.STATE_SET).withUnit('°C').withDescription('Adjust temperature')
                .withValueMin(-30).withValueMax(60),
            exposes.numeric('humidity_offset', ea.STATE_SET).withUnit('%').withDescription('Adjust humidity')
                .withValueMin(0).withValueMax(99),
            exposes.binary('forced_recalibration', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Start FRC (Perform Forced Recalibration of the CO2 Sensor)'),
            exposes.numeric('manual_forced_recalibration', ea.STATE_SET)
                .withUnit('ppm').withDescription('Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)')
                .withValueMin(0).withValueMax(5000),
            exposes.binary('factory_reset_co2', ea.STATE_SET, 'ON', 'OFF').withDescription('Factory Reset CO2 sensor'),
            exposes.binary('enable_gas', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable CO2 Gas Control'),
            exposes.numeric('high_gas', ea.STATE_SET).withUnit('ppm').withDescription('Setting High CO2 Gas Border')
                .withValueMin(400).withValueMax(2000),
            exposes.numeric('low_gas', ea.STATE_SET).withUnit('ppm').withDescription('Setting Low CO2 Gas Border')
                .withValueMin(400).withValueMax(2000),
            exposes.binary('enable_temperature', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Temperature Control'),
            exposes.numeric('high_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting High Temperature Border')
                .withValueMin(-5).withValueMax(50),
            exposes.numeric('low_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting Low Temperature Border')
                .withValueMin(-5).withValueMax(50),
            exposes.binary('enable_humidity', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Humidity Control'),
            exposes.numeric('high_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting High Humidity Border')
                .withValueMin(0).withValueMax(99),
            exposes.numeric('low_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting Low Humidity Border')
                .withValueMin(0).withValueMax(99)],
    },
    {
        zigbeeModel: ['SNZB-02_EFEKTA'],
        model: 'SNZB-02_EFEKTA',
        vendor: 'Custom devices (DiY)',
        description: 'Alternative firmware for the SONOFF SNZB-02 sensor from EfektaLab, DIY',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery, fzLocal.termostat_config, fzLocal.hydrostat_config, fzLocal.node_config],
        toZigbee: [tz.factory_reset, tzLocal.termostat_config, tzLocal.hydrostat_config, tzLocal.node_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overides);
            await reporting.batteryPercentageRemaining(endpoint, overides);
        },
        exposes: [e.battery(), e.temperature(), e.humidity(),
            exposes.numeric('report_delay', ea.STATE_SET).withUnit('Minutes')
                .withDescription('Adjust Report Delay. Setting the time in minutes, by default 5 minutes')
                .withValueMin(1).withValueMax(60),
            exposes.binary('enable_temperature', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Temperature Control'),
            exposes.numeric('high_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting High Temperature Border')
                .withValueMin(-5).withValueMax(50),
            exposes.numeric('low_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting Low Temperature Border')
                .withValueMin(-5).withValueMax(50),
            exposes.binary('enable_humidity', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Humidity Control'),
            exposes.numeric('high_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting High Humidity Border')
                .withValueMin(0).withValueMax(99),
            exposes.numeric('low_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting Low Humidity Border')
                .withValueMin(0).withValueMax(99)],
    },
    {
        zigbeeModel: ['UT-02'],
        model: 'EFR32MG21.Router',
        vendor: 'Custom devices (DiY)',
        description: 'EFR32MG21 router',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
];
