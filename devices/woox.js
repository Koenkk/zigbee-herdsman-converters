const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TZ3210_eymunffl'}],
        model: 'R7060',
        vendor: 'Woox',
        description: 'Smart garden irrigation control',
        fromZigbee: [fz.on_off, fz.ignore_tuya_set_time, fz.ignore_basic_report, fz.woox_R7060],
        toZigbee: [tz.on_off],
        onEvent: tuya.onEventSetTime,
        exposes: [e.switch()],
        meta: {disableDefaultResponse: true},
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_keabpigv'}],
        model: 'R9077',
        vendor: 'Woox',
        description: 'RGB+CCT LED',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_rusu2vzb'}],
        model: 'R7048',
        vendor: 'Woox',
        description: 'Smart Humidity & Temperature Sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint);
                await reporting.humidity(endpoint);
                await reporting.batteryVoltage(endpoint);
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (e) {/* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`);
            }
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_aycxwiau'}],
        model: 'R7049',
        vendor: 'Woox',
        description: 'Smart smoke alarm',
        fromZigbee: [fz.tuya_woox_smoke, fz.ignore_tuya_set_time],
        toZigbee: [],
        onEvent: tuya.onEventsetTime,
        exposes: [e.smoke(), e.battery_low()],
    },
];
