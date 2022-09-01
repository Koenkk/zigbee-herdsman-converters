const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const globalStore = require('../lib/store');
const ota = require('../lib/ota');
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    // SPLZB-134 reports strange values sometimes
    // https://github.com/Koenkk/zigbee2mqtt/issues/13329
    SPLZB134_electrical_measurement: {
        ...fz.electrical_measurement,
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.rmsVoltage !== 0xFFFF && msg.data.rmsCurrent !== 0xFFFF && msg.data.activePower !== -0x8000) {
                return fz.electrical_measurement.convert(model, msg, publish, options, meta);
            }
        },
    },
    SPLZB134_device_temperature: {
        ...fz.device_temperature,
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.currentTemperature !== -0x8000) {
                return fz.device_temperature.convert(model, msg, publish, options, meta);
            }
        },
    },
    SPLZB134_metering: {
        ...fz.metering,
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.instantaneousDemand !== -0x800000) {
                return fz.metering.convert(model, msg, publish, options, meta);
            }
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['SPLZB-131'],
        model: 'SPLZB-131',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
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
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature(), e.ac_frequency()],
        options: [exposes.options.precision(`ac_frequency`)],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        fromZigbee: [fz.on_off, fzLocal.SPLZB134_electrical_measurement, fzLocal.SPLZB134_metering, fzLocal.SPLZB134_device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        zigbeeModel: ['SMRZB-143'],
        model: 'SMRZB-143',
        vendor: 'Develco',
        description: 'Smart cable',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.develco_fw],
        toZigbee: [tz.EMIZB_132_mode],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            const options = {manufacturerCode: 4117};
            await endpoint.read('genBasic', [0x8000, 0x8010, 0x8020], options);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);

            try {
                // Some don't support these attributes
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-621465038
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
                await reporting.rmsVoltage(endpoint);
                await reporting.rmsCurrent(endpoint);
                await reporting.activePower(endpoint);
            } catch (e) {
                e;
            }

            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000, multiplier: 1});
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.currentSummReceived(endpoint);
        },
        exposes: [e.power(), e.energy(), e.current(), e.voltage(), e.current_phase_b(), e.voltage_phase_b(), e.current_phase_c(),
            e.voltage_phase_c()],
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'attributeReport' && data.cluster === 'seMetering' && data.data['divisor']) {
                // Device sends wrong divisior (512) while it should be fixed to 1000
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
        fromZigbee: [fz.temperature, fz.battery, fz.ias_smoke_alarm_1_develco, fz.ignore_basic_report,
            fz.develco_fw, fz.ias_enroll, fz.ias_wd, fz.develco_genbinaryinput],
        toZigbee: [tz.warning, tz.ias_max_duration, tz.warning_simple],
        ota: ota.zigbeeOTA,
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const options = {manufacturerCode: 4117};
            const endpoint = device.getEndpoint(35);

            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic', 'genBinaryInput']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('genBasic', [0x8000, 0x8010, 0x8020], options);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('genBinaryInput', ['reliability', 'statusFlags']);
            await endpoint.read('ssIasWd', ['maxDuration']);

            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.test(),
            exposes.numeric('max_duration', ea.ALL).withUnit('s').withValueMin(0).withValueMax(600).withDescription('Duration of Siren'),
            exposes.binary('alarm', ea.SET, 'START', 'OFF').withDescription('Manual Start of Siren'),
            exposes.enum('reliability', ea.STATE, ['no_fault_detected', 'unreliable_other', 'process_error'])
                .withDescription('Indicates reason if any fault'),
            exposes.binary('fault', ea.STATE, true, false).withDescription('Indicates whether the device are in fault state')],
    },
    {
        zigbeeModel: ['HESZB-120'],
        model: 'HESZB-120',
        vendor: 'Develco',
        description: 'Fire detector with siren',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_smoke_alarm_1_develco, fz.ignore_basic_report,
            fz.develco_fw, fz.ias_enroll, fz.ias_wd, fz.develco_genbinaryinput],
        toZigbee: [tz.warning, tz.ias_max_duration, tz.warning_simple],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const options = {manufacturerCode: 4117};
            const endpoint = device.getEndpoint(35);

            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic', 'genBinaryInput']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('genBasic', [0x8000], options);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('genBinaryInput', ['reliability', 'statusFlags']);
            await endpoint.read('ssIasWd', ['maxDuration']);

            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.test(),
            exposes.numeric('max_duration', ea.ALL).withUnit('s').withValueMin(0).withValueMax(600).withDescription('Duration of Siren'),
            exposes.binary('alarm', ea.SET, 'START', 'OFF').withDescription('Manual Start of Siren'),
            exposes.enum('reliability', ea.STATE, ['no_fault_detected', 'unreliable_other', 'process_error'])
                .withDescription('Indicates reason if any fault'),
            exposes.binary('fault', ea.STATE, true, false).withDescription('Indicates whether the device are in fault state')],
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
        zigbeeModel: ['WISZB-120'],
        model: 'WISZB-120',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.temperature],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_low(), e.tamper(), e.temperature()],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint35 = device.getEndpoint(35);
            const endpoint38 = device.getEndpoint(38);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint38, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint35);
            await reporting.temperature(endpoint38);
        },
    },
    {
        zigbeeModel: ['WISZB-121'],
        model: 'WISZB-121',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low()],
    },
    {
        zigbeeModel: ['MOSZB-140'],
        model: 'MOSZB-140',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.illuminance, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature(), e.illuminance_lux()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(38);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint1);
            const endpoint2 = device.getEndpoint(39);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint2);
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
        zigbeeModel: ['HMSZB-110'],
        model: 'HMSZB-110',
        vendor: 'Develco',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.battery_low(), e.temperature(), e.humidity()],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(38);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
            await reporting.humidity(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 300});
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['ZHEMI101'],
        model: 'ZHEMI101',
        vendor: 'Develco',
        description: 'Energy meter',
        fromZigbee: [fz.metering, fz.develco_metering],
        toZigbee: [tz.develco_pulse_configuration, tz.develco_interface_mode, tz.develco_current_summation],
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
        exposes: [
            e.power(),
            e.energy(),
            e.battery_low(),
            exposes.numeric('pulse_configuration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Pulses per kwh. Default 1000 imp/kWh. Range 0 to 65535'),
            exposes.enum('interface_mode', ea.ALL,
                ['electricity', 'gas', 'water', 'kamstrup-kmp', 'linky', 'IEC62056-21', 'DSMR-2.3', 'DSMR-4.0'])
                .withDescription('Operating mode/probe'),
            exposes.numeric('current_summation', ea.SET)
                .withDescription('Current summation value sent to the display. e.g. 570 = 0,570 kWh').withValueMin(0).withValueMax(10000),
            exposes.binary('check_meter', ea.STATE, true, false)
                .withDescription('Is true if communication problem with meter is experienced'),
        ],
    },
    {
        zigbeeModel: ['SMRZB-332'],
        model: 'SMRZB-332',
        vendor: 'Develco',
        description: 'Smart relay DIN',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.power(), e.energy(), e.switch()],
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
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
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.tamper(), e.water_leak(), e.temperature(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint35 = device.getEndpoint(35);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            const endpoint38 = device.getEndpoint(38);
            await reporting.temperature(endpoint38);
        },
    },
    {
        zigbeeModel: ['AQSZB-110'],
        model: 'AQSZB-110',
        vendor: 'Develco',
        description: 'Air quality sensor',
        fromZigbee: [fz.develco_voc_battery, fz.develco_voc, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [
            e.voc(), e.temperature(), e.humidity(),
            e.battery(), e.battery_low(),
            exposes.enum('air_quality', ea.STATE, [
                'excellent', 'good', 'moderate',
                'poor', 'unhealthy', 'out_of_range',
                'unknown']).withDescription('Measured air quality'),
        ],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(38);
            const options = {manufacturerCode: 0x1015};
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['develcoSpecificAirQuality', 'msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await endpoint.configureReporting('develcoSpecificAirQuality', [{attribute: 'measuredValue', minimumReportInterval: 60,
                maximumReportInterval: 3600, reportableChange: 10}], options);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
            await reporting.humidity(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 300});
            await reporting.batteryVoltage(endpoint, {min: constants.repInterval.HOUR, max: 43200, change: 100});
        },
    },
    {
        zigbeeModel: ['SIRZB-110'],
        model: 'SIRZB-110',
        vendor: 'Develco Products A/S',
        description: 'Customizable siren',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_enroll, fz.ias_wd, fz.develco_fw, fz.ias_siren],
        toZigbee: [tz.warning, tz.warning_simple, tz.ias_max_duration, tz.squawk],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const options = {manufacturerCode: 4117};
            const endpoint = device.getEndpoint(43);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('genBasic', [0x8000], options);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('ssIasWd', ['maxDuration']);

            const endpoint2 = device.getEndpoint(1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            return {default: 43};
        },
        exposes: [e.battery(), e.battery_low(), e.test(), e.warning(), e.squawk(),
            exposes.numeric('max_duration', ea.ALL).withUnit('s').withValueMin(0).withValueMax(900)
                .withDescription('Max duration of the siren'),
            exposes.binary('alarm', ea.SET, 'START', 'OFF').withDescription('Manual start of the siren')],
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
            exposes.text('action_code', ea.STATE).withDescription('Pin code introduced.'),
            exposes.numeric('action_transaction', ea.STATE).withDescription('Last action transaction number.'),
            exposes.text('action_zone', ea.STATE).withDescription('Alarm zone. Default value 23'),
            e.action([
                'disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        ota: ota.zigbeeOTA,
        meta: {battery: {voltageToPercentage: '4LR6AA1_5v'}},
        configure: async (device, coordinatorEndpoint, logger) => {
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
];
