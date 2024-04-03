import {Zcl} from 'zigbee-herdsman';
import {Definition, Fz, Tz, Zh, KeyValue} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import * as globalStore from '../lib/store';
import * as utils from '../lib/utils';
import * as ota from '../lib/ota';
import {logger} from '../lib/logger';
const e = exposes.presets;
const ea = exposes.access;

const NS = 'zhc:develco';
// develco specific cosntants
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.DEVELCO};

/* MOSZB-1xx - ledControl - bitmap8 - r/w
 * 0x00 Disable LED when movement is detected.
 * 0x01 Enables periodic fault flashes. These flashes are used to indicate e.g. low battery level.
 * 0x02 Enables green application defined LED. This is e.g. used to indicate motion detection.
 * Default value 0xFF ( seems to be fault + motion)
 */
const develcoLedControlMap = {
    0x00: 'off',
    0x01: 'fault_only',
    0x02: 'motion_only',
    0xFF: 'both',
};

// develco specific converters
const develco = {
    configure: {
        read_sw_hw_version: async (device: Zh.Device) => {
            for (const ep of device.endpoints) {
                if (ep.supportsInputCluster('genBasic')) {
                    try {
                        const data = await ep.read('genBasic', ['develcoPrimarySwVersion', 'develcoPrimaryHwVersion'],
                            manufacturerOptions);

                        if (data.hasOwnProperty('develcoPrimarySwVersion')) {
                            device.softwareBuildID = data.develcoPrimarySwVersion.join('.');
                        }

                        if (data.hasOwnProperty('develcoPrimaryHwVersion')) {
                            device.hardwareVersion = data.develcoPrimaryHwVersion.join('.');
                        }
                    } catch (error) {/* catch timeouts of sleeping devices */}
                    break;
                }
            }
        },
    },
    fz: {
        // Some Develco devices report strange values sometimes
        // https://github.com/Koenkk/zigbee2mqtt/issues/13329
        electrical_measurement: {
            ...fz.electrical_measurement,
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.rmsVoltage !== 0xFFFF && msg.data.rmsCurrent !== 0xFFFF && msg.data.activePower !== -0x8000) {
                    return fz.electrical_measurement.convert(model, msg, publish, options, meta);
                }
            },
        } satisfies Fz.Converter,
        total_power: {
            cluster: 'haElectricalMeasurement',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.hasOwnProperty('totalActivePower') && msg.data['totalActivePower'] !== -0x80000000) {
                    result[utils.postfixWithEndpointName('power', msg, model, meta)] =
                        msg.data['totalActivePower'];
                }
                if (msg.data.hasOwnProperty('totalReactivePower') && msg.data['totalReactivePower'] !== -0x80000000) {
                    result[utils.postfixWithEndpointName('power_reactive', msg, model, meta)] =
                        msg.data['totalReactivePower'];
                }
                return result;
            },
        } satisfies Fz.Converter,
        device_temperature: {
            ...fz.device_temperature,
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.currentTemperature !== -0x8000) {
                    return fz.device_temperature.convert(model, msg, publish, options, meta);
                }
            },
        } satisfies Fz.Converter,
        temperature: {
            ...fz.temperature,
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.measuredValue !== -0x8000 && msg.data.measuredValue !== 0xFFFF) {
                    return fz.temperature.convert(model, msg, publish, options, meta);
                }
            },
        } satisfies Fz.Converter,
        metering: {
            ...fz.metering,
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.instantaneousDemand !== -0x800000 && msg.data.currentSummDelivered?.[1] !== 0) {
                    return fz.metering.convert(model, msg, publish, options, meta);
                }
            },
        } satisfies Fz.Converter,
        pulse_configuration: {
            cluster: 'seMetering',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.hasOwnProperty('develcoPulseConfiguration')) {
                    result[utils.postfixWithEndpointName('pulse_configuration', msg, model, meta)] =
                        msg.data['develcoPulseConfiguration'];
                }

                return result;
            },
        } satisfies Fz.Converter,
        interface_mode: {
            cluster: 'seMetering',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.hasOwnProperty('develcoInterfaceMode')) {
                    result[utils.postfixWithEndpointName('interface_mode', msg, model, meta)] =
                        constants.develcoInterfaceMode.hasOwnProperty(msg.data['develcoInterfaceMode']) ?
                            constants.develcoInterfaceMode[msg.data['develcoInterfaceMode']] :
                            msg.data['develcoInterfaceMode'];
                }
                if (msg.data.hasOwnProperty('status')) {
                    result['battery_low'] = (msg.data.status & 2) > 0;
                    result['check_meter'] = (msg.data.status & 1) > 0;
                }

                return result;
            },
        } satisfies Fz.Converter,
        fault_status: {
            cluster: 'genBinaryInput',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.hasOwnProperty('reliability')) {
                    const lookup = {0: 'no_fault_detected', 7: 'unreliable_other', 8: 'process_error'};
                    result.reliability = utils.getFromLookup(msg.data['reliability'], lookup);
                }
                if (msg.data.hasOwnProperty('statusFlags')) {
                    result.fault = (msg.data['statusFlags']===1);
                }
                return result;
            },
        } satisfies Fz.Converter,
        voc: {
            cluster: 'develcoSpecificAirQuality',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                // from Sensirion_Gas_Sensors_SGP3x_TVOC_Concept.pdf
                // "The mean molar mass of this mixture is 110 g/mol and hence,
                // 1 ppb TVOC corresponds to 4.5 μg/m3."
                const vocPpb = parseFloat(msg.data['measuredValue']);
                const voc = vocPpb * 4.5;
                const vocProperty = utils.postfixWithEndpointName('voc', msg, model, meta);

                // from aqszb-110-technical-manual-air-quality-sensor-04-08-20.pdf page 6, section 2.2 voc
                // this contains a ppb to level mapping table.
                let airQuality;
                const airQualityProperty = utils.postfixWithEndpointName('air_quality', msg, model, meta);
                if (vocPpb <= 65) {
                    airQuality = 'excellent';
                } else if (vocPpb <= 220) {
                    airQuality = 'good';
                } else if (vocPpb <= 660) {
                    airQuality = 'moderate';
                } else if (vocPpb <= 2200) {
                    airQuality = 'poor';
                } else if (vocPpb <= 5500) {
                    airQuality = 'unhealthy';
                } else if (vocPpb > 5500) {
                    airQuality = 'out_of_range';
                } else {
                    airQuality = 'unknown';
                }
                return {[vocProperty]: voc, [airQualityProperty]: airQuality};
            },
        } satisfies Fz.Converter,
        voc_battery: {
            cluster: 'genPowerCfg',
            type: ['attributeReport', 'readResponse'],
            convert: async (model, msg, publish, options, meta) => {
                /*
                 * Per the technical documentation for AQSZB-110:
                 * To detect low battery the system can monitor the "BatteryVoltage" by setting up a reporting interval of every 12 hour.
                 * When a voltage of 2.5V is measured the battery should be replaced.
                 * Low batt LED indication–RED LED will blink twice every 60 second.
                 */
                const result = await fz.battery.convert(model, msg, publish, options, meta);
                if (result) result.battery_low = (result.voltage <= 2500);
                return result;
            },
        } satisfies Fz.Converter,
        led_control: {
            cluster: 'genBasic',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};

                if (msg.data.hasOwnProperty('develcoLedControl')) {
                    state['led_control'] = utils.getFromLookup(msg.data['develcoLedControl'], develcoLedControlMap);
                }

                return state;
            },
        } satisfies Fz.Converter,
        ias_occupancy_timeout: {
            cluster: 'ssIasZone',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};

                if (msg.data.hasOwnProperty('develcoAlarmOffDelay')) {
                    state['occupancy_timeout'] = msg.data['develcoAlarmOffDelay'];
                }

                return state;
            },
        } satisfies Fz.Converter,
        input: {
            cluster: 'genBinaryInput',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.hasOwnProperty('presentValue')) {
                    const value = msg.data['presentValue'];
                    result[utils.postfixWithEndpointName('input', msg, model, meta)] = value == 1;
                }
                return result;
            },
        } satisfies Fz.Converter,
    },
    tz: {
        pulse_configuration: {
            key: ['pulse_configuration'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('seMetering', {'develcoPulseConfiguration': value}, manufacturerOptions);
                return {readAfterWriteTime: 200, state: {'pulse_configuration': value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('seMetering', ['develcoPulseConfiguration'], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        interface_mode: {
            key: ['interface_mode'],
            convertSet: async (entity, key, value, meta) => {
                const payload = {'develcoInterfaceMode': utils.getKey(constants.develcoInterfaceMode, value, undefined, Number)};
                await entity.write('seMetering', payload, manufacturerOptions);
                return {readAfterWriteTime: 200, state: {'interface_mode': value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('seMetering', ['develcoInterfaceMode'], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        current_summation: {
            key: ['current_summation'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('seMetering', {'develcoCurrentSummation': value}, manufacturerOptions);
                return {state: {'current_summation': value}};
            },
        } satisfies Tz.Converter,
        led_control: {
            key: ['led_control'],
            convertSet: async (entity, key, value, meta) => {
                const ledControl = utils.getKey(develcoLedControlMap, value, value, Number);
                await entity.write('genBasic', {'develcoLedControl': ledControl}, manufacturerOptions);
                return {state: {led_control: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('genBasic', ['develcoLedControl'], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        ias_occupancy_timeout: {
            key: ['occupancy_timeout'],
            convertSet: async (entity, key, value, meta) => {
                let timeoutValue = utils.toNumber(value, 'occupancy_timeout');
                if (timeoutValue < 5) {
                    logger.warning(`Minimum occupancy_timeout is 5, using 5 instead of ${timeoutValue}!`, NS);
                    timeoutValue = 5;
                }
                await entity.write('ssIasZone', {'develcoAlarmOffDelay': timeoutValue}, manufacturerOptions);
                return {state: {occupancy_timeout: timeoutValue}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('ssIasZone', ['develcoAlarmOffDelay'], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        input: {
            key: ['input'],
            convertGet: async (entity, key, meta) => {
                await entity.read('genBinaryInput', ['presentValue']);
            },
        } satisfies Tz.Converter,
    },
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['SPLZB-131'],
        model: 'SPLZB-131',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering, develco.fz.device_temperature],
        toZigbee: [tz.on_off],
        ota: ota.zigbeeOTA,
        exposes: [e.switch(), e.power(), e.power_reactive(), e.current(), e.voltage(), e.energy(), e.device_temperature(), e.ac_frequency()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint, true);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: constants.repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: constants.repInterval.MINUTES_5, change: 10});
            await reporting.acFrequency(endpoint, {change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SPLZB-132'],
        model: 'SPLZB-132',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering, develco.fz.device_temperature],
        toZigbee: [tz.on_off],
        ota: ota.zigbeeOTA,
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature(), e.ac_frequency()],
        options: [exposes.options.precision(`ac_frequency`)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
            // Set to true, to access the acFrequencyDivisor and acFrequencyMultiplier attribute. Not all devices support this.
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint, true);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: constants.repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: constants.repInterval.MINUTES_5, change: 10});
            await reporting.acFrequency(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SPLZB-134'],
        model: 'SPLZB-134',
        vendor: 'Develco',
        description: 'Power plug (type G)',
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering, develco.fz.device_temperature],
        toZigbee: [tz.on_off],
        ota: ota.zigbeeOTA,
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint, {change: 2}); // Device temperature reports with 2 degree change
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: constants.repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: constants.repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SPLZB-137'],
        model: 'SPLZB-137',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering],
        toZigbee: [tz.on_off],
        ota: ota.zigbeeOTA,
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.ac_frequency()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint, true);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.acFrequency(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SMRZB-143'],
        model: 'SMRZB-143',
        vendor: 'Develco',
        description: 'Smart cable',
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering, develco.fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint, {change: 2}); // Device temperature reports with 2 degree change
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: constants.repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: constants.repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['EMIZB-132'],
        model: 'EMIZB-132',
        vendor: 'Develco',
        description: 'Wattle AMS HAN power-meter sensor',
        fromZigbee: [develco.fz.metering, develco.fz.electrical_measurement, develco.fz.total_power],
        toZigbee: [tz.EMIZB_132_mode],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);

            try {
                // Some don't support these attributes
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-621465038
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
                await reporting.rmsVoltage(endpoint);
                await reporting.rmsCurrent(endpoint);
                await endpoint.configureReporting('haElectricalMeasurement', [{attribute: 'totalActivePower', minimumReportInterval: 5,
                    maximumReportInterval: 3600, reportableChange: 1}], manufacturerOptions);
                await endpoint.configureReporting('haElectricalMeasurement', [{attribute: 'totalReactivePower', minimumReportInterval: 5,
                    maximumReportInterval: 3600, reportableChange: 1}], manufacturerOptions);
            } catch (e) {
                e;
            }

            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000, multiplier: 1});
            await reporting.currentSummDelivered(endpoint);
            await reporting.currentSummReceived(endpoint);
            await develco.configure.read_sw_hw_version(device);
        },
        exposes: [e.numeric('power', ea.STATE).withUnit('W').withDescription('Total active power'),
            e.numeric('power_reactive', ea.STATE).withUnit('VAr').withDescription('Total reactive power'),
            e.energy(), e.current(), e.voltage(), e.current_phase_b(), e.voltage_phase_b(), e.current_phase_c(),
            e.voltage_phase_c()],
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'attributeReport' && data.cluster === 'seMetering' && data.data['divisor']) {
                // Device sends wrong divisor (512) while it should be fixed to 1000
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/3066
                data.endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000, multiplier: 1});
            }
        },
    },
    {
        zigbeeModel: ['SMSZB-120'],
        model: 'SMSZB-120',
        vendor: 'Develco',
        description: 'Smoke detector with siren',
        whiteLabel: [
            {vendor: 'Frient', model: '94430', description: 'Smart Intelligent Smoke Alarm'},
            {vendor: 'Cavius', model: '2103', description: 'RF SMOKE ALARM, 5 YEAR 65MM'},
        ],
        fromZigbee: [develco.fz.temperature, fz.battery, fz.ias_smoke_alarm_1_develco, fz.ignore_basic_report,
            fz.ias_enroll, fz.ias_wd, develco.fz.fault_status],
        toZigbee: [tz.warning, tz.ias_max_duration, tz.warning_simple],
        ota: ota.zigbeeOTA,
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(35);

            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic', 'genBinaryInput']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('genBinaryInput', ['reliability', 'statusFlags']);
            await endpoint.read('ssIasWd', ['maxDuration']);

            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});

            await develco.configure.read_sw_hw_version(device);
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.test(),
            e.numeric('max_duration', ea.ALL).withUnit('s').withValueMin(0).withValueMax(600).withDescription('Duration of Siren'),
            e.binary('alarm', ea.SET, 'START', 'OFF').withDescription('Manual Start of Siren'),
            e.enum('reliability', ea.STATE, ['no_fault_detected', 'unreliable_other', 'process_error'])
                .withDescription('Indicates reason if any fault'),
            e.binary('fault', ea.STATE, true, false).withDescription('Indicates whether the device are in fault state')],
    },
    {
        zigbeeModel: ['SPLZB-141'],
        model: 'SPLZB-141',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.ac_frequency()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.acFrequency(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['HESZB-120'],
        model: 'HESZB-120',
        vendor: 'Develco',
        description: 'Fire detector with siren',
        whiteLabel: [
            {vendor: 'Frient', model: '94431', description: 'Smart Intelligent Heat Alarm'},
        ],
        fromZigbee: [develco.fz.temperature, fz.battery, fz.ias_smoke_alarm_1_develco, fz.ignore_basic_report,
            fz.ias_enroll, fz.ias_wd, develco.fz.fault_status],
        toZigbee: [tz.warning, tz.ias_max_duration, tz.warning_simple],
        ota: ota.zigbeeOTA,
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(35);

            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic', 'genBinaryInput']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('genBinaryInput', ['reliability', 'statusFlags']);
            await endpoint.read('ssIasWd', ['maxDuration']);

            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});

            await develco.configure.read_sw_hw_version(device);
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.test(),
            e.numeric('max_duration', ea.ALL).withUnit('s').withValueMin(0).withValueMax(600).withDescription('Duration of Siren'),
            e.binary('alarm', ea.SET, 'START', 'OFF').withDescription('Manual Start of Siren'),
            e.enum('reliability', ea.STATE, ['no_fault_detected', 'unreliable_other', 'process_error'])
                .withDescription('Indicates reason if any fault'),
            e.binary('fault', ea.STATE, true, false).withDescription('Indicates whether the device are in fault state')],
    },
    {
        zigbeeModel: ['WISZB-120'],
        model: 'WISZB-120',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, develco.fz.temperature],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_low(), e.tamper(), e.temperature()],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint35 = device.getEndpoint(35);
            const endpoint38 = device.getEndpoint(38);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint38, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint35);
            await reporting.temperature(endpoint38);

            await develco.configure.read_sw_hw_version(device);
        },
    },
    {
        zigbeeModel: ['WISZB-121'],
        model: 'WISZB-121',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_low(), e.tamper()],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint35 = device.getEndpoint(35);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint35);

            await develco.configure.read_sw_hw_version(device);
        },
    },
    {
        zigbeeModel: ['WISZB-137'],
        model: 'WISZB-137',
        vendor: 'Develco',
        description: 'Vibration sensor',
        fromZigbee: [fz.battery, fz.ias_vibration_alarm_1, fz.temperature],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.battery_low(), e.battery(), e.temperature(), e.vibration(), e.tamper()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint38 = device.getEndpoint(38);
            await reporting.bind(endpoint38, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint38);
            await reporting.batteryVoltage(endpoint38);
        },
    },
    {
        zigbeeModel: ['WISZB-138', 'GWA1513_WindowSensor'],
        model: 'WISZB-138',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, develco.fz.temperature],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_low(), e.temperature()],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint35 = device.getEndpoint(35);
            const endpoint38 = device.getEndpoint(38);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint38, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint35);
            await reporting.temperature(endpoint38);

            await develco.configure.read_sw_hw_version(device);
        },
    },
    {
        zigbeeModel: ['MOSZB-130'],
        model: 'MOSZB-130',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MOSZB-140', 'GWA1511_MotionSensor'],
        model: 'MOSZB-140',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [
            develco.fz.temperature, fz.illuminance, fz.ias_occupancy_alarm_1, fz.battery,
            develco.fz.led_control, develco.fz.ias_occupancy_timeout,
        ],
        toZigbee: [develco.tz.led_control, develco.tz.ias_occupancy_timeout],
        exposes: (device, options) => {
            const dynExposes = [];
            dynExposes.push(e.occupancy());
            if (device && device.softwareBuildID && Number(device.softwareBuildID.split('.')[0]) >= 3) {
                dynExposes.push(e.numeric('occupancy_timeout', ea.ALL).withUnit('s').
                    withValueMin(5).withValueMax(65535));
            }
            dynExposes.push(e.temperature());
            dynExposes.push(e.illuminance_lux());
            dynExposes.push(e.tamper());
            dynExposes.push(e.battery_low());
            dynExposes.push(e.battery());
            if (device && device.softwareBuildID && Number(device.softwareBuildID.split('.')[0]) >= 4) {
                dynExposes.push(e.enum('led_control', ea.ALL, ['off', 'fault_only', 'motion_only', 'both']).
                    withDescription('Control LED indicator usage.'));
            }
            dynExposes.push(e.linkquality());
            return dynExposes;
        },
        ota: ota.zigbeeOTA,
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        endpoint: (device) => {
            return {default: 35};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint39 = device.getEndpoint(39);
            await reporting.bind(endpoint39, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint39,
                {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 500});

            const endpoint38 = device.getEndpoint(38);
            await reporting.bind(endpoint38, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint38,
                {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 100});

            const endpoint35 = device.getEndpoint(35);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint35, {min: constants.repInterval.HOUR, max: 43200, change: 100});

            // zigbee2mqtt#14277 some features are not available on older firmwares
            await develco.configure.read_sw_hw_version(device);
            if (device && device.softwareBuildID && Number(device.softwareBuildID.split('.')[0]) >= 3) {
                await endpoint35.read('ssIasZone', ['develcoAlarmOffDelay'], manufacturerOptions);
            }
            if (device && device.softwareBuildID && Number(device.softwareBuildID.split('.')[0]) >= 4) {
                await endpoint35.read('genBasic', ['develcoLedControl'], manufacturerOptions);
            }
        },
    },
    {
        zigbeeModel: ['MOSZB-141'],
        model: 'MOSZB-141',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
    {
        whiteLabel: [
            {vendor: 'Frient', model: 'HMSZB-120', description: 'Temperature & humidity sensor', fingerprint: [{modelID: 'HMSZB-120'}]},
        ],
        zigbeeModel: ['HMSZB-110', 'HMSZB-120'],
        model: 'HMSZB-110',
        vendor: 'Develco',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.battery, develco.fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.battery_low(), e.temperature(), e.humidity()],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(38);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
            await reporting.humidity(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 300});
            await reporting.batteryVoltage(endpoint, {min: constants.repInterval.HOUR, max: 43200, change: 100});
            await develco.configure.read_sw_hw_version(device);
        },
    },
    {
        zigbeeModel: ['ZHEMI101'],
        model: 'ZHEMI101',
        vendor: 'Develco',
        description: 'Energy meter',
        fromZigbee: [develco.fz.metering, develco.fz.pulse_configuration, develco.fz.interface_mode],
        toZigbee: [develco.tz.pulse_configuration, develco.tz.interface_mode, develco.tz.current_summation],
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
        exposes: [
            e.power(),
            e.energy(),
            e.battery_low(),
            e.numeric('pulse_configuration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Pulses per kwh. Default 1000 imp/kWh. Range 0 to 65535'),
            e.enum('interface_mode', ea.ALL,
                ['electricity', 'gas', 'water', 'kamstrup-kmp', 'linky', 'IEC62056-21', 'DSMR-2.3', 'DSMR-4.0'])
                .withDescription('Operating mode/probe'),
            e.numeric('current_summation', ea.SET)
                .withDescription('Current summation value sent to the display. e.g. 570 = 0,570 kWh').withValueMin(0)
                .withValueMax(268435455),
            e.binary('check_meter', ea.STATE, true, false)
                .withDescription('Is true if communication problem with meter is experienced'),
        ],
    },
    {
        zigbeeModel: ['SMRZB-332'],
        model: 'SMRZB-332',
        vendor: 'Develco',
        description: 'Smart relay DIN',
        fromZigbee: [fz.on_off, develco.fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.power(), e.energy(), e.switch()],
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ['FLSZB-110'],
        model: 'FLSZB-110',
        vendor: 'Develco',
        description: 'Flood alarm device ',
        fromZigbee: [fz.ias_water_leak_alarm_1, develco.fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.tamper(), e.water_leak(), e.temperature(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint35 = device.getEndpoint(35);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            const endpoint38 = device.getEndpoint(38);
            await reporting.bind(endpoint38, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint38, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
        },
    },
    {
        zigbeeModel: ['AQSZB-110'],
        model: 'AQSZB-110',
        vendor: 'Develco',
        description: 'Air quality sensor',
        fromZigbee: [develco.fz.voc, develco.fz.voc_battery, develco.fz.temperature, fz.humidity],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [
            e.voc(), e.temperature(), e.humidity(),
            e.battery(), e.battery_low(),
            e.enum('air_quality', ea.STATE, [
                'excellent', 'good', 'moderate',
                'poor', 'unhealthy', 'out_of_range',
                'unknown']).withDescription('Measured air quality'),
        ],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(38);
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['develcoSpecificAirQuality', 'msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await endpoint.configureReporting('develcoSpecificAirQuality', [{attribute: 'measuredValue', minimumReportInterval: 60,
                maximumReportInterval: 3600, reportableChange: 10}], manufacturerOptions);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
            await reporting.humidity(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 300});
            await reporting.batteryVoltage(endpoint, {min: constants.repInterval.HOUR, max: 43200, change: 100});

            await develco.configure.read_sw_hw_version(device);
        },
    },
    {
        zigbeeModel: ['SIRZB-110'],
        model: 'SIRZB-110',
        vendor: 'Develco',
        description: 'Customizable siren',
        fromZigbee: [develco.fz.temperature, fz.battery, fz.ias_enroll, fz.ias_wd, fz.ias_siren],
        toZigbee: [tz.warning, tz.warning_simple, tz.ias_max_duration, tz.squawk],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(43);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('ssIasWd', ['maxDuration']);

            const endpoint2 = device.getEndpoint(1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);

            await develco.configure.read_sw_hw_version(device);
        },
        endpoint: (device) => {
            return {default: 43};
        },
        exposes: [e.battery(), e.battery_low(), e.test(), e.warning(), e.squawk(),
            e.numeric('max_duration', ea.ALL).withUnit('s').withValueMin(0).withValueMax(900)
                .withDescription('Max duration of the siren'),
            e.binary('alarm', ea.SET, 'START', 'OFF').withDescription('Manual start of the siren')],
    },
    {
        zigbeeModel: ['KEPZB-110'],
        model: 'KEYZB-110',
        vendor: 'Develco',
        description: 'Keypad',
        whiteLabel: [{vendor: 'Frient', model: 'KEPZB-110'}],
        fromZigbee: [fz.command_arm_with_transaction, fz.battery, fz.command_emergency, fz.ias_no_alarm,
            fz.ignore_iaszone_attreport, fz.ignore_iasace_commandgetpanelstatus],
        toZigbee: [tz.arm_mode],
        exposes: [e.battery(), e.battery_low(), e.battery_voltage(), e.tamper(),
            e.text('action_code', ea.STATE).withDescription('Pin code introduced.'),
            e.numeric('action_transaction', ea.STATE).withDescription('Last action transaction number.'),
            e.text('action_zone', ea.STATE).withDescription('Alarm zone. Default value 23'),
            e.action([
                'disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        ota: ota.zigbeeOTA,
        meta: {battery: {voltageToPercentage: '4LR6AA1_5v'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(44);
            const clusters = ['genPowerCfg', 'ssIasZone', 'ssIasAce', 'genIdentify'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.batteryVoltage(endpoint);
        },
        endpoint: (device) => {
            return {default: 44};
        },
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'commandGetPanelStatus' && data.cluster === 'ssIasAce' &&
                globalStore.hasValue(device.getEndpoint(44), 'panelStatus')) {
                const payload = {
                    panelstatus: globalStore.getValue(device.getEndpoint(44), 'panelStatus'),
                    secondsremain: 0x00, audiblenotif: 0x00, alarmstatus: 0x00,
                };
                await data.endpoint.commandResponse(
                    'ssIasAce', 'getPanelStatusRsp', payload, {}, data.meta.zclTransactionSequenceNumber,
                );
            }
        },
    },
    {
        zigbeeModel: ['IOMZB-110'],
        model: 'IOMZB-110',
        vendor: 'Develco',
        description: 'IO module',
        fromZigbee: [fz.on_off, develco.fz.input],
        toZigbee: [tz.on_off, develco.tz.input],
        meta: {multiEndpoint: true},
        exposes: [
            e.binary('input', ea.STATE_GET, true, false).withEndpoint('l1').withDescription('State of input 1'),
            e.binary('input', ea.STATE_GET, true, false).withEndpoint('l2').withDescription('State of input 2'),
            e.binary('input', ea.STATE_GET, true, false).withEndpoint('l3').withDescription('State of input 3'),
            e.binary('input', ea.STATE_GET, true, false).withEndpoint('l4').withDescription('State of input 4'),
            e.switch_().withState('state', true, 'On/off state of switch 1').withEndpoint('l11'),
            e.switch_().withState('state', true, 'On/off state of switch 2').withEndpoint('l12'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep2 = device.getEndpoint(112);
            await reporting.bind(ep2, coordinatorEndpoint, ['genBinaryInput', 'genBasic']);
            await reporting.presentValue(ep2, {min: 0});

            const ep3 = device.getEndpoint(113);
            await reporting.bind(ep3, coordinatorEndpoint, ['genBinaryInput']);
            await reporting.presentValue(ep3, {min: 0});

            const ep4 = device.getEndpoint(114);
            await reporting.bind(ep4, coordinatorEndpoint, ['genBinaryInput']);
            await reporting.presentValue(ep4, {min: 0});

            const ep5 = device.getEndpoint(115);
            await reporting.bind(ep5, coordinatorEndpoint, ['genBinaryInput']);
            await reporting.presentValue(ep5, {min: 0});

            const ep6 = device.getEndpoint(116);
            await reporting.bind(ep6, coordinatorEndpoint, ['genOnOff', 'genBinaryInput']);
            await reporting.onOff(ep6);

            const ep7 = device.getEndpoint(117);
            await reporting.bind(ep7, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep7);

            await develco.configure.read_sw_hw_version(device);
        },

        endpoint: (device) => {
            return {'l1': 112, 'l2': 113, 'l3': 114, 'l4': 115, 'l11': 116, 'l12': 117};
        },
    },
    {
        zigbeeModel: ['SBTZB-110'],
        model: 'SBTZB-110',
        vendor: 'Develco',
        description: 'Smart button',
        fromZigbee: [fz.ewelink_action, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(32);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genIdentify']);
            await reporting.batteryVoltage(endpoint);
        },
        endpoint: (device) => {
            return {default: 32};
        },
    },
];

export default definitions;
module.exports = definitions;
