const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['ZBT-CCTfilament-D0000'],
        model: '07089L',
        vendor: 'Immax',
        description: 'NEO SMART LED E27 5W',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['E27-filament-Dim-ZB3.0'],
        model: '07088L',
        vendor: 'Immax',
        description: 'Neo SMART LED filament E27 6.3W warm white, dimmable, Zigbee 3.0',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['IM-Z3.0-DIM'],
        model: '07005B',
        vendor: 'Immax',
        description: 'Neo SMART LED E14 5W warm white, dimmable, Zigbee 3.0',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBW'],
        model: '07004D/07005L',
        vendor: 'Immax',
        description: 'Neo SMART LED E27/E14 color, dimmable, Zigbee 3.0',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBCCT'],
        model: '07008L',
        vendor: 'Immax',
        description: 'Neo SMART LED strip RGB + CCT, color, dimmable, Zigbee 3.0',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['Keyfob-ZB3.0'],
        model: '07046L',
        vendor: 'Immax',
        description: '4-Touch single click buttons',
        fromZigbee: [fz.legacy.immax_07046L_arm, fz.command_panic],
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
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
        exposes: [e.switch(), e.power()],
    },
    {
        zigbeeModel: ['losfena'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wlosfena'}],
        model: '07703L',
        vendor: 'Immax',
        description: 'Radiator valve',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [e.battery_low(), e.child_lock(), exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE).withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
            .withRunningState(['idle', 'heat'], ea.STATE).withAwayMode()],
    },
    {
        zigbeeModel: ['Bulb-RGB+CCT-ZB3.0'],
        model: '07115L',
        vendor: 'Immax',
        description: 'Neo SMART LED E27 9W RGB + CCT, dimmable, Zigbee 3.0',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['4in1-Sensor-ZB3.0'],
        model: '07047L',
        vendor: 'Immax',
        description: 'Intelligent motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.temperature, fz.illuminance, fz.humidity, fz.ignore_iaszone_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['IM-Z3.0-CCT'],
        model: '07042L',
        vendor: 'Immax',
        description: 'Neo RECUADRO SMART, color temp, dimmable, Zigbee 3.0',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
];
