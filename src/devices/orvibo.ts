import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {deviceEndpoints, light, onOff, battery, humidity, temperature} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Tz} from '../lib/types';

const e = exposes.presets;

const tzLocal = {
    DD10Z_brightness: {
        key: ['brightness'],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            // Device doesn't support moveToLevelWithOnOff therefore this converter is needed.
            await entity.command('genLevelCtrl', 'moveToLevel', {level: Number(value), transtime: 0}, {disableDefaultResponse: true});
            return {state: {brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', ['currentLevel']);
        },
    } satisfies Tz.Converter,
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ccb9f56837ab41dcad366fb1452096b6', '250bccf66c41421b91b5e3242942c164'],
        model: 'DD10Z',
        vendor: 'ORVIBO',
        description: 'Smart spotlight',
        // https://github.com/Koenkk/zigbee2mqtt/issues/13123#issuecomment-1198793749
        meta: {disableDefaultResponse: true},
        toZigbee: [tzLocal.DD10Z_brightness],
        extend: [light({powerOnBehavior: false, colorTemp: {range: [153, 370], startup: false}})],
    },
    {
        zigbeeModel: ['4a33f5ea766a4c96a962b371ffde9943'],
        model: 'DS20Z07B',
        vendor: 'ORVIBO',
        description: 'Downlight (S series)',
        extend: [light({colorTemp: {range: [166, 370]}})],
    },
    {
        zigbeeModel: ['ORVIBO Socket', '93e29b89b2ee45bea5bdbb7679d75d24'],
        model: 'OR-ZB-S010-3C',
        vendor: 'ORVIBO',
        description: 'Smart socket',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['3c4e4fc81ed442efaf69353effcdfc5f', '51725b7bcba945c8a595b325127461e9'],
        model: 'CR11S8UZ',
        vendor: 'ORVIBO',
        description: 'Smart sticker switch',
        fromZigbee: [fz.orvibo_raw_1],
        exposes: [
            e.action([
                'button_1_click',
                'button_1_hold',
                'button_1_release',
                'button_2_click',
                'button_2_hold',
                'button_2_release',
                'button_3_click',
                'button_3_hold',
                'button_3_release',
                'button_4_click',
                'button_4_hold',
                'button_4_release',
            ]),
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['31c989b65ebb45beaf3b67b1361d3965'],
        model: 'T18W3Z',
        vendor: 'ORVIBO',
        description: 'Neutral smart switch 3 gang',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), onOff({endpointNames: ['l1', 'l2', 'l3']})],
    },
    {
        zigbeeModel: ['fdd76effa0e146b4bdafa0c203a37192', 'c670e231d1374dbc9e3c6a9fffbd0ae6', '75a4bfe8ef9c4350830a25d13e3ab068'],
        model: 'SM10ZW',
        vendor: 'ORVIBO',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['8643db61de35494d93e72c1289b526a3'],
        model: 'RL804CZB',
        vendor: 'ORVIBO',
        description: 'Zigbee LED controller RGB + CCT or RGBW',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['82c167c95ed746cdbd21d6817f72c593', '8762413da99140cbb809195ff40f8c51'],
        model: 'RL804QZB',
        vendor: 'ORVIBO',
        description: 'Multi-functional 3 gang relay',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), onOff({endpointNames: ['l1', 'l2', 'l3'], configureReporting: false})],
    },
    {
        zigbeeModel: ['396483ce8b3f4e0d8e9d79079a35a420'],
        model: 'CM10ZW',
        vendor: 'ORVIBO',
        description: 'Multi-functional 3 gang relay',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), onOff({endpointNames: ['l1', 'l2', 'l3']})],
    },
    {
        zigbeeModel: ['b467083cfc864f5e826459e5d8ea6079'],
        model: 'ST20',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['888a434f3cfc47f29ec4a3a03e9fc442'],
        model: 'ST21',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity Sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ['898ca74409a740b28d5841661e72268d', '50938c4c3c0b4049923cd5afbc151bde'],
        model: 'ST30',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity sensor',
        extend: [battery(), humidity(), temperature()],
    },
    {
        zigbeeModel: ['9f76c9f31b4c4a499e3aca0977ac4494', '6fd24c0f58a04c848fea837aaa7d6e0f'],
        model: 'T30W3Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 3 gang',
        extend: [deviceEndpoints({endpoints: {top: 1, center: 2, bottom: 3}}), onOff({endpointNames: ['top', 'center', 'bottom']})],
    },
    {
        zigbeeModel: ['074b3ffba5a045b7afd94c47079dd553'],
        model: 'T21W2Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 2 gang',
        extend: [deviceEndpoints({endpoints: {top: 1, bottom: 2}}), onOff({endpointNames: ['top', 'bottom']})],
    },
    {
        zigbeeModel: ['095db3379e414477ba6c2f7e0c6aa026'],
        model: 'T21W1Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 1 gang',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['093199ff04984948b4c78167c8e7f47e', 'c8daea86aa9c415aa524365775b1218c', 'c8daea86aa9c415aa524365775b1218'],
        model: 'W40CZ',
        vendor: 'ORVIBO',
        description: 'Smart curtain motor',
        fromZigbee: [fz.curtain_position_analog_output, fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['428f8caf93574815be1a98fa6732c3ea'],
        model: 'W45CZ',
        vendor: 'ORVIBO',
        description: 'Smart curtain motor',
        fromZigbee: [fz.curtain_position_analog_output, fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['e0fc98cc88df4857847dc4ae73d80b9e'],
        model: 'R11W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2}}), onOff({endpointNames: ['l1', 'l2']})],
    },
    {
        zigbeeModel: ['9ea4d5d8778d4f7089ac06a3969e784b', '83b9b27d5ffb4830bf35be5b1023623e', '2810c2403b9c4a5db62cc62d1030d95e'],
        model: 'R20W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2}}), onOff({endpointNames: ['l1', 'l2']})],
    },
    {
        zigbeeModel: ['131c854783bc45c9b2ac58088d09571c', 'b2e57a0f606546cd879a1a54790827d6', '585fdfb8c2304119a2432e9845cf2623'],
        model: 'SN10ZW',
        vendor: 'ORVIBO',
        description: 'Occupancy sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['da2edf1ded0d44e1815d06f45ce02029'],
        model: 'SW21',
        vendor: 'ORVIBO',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['b7e305eb329f497384e966fe3fb0ac69', '52debf035a1b4a66af56415474646c02', 'MultIR', 'ZL1-EN'],
        model: 'SW30',
        vendor: 'ORVIBO',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['987b1869e4944218aa0034750d4ac585'],
        model: 'SE20-O',
        vendor: 'ORVIBO',
        description: 'Smart emergency button',
        fromZigbee: [fz.command_status_change_notification_action],
        exposes: [e.action(['single'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['72bd56c539ca4c7fba73a9be0ae0d19f'],
        model: 'SE21',
        vendor: 'ORVIBO',
        description: 'Smart emergency button',
        fromZigbee: [fz.command_status_change_notification_action],
        exposes: [e.action(['off', 'single', 'double', 'hold'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['2a103244da0b406fa51410c692f79ead'],
        model: 'AM25',
        vendor: 'ORVIBO',
        description: 'Smart blind controller',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
            device.powerSource = 'Battery';
            device.save();
        },
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['2ae011fb6d0542f58705d6861064eb5f'],
        model: 'T40W1Z',
        vendor: 'ORVIBO',
        description: 'MixSwitch 1 gang',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['2e13af8e17434961be98f055d68c2166'],
        model: 'T40W2Z',
        vendor: 'ORVIBO',
        description: 'MixSwitch 2 gangs',
        extend: [deviceEndpoints({endpoints: {left: 1, right: 2}}), onOff({endpointNames: ['left', 'right']})],
    },
    {
        zigbeeModel: ['e8d667cb184b4a2880dd886c23d00976'],
        model: 'T40W3Z',
        vendor: 'ORVIBO',
        description: 'MixSwitch 3 gangs',
        extend: [deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}), onOff({endpointNames: ['left', 'center', 'right']})],
    },
    {
        zigbeeModel: ['20513b10079f4cc68cffb8b0dc6d3277'],
        model: 'T40W4Z',
        vendor: 'ORVIBO',
        description: 'MixSwitch 4 gangs',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2, l4: 3, l5: 5, l6: 6}}), onOff({endpointNames: ['l1', 'l2', 'l4', 'l5', 'l6']})],
    },
    {
        zigbeeModel: ['bcb949e87e8c4ea6bc2803052dd8fbf5'],
        model: 'T40S6Z',
        vendor: 'ORVIBO',
        description: 'MixSwitch 6 gangs',
        fromZigbee: [fz.orvibo_raw_2],
        toZigbee: [],
        exposes: [e.action(['button_1_click', 'button_2_click', 'button_3_click', 'button_4_click', 'button_5_click', 'button_6_click'])],
    },
    {
        zigbeeModel: ['ba8120ad03f744ecb6a973672369e80d'],
        model: 'T41W1Z',
        vendor: 'ORVIBO',
        description: 'MixSwitch 1 gang (without neutral wire)',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['7c8f476a0f764cd4b994bc73d07c906d'],
        model: 'T41W2Z',
        vendor: 'ORVIBO',
        description: 'MixSwitch 2 gang (without neutral wire)',
        extend: [deviceEndpoints({endpoints: {left: 1, right: 2}}), onOff({endpointNames: ['left', 'right']})],
    },
    {
        zigbeeModel: ['cb7ce9fe2cb147e69c5ea700b39b3d5b'],
        model: 'DM10ZW',
        vendor: 'ORVIBO',
        description: '0-10v dimmer',
        extend: [light({colorTemp: {range: [153, 371]}})],
    },
    {
        zigbeeModel: ['1a20628504bf48c88ed698fe96b7867c'],
        model: 'DTZ09039',
        vendor: 'ORVIBO',
        description: 'Downlight (Q series)',
        extend: [light()],
    },
    {
        zigbeeModel: ['bbfed49c738948b989911f9f9f73d759'],
        model: 'R30W3Z',
        vendor: 'ORVIBO',
        description: 'In-wall switch 3 gang',
        extend: [deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}), onOff({endpointNames: ['left', 'center', 'right']})],
    },
    {
        zigbeeModel: ['0e93fa9c36bb417a90ad5d8a184b683a'],
        model: 'SM20',
        vendor: 'ORVIBO',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
