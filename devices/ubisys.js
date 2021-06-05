const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['S1 (5501)'],
        model: 'S1',
        vendor: 'Ubisys',
        description: 'Power switch S1',
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action([
                'toggle', 'on', 'off', 'recall_*',
                'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            ])],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop],
        toZigbee: [tz.on_off, tz.metering_power, tz.ubisys_device_setup],
        endpoint: (device) => {
            return {'l1': 1, 's1': 2, 'meter': 3};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 18 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s1-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S1-R (5601)'],
        model: 'S1-R',
        vendor: 'Ubisys',
        description: 'Power switch S1-R',
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action([
                'toggle', 'on', 'off', 'recall_*',
                'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            ])],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop],
        toZigbee: [tz.on_off, tz.metering_power, tz.ubisys_device_setup],
        endpoint: (device) => {
            return {'l1': 1, 's1': 2, 'meter': 4};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(4);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 18 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s1-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S2 (5502)', 'S2-R (5602)'],
        model: 'S2',
        vendor: 'Ubisys',
        description: 'Power switch S2',
        exposes: [
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action(['toggle_s1', 'toggle_s2', 'on_s1', 'on_s2', 'off_s1', 'off_s2', 'recall_*_s1', 'recal_*_s2', 'brightness_move_up_s1',
                'brightness_move_up_s2', 'brightness_move_down_s1', 'brightness_move_down_s2', 'brightness_stop_s1',
                'brightness_stop_s2'])],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop],
        toZigbee: [tz.on_off, tz.metering_power, tz.ubisys_device_setup],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 's1': 3, 's2': 4, 'meter': 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 20 section 7.4.4 and
             *                      page 22 section 7.5.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s2-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #2 to
             * enable local control
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                const ep3 = device.getEndpoint(3);
                const ep4 = device.getEndpoint(4);
                ep3.addBinding('genOnOff', ep1);
                ep4.addBinding('genOnOff', ep2);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['D1 (5503)', 'D1-R (5603)'],
        model: 'D1',
        vendor: 'Ubisys',
        description: 'Universal dimmer D1',
        fromZigbee: [fz.on_off, fz.brightness, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall,
            fz.command_move, fz.command_stop, fz.lighting_ballast_configuration, fz.level_config, fz.ubisys_dimmer_setup],
        toZigbee: [tz.light_onoff_brightness, tz.ballast_config, tz.level_config, tz.ubisys_dimmer_setup, tz.ubisys_device_setup],
        exposes: [e.light_brightness().withLevelConfig(), e.power(),
            exposes.numeric('ballast_physical_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output the ballast can achieve.'),
            exposes.numeric('ballast_physical_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output the ballast can achieve.'),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast'),
            exposes.binary('capabilities_forward_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer supports AC forward phase control.'),
            exposes.binary('capabilities_reverse_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer supports AC reverse phase control.'),
            exposes.binary('capabilities_reactance_discriminator', ea.ALL, true, false)
                .withDescription('The dimmer is capable of measuring the reactanceto distinguish inductive and capacitive loads.'),
            exposes.binary('capabilities_configurable_curve', ea.ALL, true, false)
                .withDescription('The dimmer is capable of replacing the built-in, default dimming curve.'),
            exposes.binary('capabilities_overload_detection', ea.ALL, true, false)
                .withDescription('The dimmer is capable of detecting an output overload and shutting the output off.'),
            exposes.binary('status_forward_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC forward phase control mode.'),
            exposes.binary('status_reverse_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC reverse phase control mode.'),
            exposes.binary('status_overload', ea.ALL, true, false)
                .withDescription('The output is currently turned off, because the dimmer has detected an overload.'),
            exposes.binary('status_capacitive_load', ea.ALL, true, false)
                .withDescription('The dimmer\'s reactance discriminator had detected a capacitive load.'),
            exposes.binary('status_inductive_load', ea.ALL, true, false)
                .withDescription('The dimmer\'s reactance discriminator had detected an inductive load.'),
            exposes.enum('mode_phase_control', ea.ALL, ['automatic', 'forward', 'reverse'])
                .withDescription('Configures the dimming technique.')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(4);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 23 section 7.3.4, 7.3.5
             * https://www.ubisys.de/wp-content/uploads/ubisys-d1-technical-reference.pdf
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
                ep2.addBinding('genLevelCtrl', ep1);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['J1 (5502)', 'J1-R (5602)'],
        model: 'J1',
        vendor: 'Ubisys',
        description: 'Shutter control J1',
        fromZigbee: [fz.cover_position_tilt, fz.metering],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.ubisys_configure_j1, tz.ubisys_device_setup],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint3);
            await reporting.instantaneousDemand(endpoint3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint1);
        },
        ota: ota.ubisys,
        exposes: [e.cover_position_tilt(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['C4 (5504)'],
        model: 'C4',
        vendor: 'Ubisys',
        description: 'Control unit C4',
        fromZigbee: [fz.legacy.ubisys_c4_scenes, fz.legacy.ubisys_c4_onoff, fz.legacy.ubisys_c4_level, fz.legacy.ubisys_c4_cover],
        toZigbee: [tz.ubisys_device_setup],
        exposes: [e.action([
            '1_scene_*', '1_on', '1_off', '1_toggle', '1_level_move_down', '1_level_move_up',
            '2_scene_*', '2_on', '2_off', '2_toggle', '2_level_move_down', '2_level_move_up',
            '3_scene_*', '3_on', '3_off', '3_toggle', '3_level_move_down', '3_level_move_up',
            '4_scene_*', '4_on', '4_off', '4_toggle', '4_level_move_down', '4_level_move_up',
            '5_scene_*', '5_cover_open', '5_cover_close', '5_cover_stop',
            '6_scene_*', '6_cover_open', '6_cover_close', '6_cover_stop'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ep of [1, 2, 3, 4]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'genOnOff', 'genLevelCtrl']);
            }
            for (const ep of [5, 6]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'closuresWindowCovering']);
            }
        },
        ota: ota.ubisys,
    },
];
