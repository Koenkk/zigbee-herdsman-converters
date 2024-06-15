import {Zcl} from 'zigbee-herdsman';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as globalStore from '../lib/store';
import * as constants from '../lib/constants';
import * as utils from '../lib/utils';
import {Definition, Fz, Zh} from '../lib/types';
import {
    deviceEndpoints,
    electricityMeter,
    light,
    onOff,
    battery,
    identify,
    occupancy,
    temperature,
    humidity,
    illuminance,
    commandsOnOff,
    commandsLevelCtrl,
    commandsColorCtrl,
    commandsScenes,
} from '../lib/modernExtend';
import {logger} from '../lib/logger';

const NS = 'zhc:sunricher';
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    sunricher_SRZGP2801K45C: {
        cluster: 'greenPower',
        type: ['commandNotification', 'commandCommissioningNotification'],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (utils.hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID === 224) return;
            const lookup = {
                0x21: 'press_on',
                0x20: 'press_off',
                0x37: 'press_high',
                0x38: 'press_low',
                0x35: 'hold_high',
                0x36: 'hold_low',
                0x34: 'high_low_release',
                0x63: 'cw_ww_release',
                0x62: 'cw_dec_ww_inc',
                0x64: 'ww_inc_cw_dec',
                0x41: 'r_g_b',
                0x42: 'b_g_r',
                0x40: 'rgb_release',
            };
            if (!lookup.hasOwnProperty(commandID)) {
                logger.error(`Missing command '0x${commandID.toString(16)}'`, NS);
            } else {
                return {action: utils.getFromLookup(commandID, lookup)};
            }
        },
    } satisfies Fz.Converter,
};

async function syncTime(endpoint: Zh.Endpoint) {
    try {
        const time = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000 + ((new Date()).getTimezoneOffset() * -1) * 60);
        const values = {time: time};
        await endpoint.write('genTime', values);
    } catch (error) {/* Do nothing*/}
}

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZG2858A'],
        model: 'ZG2858A',
        vendor: 'Sunricher',
        description: 'Zigbee handheld remote RGBCCT 3 channels',
        extend: [
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3}}),
            battery(),
            identify(),
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsColorCtrl(),
            commandsScenes(),
        ],
    },
    {
        zigbeeModel: ['HK-SL-DIM-US-A'],
        model: 'HK-SL-DIM-US-A',
        vendor: 'Sunricher',
        description: 'Keypad smart dimmer',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
    {
        zigbeeModel: ['HK-SENSOR-4IN1-A'],
        model: 'HK-SENSOR-4IN1-A',
        vendor: 'Sunricher',
        description: '4IN1 Sensor',
        extend: [battery(), identify(), occupancy(), temperature(), humidity(), illuminance()],
    },
    {
        zigbeeModel: ['SR-ZG9023A-EU'],
        model: 'SR-ZG9023A-EU',
        vendor: 'Sunricher',
        description: '4 ports switch with 2 usb ports (no metering)',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4', 'l5']}),
        ],
    },
    {
        zigbeeModel: ['ON/OFF(2CH)'],
        model: 'UP-SA-9127D',
        vendor: 'Sunricher',
        description: 'LED-Trading 2 channel AC switch',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            onOff({endpointNames: ['l1', 'l2']}),
        ],
    },
    {
        fingerprint: [{modelID: 'ON/OFF(2CH)', softwareBuildID: '2.9.2_r54'}],
        model: 'SR-ZG9101SAC-HP-SWITCH-2CH',
        vendor: 'Sunricher',
        description: 'Zigbee 2 channel switch',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior, fz.ignore_genOta],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power(), e.current(),
            e.voltage(), e.energy(), e.power_on_behavior(['off', 'on', 'previous'])],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['power', 'energy', 'voltage', 'current']},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint1);
            await reporting.activePower(endpoint1);
            await reporting.rmsCurrent(endpoint1, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint1, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint1);
            await reporting.currentSummDelivered(endpoint1);
        },
    },
    {
        zigbeeModel: ['HK-ZD-CCT-A'],
        model: 'HK-ZD-CCT-A',
        vendor: 'Sunricher',
        description: '50W Zigbee CCT LED driver (constant current)',
        extend: [light({colorTemp: {range: [160, 450]}})],
    },
    {
        zigbeeModel: ['ZGRC-KEY-004'],
        model: 'SR-ZG9001K2-DIM',
        vendor: 'Sunricher',
        description: 'Zigbee wall remote control for single color, 1 zone',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off',
            'brightness_move_up', 'brightness_move_down', 'brightness_move_stop'])],
    },
    {
        zigbeeModel: ['ZGRC-KEY-007'],
        model: 'SR-ZG9001K2-DIM2',
        vendor: 'Sunricher',
        description: 'Zigbee 2 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ZGRC-KEY-009'],
        model: '50208693',
        vendor: 'Sunricher',
        description: 'Zigbee wall remote control for RGBW, 1 zone with 2 scenes',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery,
            fz.command_recall, fz.command_step, fz.command_move_to_color, fz.command_move_to_color_temp],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off',
            'brightness_move_up', 'brightness_move_down', 'brightness_move_stop', 'brightness_step_up', 'brightness_step_down',
            'recall_1', 'recall_2'])],
    },
    {
        zigbeeModel: ['ZGRC-KEY-012'],
        model: 'SR-ZG9001K12-DIM-Z5',
        vendor: 'Sunricher',
        description: '5 zone remote and dimmer',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2',
            'on_3', 'off_3', 'brightness_move_up_3', 'brightness_move_down_3', 'brightness_stop_3',
            'on_4', 'off_4', 'brightness_move_up_4', 'brightness_move_down_4', 'brightness_stop_4',
            'on_5', 'off_5', 'brightness_move_up_5', 'brightness_move_down_5', 'brightness_stop_5'])],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['ZGRC-KEY-013'],
        model: 'SR-ZG9001K12-DIM-Z4',
        vendor: 'Sunricher',
        description: '4 zone remote and dimmer',
        fromZigbee: [fz.battery, fz.command_move, legacy.fz.ZGRC013_brightness_onoff,
            legacy.fz.ZGRC013_brightness, fz.command_stop, legacy.fz.ZGRC013_brightness_stop, fz.command_on,
            legacy.fz.ZGRC013_cmdOn, fz.command_off, legacy.fz.ZGRC013_cmdOff, fz.command_recall],
        exposes: [e.battery(), e.action(['brightness_move_up', 'brightness_move_down', 'brightness_stop', 'on', 'off', 'recall_*'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'RGB Genie', model: 'ZGRC-KEY-013'}],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genScenes']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['ZGRC-TEUR-005'],
        model: 'SR-ZG9001T4-DIM-EU',
        vendor: 'Sunricher',
        description: 'Zigbee wireless touch dimmer switch',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        exposes: [e.action(['recall_*', 'on', 'off', 'brightness_stop', 'brightness_move_down', 'brightness_move_up',
            'brightness_step_down', 'brightness_step_up'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['CCT Lighting'],
        model: 'ZG192910-4',
        vendor: 'Sunricher',
        description: 'Zigbee LED-controller',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['ZG9101SAC-HP'],
        model: 'ZG9101SAC-HP',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['ON/OFF -M', 'ON/OFF', 'ZIGBEE-SWITCH'],
        model: 'ZG9101SAC-HP-Switch',
        vendor: 'Sunricher',
        description: 'Zigbee AC in wall switch',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['Micro Smart Dimmer', 'SM311', 'HK-SL-RDIM-A', 'HK-SL-DIM-EU-A'],
        model: 'ZG2835RAC',
        vendor: 'Sunricher',
        description: 'ZigBee knob smart dimmer',
        extend: [light({configureReporting: true}), electricityMeter()],
        whiteLabel: [{vendor: 'YPHIX', model: '50208695'}, {vendor: 'Samotech', model: 'SM311'}],
    },
    {
        zigbeeModel: ['ZG2835'],
        model: 'ZG2835',
        vendor: 'Sunricher',
        description: 'ZigBee knob smart dimmer',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_level],
        exposes: [e.action(['on', 'off', 'brightness_move_to_level'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['HK-SL-DIM-A'],
        model: 'SR-ZG9040A',
        vendor: 'Sunricher',
        description: 'Zigbee micro smart dimmer',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
    {
        zigbeeModel: ['HK-ZD-DIM-A'],
        model: 'SRP-ZG9105-CC',
        vendor: 'Sunricher',
        description: 'Constant Current Zigbee LED dimmable driver',
        extend: [light()],
    },
    {
        zigbeeModel: ['HK-DIM'],
        model: '50208702',
        vendor: 'Sunricher',
        description: 'LED dimmable driver',
        extend: [light()],
        whiteLabel: [{vendor: 'Yphix', model: '50208702'}],
    },
    {
        zigbeeModel: ['SR-ZG9040A-S'],
        model: 'SR-ZG9040A-S',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer single-line',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['Micro Smart OnOff', 'HK-SL-RELAY-A'],
        model: 'SR-ZG9100A-S',
        vendor: 'Sunricher',
        description: 'Zigbee AC in wall switch single-line',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['ZG2819S-CCT'],
        model: 'ZG2819S-CCT',
        vendor: 'Sunricher',
        description: 'Zigbee handheld remote CCT 4 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off', 'toggle', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation', 'hue_stop'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
    {
        zigbeeModel: ['HK-ZCC-A'],
        model: 'SR-ZG9080A',
        vendor: 'Sunricher',
        description: 'Curtain motor controller',
        meta: {coverInverted: true},
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x00000000010.....$/},
            {modelID: 'GreenPower_2', ieeeAddr: /^0x0000000001b.....$/}],
        model: 'SR-ZGP2801K2-DIM',
        vendor: 'Sunricher',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fz.sunricher_switch2801K2],
        toZigbee: [],
        exposes: [e.action(['press_on', 'press_off', 'hold_on', 'hold_off', 'release'])],
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x000000005d5.....$/},
            {modelID: 'GreenPower_2', ieeeAddr: /^0x0000000057e.....$/},
            {modelID: 'GreenPower_2', ieeeAddr: /^0x000000001fa.....$/},
            {modelID: 'GreenPower_2', ieeeAddr: /^0x0000000034b.....$/},
            {modelID: 'GreenPower_2', ieeeAddr: /^0x00000000f12.....$/}],
        model: 'SR-ZGP2801K4-DIM',
        vendor: 'Sunricher',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fz.sunricher_switch2801K4],
        toZigbee: [],
        exposes: [e.action(['press_on', 'press_off', 'press_high', 'press_low', 'hold_high', 'hold_low', 'release'])],
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x00000000aaf.....$/}],
        model: 'SR-ZGP2801K-5C',
        vendor: 'Sunricher',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fzLocal.sunricher_SRZGP2801K45C],
        toZigbee: [],
        exposes: [e.action(['press_on', 'press_off', 'press_high', 'press_low', 'hold_high', 'hold_low', 'high_low_release',
            'cw_ww_release', 'cw_dec_ww_inc', 'ww_inc_cw_dec', 'r_g_b', 'b_g_r', 'rgb_release'])],
    },
    {
        zigbeeModel: ['ZG9092', 'HK-LN-HEATER-A'],
        model: 'SR-ZG9092A',
        vendor: 'Sunricher',
        description: 'Touch thermostat',
        fromZigbee: [fz.thermostat, fz.namron_thermostat, fz.metering, fz.electrical_measurement, fz.namron_hvac_user_interface],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_occupancy,
            tz.thermostat_local_temperature_calibration, tz.thermostat_local_temperature, tz.thermostat_outdoor_temperature,
            tz.thermostat_system_mode, tz.thermostat_control_sequence_of_operation, tz.thermostat_running_state,
            tz.namron_thermostat, tz.namron_thermostat_child_lock],
        exposes: [
            e.numeric('outdoor_temperature', ea.STATE_GET).withUnit('°C')
                .withDescription('Current temperature measured from the floor sensor'),
            e.climate()
                .withSetpoint('occupied_heating_setpoint', 0, 40, 0.1)
                .withSetpoint('unoccupied_heating_setpoint', 0, 40, 0.1)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withSystemMode(['off', 'auto', 'heat'])
                .withRunningState(['idle', 'heat']),
            e.binary('away_mode', ea.ALL, 'ON', 'OFF')
                .withDescription('Enable/disable away mode'),
            e.binary('child_lock', ea.ALL, 'UNLOCK', 'LOCK')
                .withDescription('Enables/disables physical input on the device'),
            e.power(), e.current(), e.voltage(), e.energy(),
            e.enum('lcd_brightness', ea.ALL, ['low', 'mid', 'high'])
                .withDescription('OLED brightness when operating the buttons.  Default: Medium.'),
            e.enum('button_vibration_level', ea.ALL, ['off', 'low', 'high'])
                .withDescription('Key beep volume and vibration level.  Default: Low.'),
            e.enum('floor_sensor_type', ea.ALL, ['10k', '15k', '50k', '100k', '12k'])
                .withDescription('Type of the external floor sensor.  Default: NTC 10K/25.'),
            e.enum('sensor', ea.ALL, ['air', 'floor', 'both'])
                .withDescription('The sensor used for heat control.  Default: Room Sensor.'),
            e.enum('powerup_status', ea.ALL, ['default', 'last_status'])
                .withDescription('The mode after a power reset.  Default: Previous Mode.'),
            e.numeric('floor_sensor_calibration', ea.ALL)
                .withUnit('°C')
                .withValueMin(-3).withValueMax(3).withValueStep(0.1)
                .withDescription('The tempearatue calibration for the external floor sensor, between -3 and 3 in 0.1°C.  Default: 0.'),
            e.numeric('dry_time', ea.ALL)
                .withUnit('min')
                .withValueMin(5).withValueMax(100)
                .withDescription('The duration of Dry Mode, between 5 and 100 minutes.  Default: 5.'),
            e.enum('mode_after_dry', ea.ALL, ['off', 'manual', 'auto', 'away'])
                .withDescription('The mode after Dry Mode.  Default: Auto.'),
            e.enum('temperature_display', ea.ALL, ['room', 'floor'])
                .withDescription('The temperature on the display.  Default: Room Temperature.'),
            e.numeric('window_open_check', ea.ALL)
                .withUnit('°C')
                .withValueMin(0).withValueMax(8).withValueStep(0.5)
                .withDescription('The threshold to detect window open, between 0.0 and 8.0 in 0.5 °C.  Default: 0 (disabled).'),
            e.numeric('hysterersis', ea.ALL)
                .withUnit('°C')
                .withValueMin(0.5).withValueMax(2).withValueStep(0.1)
                .withDescription('Hysteresis setting, between 0.5 and 2 in 0.1 °C.  Default: 0.5.'),
            e.enum('display_auto_off_enabled', ea.ALL, ['disabled', 'enabled']),
            e.numeric('alarm_airtemp_overvalue', ea.ALL)
                .withUnit('°C')
                .withValueMin(20).withValueMax(60)
                .withDescription('Room temperature alarm threshold, between 20 and 60 in °C.  0 means disabled.  Default: 45.'),
        ],
        onEvent: async (type, data, device, options) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'time'));
                globalStore.clearValue(device, 'time');
            } else if (!globalStore.hasValue(device, 'time')) {
                const endpoint = device.getEndpoint(1);
                const hours24 = 1000 * 60 * 60 * 24;
                // Device does not ask for the time with binding, therefore we write the time every 24 hours
                const interval = setInterval(async () => await syncTime(endpoint), hours24);
                globalStore.putValue(device, 'time', interval);
            }
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'hvacThermostat', 'seMetering', 'haElectricalMeasurement', 'genAlarms',
                'msOccupancySensing', 'genTime', 'hvacUserInterfaceCfg',
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // standard ZCL attributes
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            try {
                await reporting.thermostatKeypadLockMode(endpoint);
            } catch (error) {
                // Fails for some
                // https://github.com/Koenkk/zigbee2mqtt/issues/15025
                logger.debug(`Failed to setup keypadLockout reporting`, NS);
            }

            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'occupancy',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);

            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor']);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);

            await reporting.activePower(endpoint, {min: 30, change: 10}); // Min report change 10W
            await reporting.rmsCurrent(endpoint, {min: 30, change: 50}); // Min report change 0.05A
            await reporting.rmsVoltage(endpoint, {min: 30, change: 20}); // Min report change 2V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);

            // Custom attributes
            const options = {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_SUNRICHER_TECHNOLOGY_LTD};

            // OperateDisplayLcdBrightnesss
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1000, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // ButtonVibrationLevel
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1001, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // FloorSensorType
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1002, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // ControlType
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1003, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // PowerUpStatus
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1004, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // FloorSensorCalibration
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1005, type: 0x28},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 0,
                }],
                options,
            );
            // DryTime
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1006, type: 0x20},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 0,
                }],
                options,
            );
            // ModeAfterDry
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1007, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // TemperatureDisplay
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1008, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // WindowOpenCheck
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x1009, type: 0x20},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 0,
                }],
                options,
            );
            // Hysterersis
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x100A, type: 0x20},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 0,
                }],
                options,
            );
            // DisplayAutoOffEnable
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x100B, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );
            // AlarmAirTempOverValue
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x2001, type: 0x20},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 0,
                }],
                options,
            );
            // Away Mode Set
            await endpoint.configureReporting(
                'hvacThermostat',
                [{
                    attribute: {ID: 0x2002, type: 0x30},
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                }],
                options,
            );

            // Device does not asks for the time with binding, we need to write time during configure
            await syncTime(endpoint);

            // Trigger initial read
            await endpoint.read('hvacThermostat', ['systemMode', 'runningState', 'occupiedHeatingSetpoint']);
            await endpoint.read('hvacThermostat', [0x1000, 0x1001, 0x1002, 0x1003], options);
            await endpoint.read('hvacThermostat', [0x1004, 0x1005, 0x1006, 0x1007], options);
            await endpoint.read('hvacThermostat', [0x1008, 0x1009, 0x100A, 0x100B], options);
            await endpoint.read('hvacThermostat', [0x2001, 0x2002], options);
        },
    },
    {
        fingerprint: [{modelID: 'TERNCY-DC01', manufacturerName: 'Sunricher'}, {modelID: 'HK-SENSOR-CT-A', manufacturerName: 'Sunricher'}],
        model: 'SR-ZG9010A',
        vendor: 'Sunricher',
        description: 'Door windows sensor',
        fromZigbee: [fz.U02I007C01_contact, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
