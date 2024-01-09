import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import {Definition, Tz, Fz, KeyValueAny, KeyValue, Zh, Expose} from '../lib/types';
import * as reporting from '../lib/reporting';
import * as ota from '../lib/ota';
import extend from '../lib/extend';
import * as constants from '../lib/constants';
const e = exposes.presets;
const ea = exposes.access;
import {getFromLookup, getKey, postfixWithEndpointName, isEndpoint} from '../lib/utils';
import {light, onOff} from '../lib/modernExtend';

const switchTypesList = {
    'switch': 0x00,
    'multi-click': 0x02,
};

const tzLocal = {
    tirouter: {
        key: ['transmit_power'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genBasic', {0x1337: {value, type: 0x28}});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genBasic', [0x1337]);
        },
    } satisfies Tz.Converter,
    node_config: {
        key: ['report_delay'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            // @ts-expect-error
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads: KeyValueAny = {
                report_delay: ['genPowerCfg', {0x0201: {value, type: 0x21}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    } satisfies Tz.Converter,
    local_time: {
        key: ['local_time'],
        convertSet: async (entity, key, value, meta) => {
            const firstEndpoint = meta.device.getEndpoint(1);
            const time = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000 + ((new Date())
                .getTimezoneOffset() * -1) * 60);
            await firstEndpoint.write('genTime', {time: time});
            return {state: {local_time: time}};
        },
    } satisfies Tz.Converter,
    co2_config: {
        key: ['auto_brightness', 'forced_recalibration', 'factory_reset_co2', 'long_chart_period', 'set_altitude',
            'manual_forced_recalibration', 'light_indicator', 'light_indicator_level'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            // @ts-expect-error
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads: KeyValueAny = {
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
    } satisfies Tz.Converter,
    temperature_config: {
        key: ['temperature_offset'],
        convertSet: async (entity, key, rawValue, meta) => {
            // @ts-expect-error
            const value = parseInt(rawValue, 10);
            const payloads: KeyValueAny = {
                temperature_offset: ['msTemperatureMeasurement', {0x0210: {value, type: 0x29}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    } satisfies Tz.Converter,
    humidity_config: {
        key: ['humidity_offset'],
        convertSet: async (entity, key, rawValue, meta) => {
            // @ts-expect-error
            const value = parseInt(rawValue, 10);
            const payloads: KeyValueAny = {
                humidity_offset: ['msRelativeHumidity', {0x0210: {value, type: 0x29}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    } satisfies Tz.Converter,
    thermostat_config: {
        key: ['high_temperature', 'low_temperature', 'enable_temperature'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            // @ts-expect-error
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads: KeyValueAny = {
                high_temperature: ['msTemperatureMeasurement', {0x0221: {value, type: 0x29}}],
                low_temperature: ['msTemperatureMeasurement', {0x0222: {value, type: 0x29}}],
                enable_temperature: ['msTemperatureMeasurement', {0x0220: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    } satisfies Tz.Converter,
    hydrostat_config: {
        key: ['high_humidity', 'low_humidity', 'enable_humidity'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            // @ts-expect-error
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads: KeyValueAny = {
                high_humidity: ['msRelativeHumidity', {0x0221: {value, type: 0x21}}],
                low_humidity: ['msRelativeHumidity', {0x0222: {value, type: 0x21}}],
                enable_humidity: ['msRelativeHumidity', {0x0220: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    } satisfies Tz.Converter,
    co2_gasstat_config: {
        key: ['high_gas', 'low_gas', 'enable_gas'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            // @ts-expect-error
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads: KeyValueAny = {
                high_gas: ['msCO2', {0x0221: {value, type: 0x21}}],
                low_gas: ['msCO2', {0x0222: {value, type: 0x21}}],
                enable_gas: ['msCO2', {0x0220: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    } satisfies Tz.Converter,
    multi_zig_sw_switch_type: {
        key: ['switch_type_1', 'switch_type_2', 'switch_type_3', 'switch_type_4'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOffSwitchCfg', ['switchType']);
        },
        convertSet: async (entity, key, value, meta) => {
            const data = getFromLookup(value, switchTypesList);
            const payload = {switchType: data};
            await entity.write('genOnOffSwitchCfg', payload);
            return {state: {[`${key}`]: value}};
        },
    } satisfies Tz.Converter,
    ptvo_on_off: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            return await tz.on_off.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            const cluster = 'genOnOff';
            if (isEndpoint(entity) && (entity.supportsInputCluster(cluster) || entity.supportsOutputCluster(cluster))) {
                return await tz.on_off.convertGet(entity, key, meta);
            }
            return;
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    tirouter: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {linkquality: msg.linkquality};
            if (msg.data['4919']) result['transmit_power'] = msg.data['4919'];
            return result;
        },
    } satisfies Fz.Converter,
    node_config: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty(0x0201)) {
                result.report_delay = msg.data[0x0201];
            }
            return result;
        },
    } satisfies Fz.Converter,
    co2: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('measuredValue')) {
                const co2 = msg.data['measuredValue'];
                return {co2};
            }
        },
    } satisfies Fz.Converter,
    co2_config: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
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
    } satisfies Fz.Converter,
    temperature_config: {
        cluster: 'msTemperatureMeasurement',
        type: 'readResponse',
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty(0x0210)) {
                result.temperature_offset = msg.data[0x0210];
            }
            return result;
        },
    } satisfies Fz.Converter,
    humidity_config: {
        cluster: 'msRelativeHumidity',
        type: 'readResponse',
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty(0x0210)) {
                result.humidity_offset = msg.data[0x0210];
            }
            return result;
        },
    } satisfies Fz.Converter,
    thermostat_config: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
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
    } satisfies Fz.Converter,
    hydrostat_config: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
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
    } satisfies Fz.Converter,
    co2_gasstat_config: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
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
    } satisfies Fz.Converter,
    humidity2: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // multi-endpoint version based on the stastard onverter 'fz.humidity'
            const humidity = parseFloat(msg.data['measuredValue']) / 100.0;

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales, it should only publish message
            // in the 0 - 100 range, don't produce messages beyond these values.
            if (humidity >= 0 && humidity <= 100) {
                const multiEndpoint = model.meta && model.meta.hasOwnProperty('multiEndpoint') && model.meta.multiEndpoint;
                const property = (multiEndpoint)? postfixWithEndpointName('humidity', msg, model, meta): 'humidity';
                return {[property]: humidity};
            }
        },
    } satisfies Fz.Converter,
    illuminance2: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // multi-endpoint version based on the stastard onverter 'fz.illuminance'
            // DEPRECATED: only return lux here (change illuminance_lux -> illuminance)
            const illuminance = msg.data['measuredValue'];
            const illuminanceLux = illuminance === 0 ? 0 : Math.pow(10, (illuminance - 1) / 10000);
            const multiEndpoint = model.meta && model.meta.hasOwnProperty('multiEndpoint') && model.meta.multiEndpoint;
            const property1 = (multiEndpoint)? postfixWithEndpointName('illuminance', msg, model, meta): 'illuminance';
            const property2 = (multiEndpoint)? postfixWithEndpointName('illuminance_lux', msg, model, meta): 'illuminance_lux';
            return {[property1]: illuminance, [property2]: illuminanceLux};
        },
    } satisfies Fz.Converter,
    pressure2: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // multi-endpoint version based on the stastard onverter 'fz.pressure'
            let pressure = 0;
            if (msg.data.hasOwnProperty('scaledValue')) {
                const scale = msg.endpoint.getClusterAttributeValue('msPressureMeasurement', 'scale') as number;
                pressure = msg.data['scaledValue'] / Math.pow(10, scale) / 100.0; // convert to hPa
            } else {
                pressure = parseFloat(msg.data['measuredValue']);
            }
            const multiEndpoint = model.meta && model.meta.hasOwnProperty('multiEndpoint') && model.meta.multiEndpoint;
            const property = (multiEndpoint)? postfixWithEndpointName('pressure', msg, model, meta): 'pressure';
            return {[property]: pressure};
        },
    } satisfies Fz.Converter,
    multi_zig_sw_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const voltage = msg.data['batteryVoltage'] * 100;
            const battery = (voltage - 2200) / 8;
            return {battery: battery > 100 ? 100 : battery, voltage: voltage};
        },
    } satisfies Fz.Converter,
    multi_zig_sw_switch_buttons: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint?.(msg.device) ?? {}, msg.endpoint.ID);
            const actionLookup: { [key: number]: string } = {0: 'release', 1: 'single', 2: 'double', 3: 'triple', 4: 'hold'};
            const value = msg.data['presentValue'];
            const action = actionLookup[value];
            return {action: button + '_' + action};
        },
    } satisfies Fz.Converter,
    multi_zig_sw_switch_config: {
        cluster: 'genOnOffSwitchCfg',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const channel = getKey(model.endpoint?.(msg.device) ?? {}, msg.endpoint.ID);
            const {switchType} = msg.data;
            return {[`switch_type_${channel}`]: getKey(switchTypesList, switchType)};
        },
    } satisfies Fz.Converter,
};

function ptvoGetMetaOption(device: Zh.Device, key: string, defaultValue: unknown) {
    if (device != null) {
        const value = device.meta[key];
        if (value === undefined) {
            return defaultValue;
        } else {
            return value;
        }
    }

    return defaultValue;
}

function ptvoSetMetaOption(device: Zh.Device, key: string, value: unknown) {
    if (device != null && key != null) {
        device.meta[key] = value;
    }
}

function ptvoAddStandardExposes(endpoint: Zh.Endpoint, expose: Expose[], options: KeyValue, deviceOptions: KeyValue) {
    const epId = endpoint.ID;
    const epName = `l${epId}`;
    if (endpoint.supportsInputCluster('lightingColorCtrl')) {
        expose.push(e.light_brightness_colorxy().withEndpoint('l1').withEndpoint(epName));
        options['exposed_onoff'] = true;
        options['exposed_analog'] = true;
        options['exposed_colorcontrol'] = true;
    } else if (endpoint.supportsInputCluster('genLevelCtrl')) {
        expose.push(e.light_brightness().withEndpoint(epName));
        options['exposed_onoff'] = true;
        options['exposed_analog'] = true;
        options['exposed_levelcontrol'] = true;
    }
    if (endpoint.supportsInputCluster('genOnOff') || endpoint.supportsOutputCluster('genOnOff')) {
        if (!options['exposed_onoff']) {
            expose.push(e.switch().withEndpoint(epName));
        }
    }
    if (endpoint.supportsInputCluster('genAnalogInput') || endpoint.supportsOutputCluster('genAnalogInput')) {
        if (!options['exposed_analog']) {
            options['exposed_analog'] = true;
            expose.push(e.text(epName, ea.ALL).withEndpoint(epName)
                .withProperty(epName).withDescription('State or sensor value'));
        }
    }
    if (endpoint.supportsInputCluster('msTemperatureMeasurement')) {
        expose.push(e.temperature().withEndpoint(epName));
        options['exposed_temperature'] = true;
    }
    if (endpoint.supportsInputCluster('msRelativeHumidity')) {
        expose.push(e.humidity().withEndpoint(epName));
        options['exposed_humidity'] = true;
    }
    if (endpoint.supportsInputCluster('msPressureMeasurement')) {
        expose.push(e.pressure().withEndpoint(epName));
        options['exposed_pressure'] = true;
    }
    if (endpoint.supportsInputCluster('msIlluminanceMeasurement')) {
        expose.push(e.illuminance().withEndpoint(epName));
        options['exposed_illuminance'] = true;
    }
    if (endpoint.supportsInputCluster('genPowerCfg')) {
        deviceOptions['expose_battery'] = true;
    }
    if (endpoint.supportsInputCluster('genMultistateInput') || endpoint.supportsOutputCluster('genMultistateInput')) {
        deviceOptions['expose_action'] = true;
    }
}

const definitions: Definition[] = [
    {
        zigbeeModel: ['ti.router'],
        model: 'ti.router',
        vendor: 'Custom devices (DiY)',
        description: 'Texas Instruments router',
        fromZigbee: [fzLocal.tirouter],
        toZigbee: [tzLocal.tirouter],
        exposes: [e.numeric('transmit_power', ea.ALL).withValueMin(-20).withValueMax(20).withValueStep(1).withUnit('dBm')
            .withDescription('Transmit power, supported from firmware 20221102. The max for CC1352 is 20 dBm and 5 dBm for CC2652' +
                            ' (any higher value is converted to 5dBm)')],
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
        exposes: [e.binary('led', ea.STATE, true, false)],
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
        description: '[Multi-functional device](https://ptvo.info/zigbee-configurable-firmware-features/)',
        fromZigbee: [fz.on_off, fz.ptvo_multistate_action, legacy.fz.ptvo_switch_buttons, fz.ptvo_switch_uart,
            fz.ptvo_switch_analog_input, fz.brightness, fz.ignore_basic_report, fz.temperature,
            fzLocal.humidity2, fzLocal.pressure2, fzLocal.illuminance2],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_uart, tz.ptvo_switch_analog_input, tz.ptvo_switch_light_brightness, tzLocal.ptvo_on_off],
        exposes: (device, options) => {
            const expose: Expose[] = [];
            const exposeDeviceOptions: KeyValue = {};
            const deviceConfig = ptvoGetMetaOption(device, 'device_config', '');
            if (deviceConfig === '') {
                if ((device != null) && device.endpoints) {
                    for (const endpoint of device.endpoints) {
                        const exposeEpOptions: KeyValue = {};
                        ptvoAddStandardExposes(endpoint, expose, exposeEpOptions, exposeDeviceOptions);
                    }
                } else {
                    // fallback code
                    for (let epId = 1; epId <= 8; epId++) {
                        const epName = `l${epId}`;
                        expose.push(e.text(epName, ea.ALL).withEndpoint(epName)
                            .withProperty(epName).withDescription('State or sensor value'));
                        expose.push(e.switch().withEndpoint(epName));
                    }
                }
            } else {
                // device configuration description from a device
                const deviceConfigArray = deviceConfig.split(/[\r\n]+/);
                const allEndpoints: { [key: number]: string } = {};
                const allEndpointsSorted = [];
                for (let i = 0; i < deviceConfigArray.length; i++) {
                    const epConfig = deviceConfigArray[i];
                    const epId = parseInt(epConfig.substr(0, 1), 16);
                    if (epId <= 0) {
                        continue;
                    }
                    allEndpoints[epId] = epConfig;
                    allEndpointsSorted.push(epId);
                }

                for (const endpoint of device.endpoints) {
                    if (allEndpoints.hasOwnProperty(endpoint.ID)) {
                        continue;
                    }
                    allEndpointsSorted.push(endpoint.ID);
                    allEndpoints[endpoint.ID] = '';
                }
                allEndpointsSorted.sort();

                let prevEp = -1;
                for (let i = 0; i < allEndpointsSorted.length; i++) {
                    const epId = allEndpointsSorted[i];
                    const epConfig = allEndpoints[epId];
                    if (epId <= 0) {
                        continue;
                    }
                    const epName = `l${epId}`;
                    const epValueAccessRights = epConfig.substr(1, 1);
                    const epStateType = ((epValueAccessRights === 'W') || (epValueAccessRights === '*'))?
                        ea.STATE_SET: ea.STATE;
                    const valueConfig = epConfig.substr(2);
                    const valueConfigItems = (valueConfig)? valueConfig.split(','): [];
                    let valueId = (valueConfigItems[0])? valueConfigItems[0]: '';
                    let valueDescription = (valueConfigItems[1])? valueConfigItems[1]: '';
                    let valueUnit = (valueConfigItems[2] !== undefined)? valueConfigItems[2]: '';
                    const exposeEpOptions: KeyValue = {};
                    if (valueId === '*') {
                        // GPIO output (Generic)
                        exposeEpOptions['exposed_onoff'] = true;
                        expose.push(e.switch().withEndpoint(epName));
                    } else if (valueId === '#') {
                        // GPIO state (contact, gas, noise, occupancy, presence, smoke, sos, tamper, vibration, water leak)
                        exposeEpOptions['exposed_onoff'] = true;
                        let exposeObj = undefined;
                        switch (valueDescription) {
                        case 'g': exposeObj = e.gas(); break;
                        case 'n': exposeObj = e.noise_detected(); break;
                        case 'o': exposeObj = e.occupancy(); break;
                        case 'p': exposeObj = e.presence(); break;
                        case 'm': exposeObj = e.smoke(); break;
                        case 's': exposeObj = e.sos(); break;
                        case 't': exposeObj = e.tamper(); break;
                        case 'v': exposeObj = e.vibration(); break;
                        case 'w': exposeObj = e.water_leak(); break;
                        default: // 'c'
                            exposeObj = e.contact();
                        }
                        expose.push(exposeObj.withEndpoint(epName));
                    } else if (valueConfigItems.length > 0) {
                        let valueName = undefined; // name in Z2M
                        let valueNumIndex = undefined;
                        const idxPos = valueId.search(/(\d+)$/);
                        if (valueId.startsWith('mcpm') || valueId.startsWith('ncpm')) {
                            const num = parseInt(valueId.substr(4, 1), 16);
                            valueName = valueId.substr(0, 4) + num;
                        } else if (idxPos >= 0) {
                            valueNumIndex = valueId.substr(idxPos);
                            valueId = valueId.substr(0, idxPos);
                        }

                        // analog value
                        // 1: value name (if empty, use the EP name)
                        // 2: description (if empty or undefined, use the value name)
                        // 3: units (if undefined, use the key name)
                        const infoLookup: { [key: string]: string } = {
                            'C': 'temperature',
                            '%': 'humidity',
                            'm': 'altitude',
                            'Pa': 'pressure',
                            'ppm': 'quality',
                            'psize': 'particle_size',
                            'V': 'voltage',
                            'A': 'current',
                            'Wh': 'energy',
                            'W': 'power',
                            'Hz': 'frequency',
                            'pf': 'power_factor',
                            'lx': 'illuminance_lux',
                        };
                        valueName = (valueName !== undefined)? valueName: infoLookup[valueId];

                        if ((valueName === undefined) && valueNumIndex) {
                            valueName = 'val' + valueNumIndex;
                        }

                        valueName = (valueName === undefined)? epName: valueName + '_' + epName;

                        if ((valueDescription === undefined) || (valueDescription === '')) {
                            if (infoLookup[valueId]) {
                                valueDescription = infoLookup[valueId];
                                valueDescription = valueDescription.replace('_', ' ');
                            } else {
                                valueDescription = 'Sensor value';
                            }
                        }
                        valueDescription = valueDescription.substring(0, 1).toUpperCase() +
                            valueDescription.substring(1);

                        if (valueNumIndex) {
                            valueDescription = valueDescription + ' ' + valueNumIndex;
                        }

                        if (((valueUnit === undefined) || (valueUnit === '')) && infoLookup[valueId]) {
                            valueUnit = valueId;
                        }

                        exposeEpOptions['exposed_analog'] = true;
                        expose.push(e.numeric(valueName, epStateType)
                            .withValueMin(-9999999).withValueMax(9999999).withValueStep(1)
                            .withDescription(valueDescription)
                            .withUnit(valueUnit));
                    }
                    const endpoint = device.getEndpoint(epId);
                    if (!endpoint) {
                        continue;
                    }
                    if (prevEp !== epId) {
                        prevEp = epId;
                        ptvoAddStandardExposes(endpoint, expose, exposeEpOptions, exposeDeviceOptions);
                    }
                }
            }
            if (exposeDeviceOptions['expose_action']) {
                expose.push(e.action(['single', 'double', 'triple', 'hold', 'release']));
            }
            if (exposeDeviceOptions['expose_battery']) {
                expose.push(e.battery());
            }
            expose.push(e.linkquality());
            return expose;
        },
        meta: {multiEndpoint: true, tuyaThermostatPreset: legacy.fz /* for subclassed custom converters */},
        endpoint: (device) => {
            // eslint-disable-next-line
            const endpointList: any = [];
            const deviceConfig = ptvoGetMetaOption(device, 'device_config', '');
            if (deviceConfig === '') {
                if ((device != null) && device.endpoints) {
                    for (const endpoint of device.endpoints) {
                        const epId = endpoint.ID;
                        const epName = `l${epId}`;
                        endpointList[epName] = epId;
                    }
                } else {
                    // fallback code
                    for (let epId = 1; epId <= 8; epId++) {
                        const epName = `l${epId}`;
                        endpointList[epName] = epId;
                    }
                }
            } else {
                for (let i = 0; i < deviceConfig.length; i++) {
                    const epConfig = deviceConfig.charCodeAt(i);
                    if (epConfig === 0x20) {
                        continue;
                    }
                    const epId = i + 1;
                    const epName = `l${epId}`;
                    endpointList[epName] = epId;
                }
            }
            endpointList['action'] = 1;
            return endpointList;
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            if (device != null) {
                const controlEp = device.getEndpoint(1);
                if (controlEp != null) {
                    try {
                        let deviceConfig = await controlEp.read('genBasic', [32768]);
                        if (deviceConfig) {
                            deviceConfig = deviceConfig['32768'];
                            ptvoSetMetaOption(device, 'device_config', deviceConfig);
                            device.save();
                        }
                    } catch (err) {/* do nothing */}
                }
            }
        },
    },
    {
        zigbeeModel: ['DNCKAT_D001'],
        model: 'DNCKATSD001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall dimmable light switch](https://github.com/dzungpv/dnckatsw00x/)',
        extend: [light()],
    },
    {
        zigbeeModel: ['DNCKAT_S001'],
        model: 'DNCKATSW001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        extend: [onOff()],
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
        toZigbee: [],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overrides = {min: 0, max: 3600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.illuminance(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature()],
    },
    {
        zigbeeModel: ['EFEKTA_PWS'],
        model: 'EFEKTA_PWS',
        vendor: 'Custom devices (DiY)',
        description: '[Plant Wattering Sensor, CR2450, CR2477 batteries, temperature ]',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.battery, fzLocal.node_config],
        toZigbee: [tzLocal.node_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msSoilMoisture']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
            const payload1 = [{attribute: {ID: 0x0201, type: 0x21},
                minimumReportInterval: 0, maximumReportInterval: 21600, reportableChange: 0}];
            await firstEndpoint.configureReporting('genPowerCfg', payload1);
        },
        exposes: [e.soil_moisture(), e.battery(), e.temperature(),
            e.numeric('report_delay', ea.STATE_SET).withUnit('min').withValueMin(1).withValueMax(240)
                .withDescription('Adjust Report Delay. Setting the time in minutes, by default 15 minutes')],
    },
    {
        zigbeeModel: ['EFEKTA_THP_LR'],
        model: 'EFEKTA_THP_LR',
        vendor: 'Custom devices (DiY)',
        description: 'DIY outdoor long-range sensor for temperature, humidity and atmospheric pressure',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']);
            const overrides = {min: 0, max: 64800, change: 0};
            await reporting.batteryVoltage(endpoint, overrides);
            await reporting.batteryPercentageRemaining(endpoint, overrides);
            await reporting.temperature(endpoint, overrides);
            await reporting.humidity(endpoint, overrides);
            await reporting.pressureExtended(endpoint, overrides);
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
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msSoilMoisture']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.temperature()],
    },
    {
        zigbeeModel: ['EFEKTA_eON213z'],
        model: 'EFEKTA_eON213z',
        vendor: 'Custom devices (DiY)',
        description: '[Temperature and humidity sensor with e-ink2.13](http://efektalab.com/eON213z)',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overrides);
            await reporting.batteryPercentageRemaining(endpoint, overrides);
            await reporting.temperature(endpoint, overrides);
            await reporting.humidity(endpoint, overrides);
        },
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_miniPWS'],
        model: 'EFEKTA_miniPWS',
        vendor: 'Custom devices (DiY)',
        description: '[Mini plant wattering sensor](http://efektalab.com/miniPWS)',
        fromZigbee: [fz.soil_moisture, fz.battery, fzLocal.node_config],
        toZigbee: [tzLocal.node_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ['genPowerCfg', 'msSoilMoisture']);
        },
        exposes: [e.soil_moisture(), e.battery(),
            e.numeric('report_delay', ea.STATE_SET).withUnit('min').withDescription('Adjust Report Delay, by default 60 minutes')
                .withValueMin(1).withValueMax(180)],
    },
    {
        zigbeeModel: ['EFEKTA_eON213wz'],
        model: 'EFEKTA_eON213wz',
        vendor: 'Custom devices (DiY)',
        description: '[Mini weather station, digital barometer, forecast, charts, temperature, humidity](http://efektalab.com/eON213wz)',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overrides);
            await reporting.batteryPercentageRemaining(endpoint, overrides);
            await reporting.temperature(endpoint, overrides);
            await reporting.humidity(endpoint, overrides);
            await reporting.pressureExtended(endpoint, overrides);
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
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overrides);
            await reporting.batteryPercentageRemaining(endpoint, overrides);
            await reporting.temperature(endpoint, overrides);
            await reporting.humidity(endpoint, overrides);
            await reporting.pressureExtended(endpoint, overrides);
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
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.humidity(firstEndpoint, overrides);
            await reporting.illuminance(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_PWS_MaxPro'],
        model: 'EFEKTA_PWS_MaxPro',
        vendor: 'Custom devices (DiY)',
        description: '[Plant watering sensor EFEKTA PWS Max Pro,  long battery life](http://efektalab.com/PWS_MaxPro)',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.humidity(firstEndpoint, overrides);
            await reporting.illuminance(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_eON29wz'],
        model: 'EFEKTA_eON29wz',
        vendor: 'Custom devices (DiY)',
        description: '[Mini weather station, barometer, forecast, charts, temperature, humidity, light](http://efektalab.com/eON290wz)',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.illuminance, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement', 'msIlluminanceMeasurement']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overrides);
            await reporting.batteryPercentageRemaining(endpoint, overrides);
            await reporting.temperature(endpoint, overrides);
            await reporting.humidity(endpoint, overrides);
            await reporting.illuminance(endpoint, overrides);
            await reporting.pressureExtended(endpoint, overrides);
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
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msSoilMoisture']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.humidity(firstEndpoint, overrides);
            await reporting.illuminance(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['EFEKTA_eTH102'],
        model: 'EFEKTA_eTH102',
        vendor: 'Custom devices (DiY)',
        description: '[Mini digital thermometer & hygrometer with e-ink1.02](http://efektalab.com/eTH102)',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overrides);
            await reporting.batteryPercentageRemaining(endpoint, overrides);
            await reporting.temperature(endpoint, overrides);
            await reporting.humidity(endpoint, overrides);
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
        toZigbee: [tzLocal.co2_config, tzLocal.temperature_config, tzLocal.humidity_config, tzLocal.local_time],
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
            e.binary('auto_brightness', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Enable or Disable Auto Brightness of the Display'),
            e.binary('long_chart_period', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('The period of plotting the CO2 level(OFF - 1H | ON - 24H)'),
            e.numeric('set_altitude', ea.STATE_SET).withUnit('meters')
                .withDescription('Setting the altitude above sea level (for high accuracy of the CO2 sensor)')
                .withValueMin(0).withValueMax(3000),
            e.enum('local_time', ea.STATE_SET, ['set']).withDescription('Set date and time'),
            e.numeric('temperature_offset', ea.STATE_SET).withUnit('°C').withDescription('Adjust temperature')
                .withValueMin(-30).withValueMax(60),
            e.numeric('humidity_offset', ea.STATE_SET).withUnit('%').withDescription('Adjust humidity')
                .withValueMin(0).withValueMax(99),
            e.binary('forced_recalibration', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Start FRC (Perform Forced Recalibration of the CO2 Sensor)'),
            e.binary('factory_reset_co2', ea.STATE_SET, 'ON', 'OFF').withDescription('Factory Reset CO2 sensor'),
            e.numeric('manual_forced_recalibration', ea.STATE_SET).withUnit('ppm')
                .withDescription('Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)')
                .withValueMin(0).withValueMax(5000)],
    },
    {
        zigbeeModel: ['EFEKTA_CO2_Smart_Monitor'],
        model: 'EFEKTA_CO2_Smart_Monitor',
        vendor: 'Custom devices (DiY)',
        description: '[EFEKTA CO2 Smart Monitor, ws2812b indicator, can control the relay, binding](https://efektalab.com/CO2_Monitor)',
        fromZigbee: [fz.temperature, fz.humidity, fzLocal.co2, fzLocal.co2_config, fzLocal.temperature_config,
            fzLocal.humidity_config, fzLocal.thermostat_config, fzLocal.hydrostat_config, fzLocal.co2_gasstat_config],
        toZigbee: [tzLocal.co2_config, tzLocal.temperature_config, tzLocal.humidity_config,
            tzLocal.thermostat_config, tzLocal.hydrostat_config, tzLocal.co2_gasstat_config],
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
            e.binary('light_indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable or Disable light_indicator'),
            e.numeric('light_indicator_level', ea.STATE_SET).withUnit('%').withDescription('light_indicator_level')
                .withValueMin(0).withValueMax(100),
            e.numeric('set_altitude', ea.STATE_SET).withUnit('meters')
                .withDescription('Setting the altitude above sea level (for high accuracy of the CO2 sensor)')
                .withValueMin(0).withValueMax(3000),
            e.numeric('temperature_offset', ea.STATE_SET).withUnit('°C').withDescription('Adjust temperature')
                .withValueMin(-30).withValueMax(60),
            e.numeric('humidity_offset', ea.STATE_SET).withUnit('%').withDescription('Adjust humidity')
                .withValueMin(0).withValueMax(99),
            e.binary('forced_recalibration', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Start FRC (Perform Forced Recalibration of the CO2 Sensor)'),
            e.numeric('manual_forced_recalibration', ea.STATE_SET)
                .withUnit('ppm').withDescription('Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)')
                .withValueMin(0).withValueMax(5000),
            e.binary('factory_reset_co2', ea.STATE_SET, 'ON', 'OFF').withDescription('Factory Reset CO2 sensor'),
            e.binary('enable_gas', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable CO2 Gas Control'),
            e.numeric('high_gas', ea.STATE_SET).withUnit('ppm').withDescription('Setting High CO2 Gas Border')
                .withValueMin(400).withValueMax(2000),
            e.numeric('low_gas', ea.STATE_SET).withUnit('ppm').withDescription('Setting Low CO2 Gas Border')
                .withValueMin(400).withValueMax(2000),
            e.binary('enable_temperature', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Temperature Control'),
            e.numeric('high_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting High Temperature Border')
                .withValueMin(-5).withValueMax(50),
            e.numeric('low_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting Low Temperature Border')
                .withValueMin(-5).withValueMax(50),
            e.binary('enable_humidity', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Humidity Control'),
            e.numeric('high_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting High Humidity Border')
                .withValueMin(0).withValueMax(99),
            e.numeric('low_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting Low Humidity Border')
                .withValueMin(0).withValueMax(99)],
    },
    {
        zigbeeModel: ['SNZB-02_EFEKTA'],
        model: 'SNZB-02_EFEKTA',
        vendor: 'Custom devices (DiY)',
        description: 'Alternative firmware for the SONOFF SNZB-02 sensor from EfektaLab, DIY',
        fromZigbee: [fz.SNZB02_temperature, fz.SNZB02_humidity, fz.battery, fzLocal.thermostat_config,
            fzLocal.hydrostat_config, fzLocal.node_config],
        toZigbee: [tzLocal.thermostat_config, tzLocal.hydrostat_config, tzLocal.node_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            const overrides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(endpoint, overrides);
            await reporting.batteryPercentageRemaining(endpoint, overrides);
        },
        exposes: [e.battery(), e.temperature(), e.humidity(),
            e.numeric('report_delay', ea.STATE_SET).withUnit('min')
                .withDescription('Adjust Report Delay. Setting the time in minutes, by default 5 minutes')
                .withValueMin(1).withValueMax(60),
            e.binary('enable_temperature', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Temperature Control'),
            e.numeric('high_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting High Temperature Border')
                .withValueMin(-5).withValueMax(50),
            e.numeric('low_temperature', ea.STATE_SET).withUnit('C').withDescription('Setting Low Temperature Border')
                .withValueMin(-5).withValueMax(50),
            e.binary('enable_humidity', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Humidity Control'),
            e.numeric('high_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting High Humidity Border')
                .withValueMin(0).withValueMax(99),
            e.numeric('low_humidity', ea.STATE_SET).withUnit('C').withDescription('Setting Low Humidity Border')
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
    {
        zigbeeModel: ['b-parasite'],
        model: 'b-parasite',
        vendor: 'Custom devices (DiY)',
        description: '[b-parasite open source soil moisture sensor](https://github.com/rbaron/b-parasite)',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery, fz.soil_moisture, fz.illuminance],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.battery(), e.soil_moisture(), e.illuminance_lux()],
        configure: async (device, coordinatorEndpoint, _logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg',
                'msTemperatureMeasurement', 'msRelativeHumidity', 'msSoilMoisture', 'msIlluminanceMeasurement']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.soil_moisture(endpoint);
            await reporting.illuminance(endpoint);
        },
    },
    {
        zigbeeModel: ['MULTI-ZIG-SW'],
        model: 'MULTI-ZIG-SW',
        vendor: 'smarthjemmet.dk',
        description: '[Multi switch from Smarthjemmet.dk](https://smarthjemmet.dk)',
        fromZigbee: [fz.ignore_basic_report, fzLocal.multi_zig_sw_switch_buttons, fzLocal.multi_zig_sw_battery, fzLocal.multi_zig_sw_switch_config],
        toZigbee: [tzLocal.multi_zig_sw_switch_type],
        exposes: [
            ...[e.enum('switch_type_1', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_1')],
            ...[e.enum('switch_type_2', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_2')],
            ...[e.enum('switch_type_3', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_3')],
            ...[e.enum('switch_type_4', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_4')],
            e.battery(), e.action(['single', 'double', 'triple', 'hold', 'release']), e.battery_voltage(),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {button_1: 2, button_2: 3, button_3: 4, button_4: 5};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['modelId', 'swBuildId', 'powerSource']);
        },
    },
    {
        zigbeeModel: ['LYWSD03MMC'],
        model: 'LYWSD03MMC',
        vendor: 'Custom devices (DiY)',
        description: 'Xiaomi temperature & humidity sensor with custom firmware',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery, fz.hvac_user_interface],
        toZigbee: [tz.thermostat_temperature_display_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.temperature(endpoint, {min: 10, max: 300, change: 10});
            await reporting.humidity(endpoint, {min: 10, max: 300, change: 50});
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [
            e.temperature(), e.humidity(), e.battery(),
            e.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the screen'),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['MHO-C401N'],
        model: 'MHO-C401N',
        vendor: 'Custom devices (DiY)',
        description: 'Xiaomi temperature & humidity sensor with custom firmware',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery, fz.hvac_user_interface],
        toZigbee: [tz.thermostat_temperature_display_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.temperature(endpoint, {min: 10, max: 300, change: 10});
            await reporting.humidity(endpoint, {min: 10, max: 300, change: 50});
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [
            e.temperature(), e.humidity(), e.battery(),
            e.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the screen'),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['QUAD-ZIG-SW'],
        model: 'QUAD-ZIG-SW',
        vendor: 'smarthjemmet.dk',
        description: '[FUGA compatible switch from Smarthjemmet.dk](https://smarthjemmet.dk)',
        fromZigbee: [fz.ignore_basic_report, fzLocal.multi_zig_sw_switch_buttons, fzLocal.multi_zig_sw_battery, fzLocal.multi_zig_sw_switch_config],
        toZigbee: [tzLocal.multi_zig_sw_switch_type],
        exposes: [
            ...[e.enum('switch_type_1', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_1')],
            ...[e.enum('switch_type_2', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_2')],
            ...[e.enum('switch_type_3', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_3')],
            ...[e.enum('switch_type_4', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint('button_4')],
            e.battery(), e.action(['single', 'double', 'triple', 'hold', 'release']), e.battery_voltage(),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {button_1: 2, button_2: 3, button_3: 4, button_4: 5};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['modelId', 'swBuildId', 'powerSource']);
        },
    },
    {
        zigbeeModel: ['ptvo_counter_2ch'],
        model: 'ptvo_counter_2ch',
        vendor: 'Custom devices (DiY)',
        description: '2 channel counter',
        fromZigbee: [fz.ignore_basic_report, fz.battery, fz.ptvo_switch_analog_input, fz.on_off],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_analog_input, tz.on_off],
        exposes: [e.battery(),
            e.enum('l3', ea.ALL, ['set']).withDescription('Counter value. Write zero or positive value to set a counter value. ' +
                'Write a negative value to set a wakeup interval in minutes'),
            e.enum('l5', ea.ALL, ['set']).withDescription('Counter value. Write zero or positive value to set a counter value. ' +
                'Write a negative value to set a wakeup interval in minutes'),
            e.switch().withEndpoint('l6'),
            e.battery_voltage(),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l3: 3, l5: 5, l6: 6};
        },
    },
];

export default definitions;
module.exports = definitions;
