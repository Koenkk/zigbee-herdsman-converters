const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    lift_duration: {
        key: ['lift_duration'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write(0x0102, {0xe000: {value, type: 0x21}}, {manufacturerCode: 0x105e});
            return {state: {lift_duration: value}};
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['PUCK/SHUTTER/1'],
        model: 'CCT5015-0001',
        vendor: 'Schneider Electric',
        description: 'Roller shutter module',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.lift_duration],
        exposes: [e.cover_position(), exposes.numeric('lift_duration', ea.STATE_SET).withUnit('seconds')
            .withValueMin(0).withValueMax(300).withDescription('Duration of lift')],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['NHPB/SHUTTER/1'],
        model: 'S520567',
        vendor: 'Schneider Electric',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_position_tilt, tz.cover_state],
        exposes: [e.cover_position()],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['iTRV'],
        model: 'WV704R0A0902',
        vendor: 'Schneider Electric',
        description: 'Wiser radiator thermostat',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_haDiagnostic, fz.ignore_genOta, fz.ignore_zclversion_read,
            fz.legacy.wiser_thermostat, fz.legacy.wiser_itrv_battery, fz.hvac_user_interface, fz.wiser_device_info],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_keypad_lockout],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE).withRunningState(['idle', 'heat'], ea.STATE).withPiHeatingDemand()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genPowerCfg', 'hvacThermostat', 'haDiagnostic'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            // bind of hvacUserInterfaceCfg fails with 'Table Full', does this have any effect?
            await endpoint.configureReporting('hvacUserInterfaceCfg', [{attribute: 'keypadLockout', reportableChange: 1,
                minimumReportInterval: constants.repInterval.MINUTE, maximumReportInterval: constants.repInterval.HOUR}]);
        },
    },
    {
        zigbeeModel: ['U202DST600ZB'],
        model: 'U202DST600ZB',
        vendor: 'Schneider Electric',
        description: 'EZinstall3 2 gang 2x300W dimmer module',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint1 = device.getEndpoint(10);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint1);
            await reporting.brightness(endpoint1);
            const endpoint2 = device.getEndpoint(11);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint2);
            await reporting.brightness(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 10, l2: 11};
        },
    },
    {
        zigbeeModel: ['PUCK/DIMMER/1'],
        model: 'CCT5010-0001',
        vendor: 'Schneider Electric',
        description: 'Micro module dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config],
        exposes: [e.light_brightness().withLevelConfig(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast')],
        whiteLabel: [{vendor: 'Elko', model: 'EKO07090'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingBallastCfg']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['PUCK/SWITCH/1'],
        model: 'CCT5011-0001/CCT5011-0002/MEG5011-0001',
        vendor: 'Schneider Electric',
        description: 'Micro module switch',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Elko', model: 'EKO07144'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['NHROTARY/DIMMER/1'],
        model: 'WDE002334',
        vendor: 'Schneider Electric',
        description: 'Rotary dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config],
        exposes: [e.light_brightness().withLevelConfig(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingBallastCfg']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['NHPB/DIMMER/1'],
        model: 'WDE002386',
        vendor: 'Schneider Electric',
        description: 'Push button dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config],
        exposes: [e.light_brightness().withLevelConfig(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingBallastCfg']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['CH/DIMMER/1'],
        model: '41EPBDWCLMZ/354PBDMBTZ',
        vendor: 'Schneider Electric',
        description: 'Wiser 40/300-Series Module Dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config],
        exposes: [e.light_brightness(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingBallastCfg']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['SMARTPLUG/1'],
        model: 'CCT711119',
        vendor: 'Schneider Electric',
        description: 'Wiser smart plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(),
            exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
                .withDescription('Controls the behaviour when the device is powered on')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
    },
    {
        zigbeeModel: ['U201DST600ZB'],
        model: 'U201DST600ZB',
        vendor: 'Schneider Electric',
        description: 'EZinstall3 1 gang 550W dimmer module',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['U201SRY2KWZB'],
        model: 'U201SRY2KWZB',
        vendor: 'Schneider Electric',
        description: 'Ulti 240V 9.1 A 1 gang relay switch impress switch module, amber LED',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['NHPB/SWITCH/1'],
        model: 'S520530W',
        vendor: 'Schneider Electric',
        description: 'Odace connectable relay switch 10A',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['U202SRY2KWZB'],
        model: 'U202SRY2KWZB',
        vendor: 'Schneider Electric',
        description: 'Ulti 240V 9.1 A 2 gangs relay switch impress switch module, amber LED',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(10);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(11);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 10, l2: 11};
        },
    },
    {
        zigbeeModel: ['1GANG/SHUTTER/1'],
        model: 'MEG5113-0300/MEG5165-0000',
        vendor: 'Schneider Electric',
        description: 'Merten PlusLink Shutter insert with Merten Wiser System M Push Button',
        fromZigbee: [fz.cover_position_tilt, fz.command_cover_close, fz.command_cover_open, fz.command_cover_stop],
        toZigbee: [tz.cover_position_tilt, tz.cover_state],
        exposes: [e.cover_position()],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['LK Switch'],
        model: '545D6514',
        vendor: 'Schneider Electric',
        description: 'LK FUGA wiser wireless double relay',
        meta: {multiEndpoint: true},
        fromZigbee: [fz.on_off, fz.command_on, fz.command_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 's1': 21, 's2': 22, 's3': 23, 's4': 24};
        },
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.action(['on_s*', 'off_s*'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(6) || ep.ID <= 2) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genOnOff']);
                    if (ep.ID <= 2) {
                        await reporting.onOff(ep);
                    }
                }
            });
        },
    },
    {
        zigbeeModel: ['LK Dimmer'],
        model: '545D6102',
        vendor: 'Schneider Electric',
        description: 'LK FUGA wiser wireless dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.schneider_lighting_ballast_configuration, fz.command_recall,
            fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tz.schneider_dimmer_mode],
        endpoint: (device) => {
            return {'l1': 3, 's1': 21, 's2': 22, 's3': 23, 's4': 24};
        },
        meta: {multiEndpoint: true},
        exposes: [e.light_brightness().withLevelConfig().withEndpoint('l1'),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast')
                .withEndpoint('l1'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast')
                .withEndpoint('l1'),
            exposes.enum('dimmer_mode', ea.ALL, ['RC', 'RL']).withDescription('Controls Capacitive or Inductive Dimming Mode')
                .withEndpoint('l1'),
            e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop', 'recall_*'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            // Configure the dimmer actuator endpoint
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingBallastCfg']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            // Configure the four front switches
            device.endpoints.forEach(async (ep) => {
                if (21 <= ep.ID && ep.ID <= 22) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                } else if (23 <= ep.ID && ep.ID <= 24) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genScenes']);
                }
            });
        },
        onEvent: async (type, data, device) => {
            // Record the factory default bindings for easy removal/change after deviceInterview
            if (type === 'deviceInterview') {
                const dimmer = device.getEndpoint(3);
                device.endpoints.forEach(async (ep) => {
                    if (21 <= ep.ID && ep.ID <= 22) {
                        ep.addBinding('genOnOff', dimmer);
                        ep.addBinding('genLevelCtrl', dimmer);
                    }
                    if (23 <= ep.ID && ep.ID <= 24) {
                        ep.addBinding('genScenes', dimmer);
                    }
                });
            }
        },
    },
    {
        zigbeeModel: ['FLS/AIRLINK/4'],
        model: '550D6001',
        vendor: 'Schneider Electric',
        description: 'LK FUGA wiser wireless battery 4 button switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [],
        endpoint: (device) => {
            return {'top': 21, 'bottom': 22};
        },
        meta: {multiEndpoint: true},
        exposes: [e.action(['on_top', 'off_top', 'on_bottom', 'off_bottom', 'brightness_move_up_top', 'brightness_stop_top',
            'brightness_move_down_top', 'brightness_stop_top', 'brightness_move_up_bottom', 'brightness_stop_bottom',
            'brightness_move_down_bottom', 'brightness_stop_bottom'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            // When in 2-gang operation mode, unit operates out of endpoints 21 and 22, otherwise just 21
            const topButtonsEndpoint = device.getEndpoint(21);
            await reporting.bind(topButtonsEndpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            const bottomButtonsEndpoint = device.getEndpoint(22);
            await reporting.bind(bottomButtonsEndpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        fingerprint: [{modelID: 'CCTFR6700', manufacturerName: 'Schneider Electric'}],
        model: 'CCTFR6700',
        vendor: 'Schneider Electric',
        description: 'Heating thermostat',
        fromZigbee: [fz.thermostat, fz.metering, fz.schneider_pilot_mode],
        toZigbee: [tz.schneider_temperature_measured_value, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation,
            tz.schneider_pilot_mode, tz.schneider_temperature_measured_value],
        exposes: [e.power(), e.energy(),
            exposes.enum('schneider_pilot_mode', ea.ALL, ['contactor', 'pilot']).withDescription('Controls piloting mode'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 4, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withPiHeatingDemand()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['hvacThermostat']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint2, {min: 0, max: 60, change: 1});
            await reporting.currentSummDelivered(endpoint2, {min: 0, max: 60, change: 1});
        },
    },
    {
        fingerprint: [{modelID: 'Thermostat', manufacturerName: 'Schneider Electric'}],
        model: 'CCTFR6400',
        vendor: 'Schneider Electric',
        description: 'Temperature/Humidity measurement with thermostat interface',
        fromZigbee: [fz.battery, fz.schneider_temperature, fz.humidity, fz.thermostat, fz.schneider_ui_action],
        toZigbee: [tz.schneider_thermostat_system_mode, tz.schneider_thermostat_occupied_heating_setpoint,
            tz.schneider_thermostat_control_sequence_of_operation, tz.schneider_thermostat_pi_heating_demand,
            tz.schneider_thermostat_keypad_lockout],
        exposes: [e.keypad_lockout().withAccess(ea.STATE_SET), e.humidity(), e.battery(), e.battery_voltage(),
            e.action(['screen_sleep', 'screen_wake', 'button_press_plus_down', 'button_press_center_down', 'button_press_minus_down']),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 4, 30, 0.5, ea.SET).withLocalTemperature(ea.STATE)
                .withPiHeatingDemand(ea.SET)],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint,
                ['genPowerCfg', 'hvacThermostat', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
            endpoint1.saveClusterAttributeKeyValue('genBasic', {zclVersion: 3});
            endpoint1.saveClusterAttributeKeyValue('hvacThermostat', {schneiderWiserSpecific: 1, systemMode: 4, ctrlSeqeOfOper: 2});
            endpoint1.saveClusterAttributeKeyValue('hvacUserInterfaceCfg', {keypadLockout: 0});
        },
    },
    {
        zigbeeModel: ['EH-ZB-SPD-V2'],
        model: 'EER40030',
        vendor: 'Schneider Electric',
        description: 'Zigbee smart plug with power meter',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            const options = {disableDefaultResponse: true};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await endpoint.write('genBasic', {0xe050: {value: 1, type: 0x10}}, options);
        },
    },
    {
        zigbeeModel: ['EH-ZB-LMACT'],
        model: 'EER42000',
        vendor: 'Schneider Electric',
        description: 'Zigbee load actuator with power meter',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['EH-ZB-VACT'],
        model: 'EER53000',
        vendor: 'Schneider Electric',
        description: 'Wiser radiator thermostat (VACT)',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_genOta, fz.ignore_zclversion_read, fz.battery, fz.hvac_user_interface,
            fz.wiser_smart_thermostat, fz.wiser_smart_thermostat_client, fz.wiser_smart_setpoint_command_client],
        toZigbee: [tz.wiser_sed_thermostat_local_temperature_calibration, tz.wiser_sed_occupied_heating_setpoint,
            tz.wiser_sed_thermostat_keypad_lockout, tz.wiser_vact_calibrate_valve, tz.wiser_sed_zone_mode],
        exposes: [e.battery(),
            exposes.binary('keypad_lockout', ea.STATE_SET, 'lock1', 'unlock')
                .withDescription('Enables/disables physical input on the device'),
            exposes.binary('calibrate_valve', ea.STATE_SET, 'calibrate', 'idle')
                .withDescription('Calibrates valve on next wakeup'),
            exposes.enum('valve_calibration_status',
                ea.STATE, ['ongoing', 'successful', 'uncalibrated', 'failed_e1', 'failed_e2', 'failed_e3']),
            exposes.enum('zone_mode',
                ea.STATE_SET, ['manual', 'schedule', 'energy_saver', 'holiday'])
                .withDescription('Icon shown on device displays'),
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 7, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                .withPiHeatingDemand()],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            // Insert default values for client requested attributes
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {minHeatSetpointLimit: 7*100});
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {maxHeatSetpointLimit: 30*100});
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {occupiedHeatingSetpoint: 20*100});
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {systemMode: 4});
            // VACT needs binding to endpoint 11 due to some hardcoding in the device
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(11);
            const binds = ['genBasic', 'genPowerCfg', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpointB, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await endpoint.configureReporting('hvacUserInterfaceCfg', [{attribute: 'keypadLockout',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['EH-ZB-RTS'],
        model: 'EER51000',
        vendor: 'Schneider Electric',
        description: 'Wiser thermostat (RTS)',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_genOta, fz.ignore_zclversion_read, fz.battery, fz.hvac_user_interface,
            fz.wiser_smart_thermostat_client, fz.wiser_smart_setpoint_command_client, fz.schneider_temperature],
        toZigbee: [tz.wiser_sed_zone_mode, tz.wiser_sed_occupied_heating_setpoint],
        exposes: [e.battery(), e.temperature(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE),
            exposes.enum('zone_mode',
                ea.STATE_SET, ['manual', 'schedule', 'energy_saver', 'holiday'])
                .withDescription('Icon shown on device displays')],
        meta: {battery: {voltageToPercentage: '4LR6AA1_5v'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            // Insert default values for client requested attributes
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {minHeatSetpointLimit: 7*100});
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {maxHeatSetpointLimit: 30*100});
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {occupiedHeatingSetpoint: 20*100});
            endpoint.saveClusterAttributeKeyValue('hvacThermostat', {systemMode: 4});
            // RTS needs binding to endpoint 11 due to some hardcoding in the device
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(11);
            const binds = ['genBasic', 'genPowerCfg', 'genIdentify', 'genAlarms', 'genOta', 'hvacThermostat',
                'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpointB, binds);
            // Battery reports without config once a day, do the first read manually
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.configureReporting('msTemperatureMeasurement', [{attribute: 'measuredValue',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.MINUTES_10,
                reportableChange: 50}]);
        },
    },
    {
        zigbeeModel: ['EH-ZB-HACT'],
        model: 'EER50000',
        vendor: 'Schneider Electric',
        description: 'Wiser H-Relay (HACT)',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_genOta, fz.ignore_zclversion_read, fz.wiser_smart_thermostat],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            const binds = ['genBasic', 'genPowerCfg', 'hvacThermostat', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        },
    },
    {
        zigbeeModel: ['FLS/SYSTEM-M/4'],
        model: 'WDE002906',
        vendor: 'Schneider Electric',
        description: 'Wiser wireless switch 1-gang',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']),
            e.battery()],
        meta: {disableActionGroup: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(21);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SOCKET/OUTLET/2'],
        model: 'EKO09738',
        vendor: 'Schneider Electric',
        description: 'Zigbee smart socket with power meter',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.energy(), exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
            .withDescription('Controls the behaviour when the device is powered on'), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acCurrentMultiplier']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ['SOCKET/OUTLET/1'],
        model: 'EKO09716',
        vendor: 'Schneider Electric',
        description: 'Zigbee smart socket with power meter',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.energy(), exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
            .withDescription('Controls the behaviour when the device is powered on'), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acCurrentMultiplier']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ['LK/OUTLET/1'],
        model: '545D6115',
        vendor: 'Schneider Electric',
        description: 'LK FUGA wiser wireless socket outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.energy(), e.current(), e.voltage(),
            exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
                .withDescription('Controls the behaviour when the device is powered on')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acCurrentMultiplier']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
    },
];
