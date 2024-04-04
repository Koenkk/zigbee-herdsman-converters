import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as tuya from '../lib/tuya';
import * as reporting from '../lib/reporting';
import {light} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_jak16dll']),
        model: '07752L',
        description: 'NEO smart internal double socket',
        vendor: 'Immax',
        extend: [tuya.modernExtend.tuyaOnOff({
            electricalMeasurements: true, powerOutageMemory: true, indicatorMode: true, childLock: true, endpoints: ['l1', 'l2']})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['power', 'current', 'voltage', 'energy']},
    },
    {

        zigbeeModel: ['Motion-Sensor-ZB3.0'],
        model: '07043M',
        vendor: 'Immax',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['ZBT-CCTfilament-D0000'],
        model: '07089L',
        vendor: 'Immax',
        description: 'NEO SMART LED E27 5W',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['E27-filament-Dim-ZB3.0'],
        model: '07088L',
        vendor: 'Immax',
        description: 'Neo SMART LED filament E27 6.3W warm white, dimmable, Zigbee 3.0',
        extend: [light()],
    },
    {
        zigbeeModel: ['IM-Z3.0-DIM'],
        model: '07001L/07005B',
        vendor: 'Immax',
        description: 'Neo SMART LED E14 5W warm white, dimmable, Zigbee 3.0',
        extend: [light()],
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBW'],
        model: '07004D/07005L',
        vendor: 'Immax',
        description: 'Neo SMART LED E27/E14 color, dimmable, Zigbee 3.0',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBCCT'],
        model: '07008L',
        vendor: 'Immax',
        description: 'Neo SMART LED strip RGB + CCT, color, dimmable, Zigbee 3.0',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_pwauw3g2'}],
        model: '07743L',
        vendor: 'Immax',
        description: 'Neo Smart LED E27 11W RGB + CCT, color, dimmable, Zigbee 3.0',
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
    },
    {
        zigbeeModel: ['Keyfob-ZB3.0'],
        model: '07046L',
        vendor: 'Immax',
        description: '4-Touch single click buttons',
        fromZigbee: [legacy.fz.immax_07046L_arm, fz.command_panic],
        exposes: [e.action(['disarm', 'arm_stay', 'arm_away', 'panic'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DoorWindow-Sensor-ZB3.0'],
        model: '07045L',
        vendor: 'Immax',
        description: 'Magnetic contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['Plug-230V-ZB3.0'],
        model: '07048L',
        vendor: 'Immax',
        description: 'NEO SMART plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.activePower(endpoint, {change: 5});
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['losfena'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wlosfena'}],
        model: '07703L',
        vendor: 'Immax',
        description: 'Radiator valve',
        fromZigbee: [legacy.fz.tuya_thermostat_weekly_schedule_1, legacy.fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.etop_thermostat_system_mode, legacy.tz.etop_thermostat_away_mode, legacy.tz.tuya_thermostat_child_lock,
            legacy.tz.tuya_thermostat_current_heating_setpoint, legacy.tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: 101,
            },
        },
        exposes: [e.battery_low(), e.child_lock(), e.away_mode(), e.climate()
            .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE).withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
            .withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        zigbeeModel: ['Bulb-RGB+CCT-ZB3.0'],
        model: '07115L',
        vendor: 'Immax',
        description: 'Neo SMART LED E27 9W RGB + CCT, dimmable, Zigbee 3.0',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['4in1-Sensor-ZB3.0'],
        model: '07047L',
        vendor: 'Immax',
        description: 'Intelligent motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.temperature, fz.illuminance, fz.humidity, fz.ignore_iaszone_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.temperature(), e.illuminance(), e.illuminance_lux(),
            e.humidity()],
    },
    {
        zigbeeModel: ['ColorTemperature'],
        fingerprint: [{modelID: '07073L', manufacturerName: 'Seastar Intelligence'}],
        model: '07073L',
        vendor: 'Immax',
        description: 'Neo CANTO/HIPODROMO SMART, color temp, dimmable, Zigbee 3.0',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['IM-Z3.0-CCT'],
        model: '07042L',
        vendor: 'Immax',
        description: 'Neo RECUADRO SMART, color temp, dimmable, Zigbee 3.0',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3210_jijr1sss', '_TZ3210_m3mxv66l']),
        model: '07502L',
        vendor: 'Immax',
        description: '4 in 1 multi sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.illuminance, legacy.fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [legacy.tz.ZB003X],
        exposes: [e.occupancy(), e.tamper(), e.battery(), e.illuminance(), e.illuminance_lux().withUnit('lx'), e.temperature(),
            e.humidity(), e.numeric('reporting_time', ea.STATE_SET).withDescription('Reporting interval in minutes')
                .withValueMin(0).withValueMax(1440),
            e.numeric('temperature_calibration', ea.STATE_SET).withDescription('Temperature calibration')
                .withValueMin(-20).withValueMax(20),
            e.numeric('humidity_calibration', ea.STATE_SET).withDescription('Humidity calibration')
                .withValueMin(-50).withValueMax(50),
            e.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration')
                .withValueMin(-10000).withValueMax(10000),
            e.binary('pir_enable', ea.STATE_SET, true, false).withDescription('Enable PIR sensor'),
            e.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enabled LED'),
            e.binary('reporting_enable', ea.STATE_SET, true, false).withDescription('Enabled reporting'),
            e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            // eslint-disable-next-line
            e.enum('keep_time', ea.STATE_SET, ['0', '30', '60', '120', '240']).withDescription('PIR keep time in seconds')],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_n9clpsht', '_TZE200_nyvavzbj']),
        model: '07505L',
        vendor: 'Immax',
        description: 'Neo smart keypad',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [],
        exposes: [e.action(['disarm', 'arm_home', 'arm_away', 'sos']), e.tamper()],
        meta: {
            tuyaDatapoints: [
                [24, 'tamper', tuya.valueConverter.trueFalse1],
                [26, 'action', tuya.valueConverter.static('disarm')],
                [27, 'action', tuya.valueConverter.static('arm_away')],
                [28, 'action', tuya.valueConverter.static('arm_home')],
                [29, 'action', tuya.valueConverter.static('sos')],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_krwtzhfd'}],
        model: '07767L',
        vendor: 'Immax',
        description: 'NEO Smart outdoor button',
        exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
        fromZigbee: [fz.battery, fz.tuya_on_off_action],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
    },
];

export default definitions;
module.exports = definitions;
