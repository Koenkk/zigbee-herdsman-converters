const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const tz = require('../converters/toZigbee');
const e = exposes.presets;

const fzLocal = {
    LDSENK08: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !((zoneStatus & 1) > 0),
                vibration: (zoneStatus & 1<<1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['LDSENK08'],
        model: 'LDSENK08',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN wireless smart door window sensor with vibration',
        fromZigbee: [fzLocal.LDSENK08, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.contact(), e.vibration(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['LDSENK09'],
        model: 'LDSENK09',
        vendor: 'ADEO',
        description: 'Security system key fob',
        fromZigbee: [fz.command_arm, fz.command_panic],
        toZigbee: [],
        exposes: [e.action(['panic', 'disarm', 'arm_partial_zones', 'arm_all_zones'])],
        onEvent: async (type, data, device) => {
            // Since arm command has a response zigbee-herdsman doesn't send a default response.
            // This causes the remote to repeat the arm command, so send a default response here.
            if (data.type === 'commandArm' && data.cluster === 'ssIasAce') {
                await data.endpoint.defaultResponse(0, 0, 1281, data.meta.zclTransactionSequenceNumber);
            }
        },
    },
    {
        zigbeeModel: ['ZBEK-8'],
        model: 'IG-CDZFB2G009RA-MZN-02',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white filament 1055 lumen',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-9'],
        model: 'IA-CDZFB2AA007NA-MZN-02',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-6'],
        model: 'IG-CDZB2AG009RA-MZN-01',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 Led white bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-4'],
        model: 'IM-CDZDGAAA0005KA_MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN RGBTW GU10 Bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['ZBEK-10'],
        model: 'IC-CDZFB2AC004HA-MZN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-11'],
        model: 'IM-CDZDGAAG005KA-MZN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN GU-10 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-12'],
        model: 'IA-CDZFB2AA007NA-MZN-01',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-13'],
        model: 'IG-CDZFB2AG010RA-MNZ',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-14'],
        model: 'IC-CDZFB2AC005HA-MZN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-5'],
        model: 'IST-CDZFB2AS007NA-MZN-01',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBEK-3'],
        model: 'IP-CDZOTAAP005JA-MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['LDSENK01F'],
        model: 'LDSENK01F',
        vendor: 'ADEO',
        description: '10A EU smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['LXEK-5', 'ZBEK-26'],
        model: 'HR-C99C-Z-C045',
        vendor: 'ADEO',
        description: 'RGB CTT LEXMAN ENKI remote control',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_stop, fz.command_step_color_temperature,
            fz.command_step_hue, fz.command_step_saturation, fz.color_stop_raw, fz.scenes_recall_scene_65024, fz.ignore_genOta],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'color_saturation_step_up',
            'color_saturation_step_down', 'color_stop', 'color_hue_step_up', 'color_hue_step_down',
            'color_temperature_step_up', 'color_temperature_step_down', 'brightness_step_up', 'brightness_step_down', 'brightness_stop'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genOnOff', 'genPowerCfg', 'lightingColorCtrl', 'genLevelCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['LXEK-1'],
        model: '9CZA-A806ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXEK-3'],
        model: '9CZA-P470T-A1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['LXEK-4'],
        model: '9CZA-M350ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN GU-10 LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXEK-2'],
        model: '9CZA-G1521-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 14W to 100W LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LDSENK07'],
        model: 'LDSENK07',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN wireless smart outdoor siren',
        fromZigbee: [fz.battery, fz.ias_siren],
        toZigbee: [tz.warning],
        exposes: [e.warning(), e.battery(), e.battery_low(), e.tamper()],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.defaultSendRequestWhen = 'immediate';
            device.save();
            await device.getEndpoint(1).unbind('genPollCtrl', coordinatorEndpoint);
        },
    },
    {
        zigbeeModel: ['ZBEK-2'],
        model: 'IG-CDZOTAAG014RA-MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 14W to 100W LED RGBW v2',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['ZBEK-1'],
        model: 'IA-CDZOTAAA007MA-MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 7.2 to 60W LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['LXEK-7'],
        model: '9CZA-A806ST-Q1Z',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['LDSENK02F'],
        model: 'LDSENK02F',
        description: '10A/16A EU smart plug',
        vendor: 'ADEO',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_genLevelCtrl_report],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
        exposes: [e.power(), e.switch(), e.energy()],
    },
    {
        zigbeeModel: ['LDSENK10'],
        model: 'LDSENK10',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
];
