'use strict';

const debug = require('debug')('zigbee-shepherd-converters:devices');
const fz = require('./converters/fromZigbee');
const tz = require('./converters/toZigbee');

const generic = {
    light_onoff_brightness: () => {
        return {
            supports: 'on/off, brightness',
            fromZigbee: [fz.light_brightness, fz.light_state],
            toZigbee: [tz.onoff, tz.light_brightness, tz.ignore_transition],
        };
    },
    light_onoff_brightness_colortemp: () => {
        return {
            supports: 'on/off, brightness, color temperature',
            fromZigbee: [fz.light_brightness, fz.light_color_colortemp, fz.light_state],
            toZigbee: [tz.onoff, tz.light_brightness, tz.light_colortemp, tz.ignore_transition],
        };
    },
    light_onoff_brightness_colorxy: () => {
        return {
            supports: 'on/off, brightness, color xy',
            fromZigbee: [fz.light_brightness, fz.light_color_colortemp, fz.light_state],
            toZigbee: [tz.onoff, tz.light_brightness, tz.light_color, tz.ignore_transition],
        };
    },
    light_onoff_brightness_colortemp_colorxy: () => {
        return {
            supports: 'on/off, brightness, color temperature, color xy',
            fromZigbee: [fz.light_brightness, fz.light_color_colortemp, fz.light_state],
            toZigbee: [tz.onoff, tz.light_brightness, tz.light_colortemp, tz.light_color, tz.ignore_transition],
        };
    },
};

const foundationCfg = {manufSpec: 0, disDefaultRsp: 0};

const execute = (device, actions, callback, delay) => {
    if (device) {
        delay = delay || 300;
        actions = actions.reverse();

        const next = () => {
            if (actions.length === 0) {
                callback(true);
                return;
            }

            setTimeout(() => {
                const action = actions.pop();
                action((error) => {
                    debug(`Configured '${action.toString()}' with result '${error ? error : 'OK'}'`);
                    if (error) {
                        callback(false);
                    } else {
                        next();
                    }
                });
            }, delay);
        };

        next();
    } else {
        callback(false);
    }
};

const devices = [
    // Xiaomi
    {
        zigbeeModel: ['lumi.sensor_switch'],
        model: 'WXKG01LM',
        vendor: 'Xiaomi',
        description: 'MiJia wireless switch',
        supports: 'single, double, triple, quadruple, many, long, long_release click',
        fromZigbee: [fz.xiaomi_battery_3v, fz.WXKG01LM_click, fz.ignore_onoff_change, fz.ignore_basic_change],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq2', 'lumi.remote.b1acn01\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: 'WXKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch',
        supports: 'single, double click (and triple, quadruple, hold, release depending on model)',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG11LM_click, fz.ignore_onoff_change, fz.ignore_basic_change,
            fz.xiaomi_action_click_multistate, fz.ignore_multistate_change,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq3', 'lumi.sensor_swit'],
        model: 'WXKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch (with gyroscope)',
        supports: 'single, double, shake, hold, release',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG12LM_action_click_multistate, fz.ignore_onoff_change,
            fz.ignore_basic_change, fz.ignore_multistate_change,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw1\u0000lu', 'lumi.remote.b186acn01\u0000\u0000\u0000'],
        model: 'WXKG03LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wireless wall switch',
        supports: 'single click',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG03LM_click, fz.ignore_basic_change,
            fz.xiaomi_action_click_multistate, fz.ignore_multistate_change,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw2\u0000Un', 'lumi.sensor_86sw2.es1', 'lumi.remote.b286acn01\u0000\u0000\u0000'],
        model: 'WXKG02LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wireless wall switch',
        supports: 'left, right and both click',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG02LM_click, fz.ignore_basic_change,
            fz.WXKG02LM_click_multistate, fz.ignore_multistate_change,
        ],
        toZigbee: [],
        ep: {'left': 1, 'right': 2, 'both': 3},
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral1'],
        model: 'QBKG04LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch',
        supports: 'on/off',
        fromZigbee: [
            fz.QBKG04LM_QBKG11LM_state, fz.ignore_onoff_change, fz.ignore_basic_change, fz.ignore_basic_report,
        ],
        toZigbee: [tz.onoff],
        ep: {'': 2},
    },
    {
        zigbeeModel: ['lumi.ctrl_ln1.aq1'],
        model: 'QBKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch',
        supports: 'on/off, power measurement',
        fromZigbee: [
            fz.QBKG04LM_QBKG11LM_state, fz.QBKG11LM_power, fz.ignore_onoff_change, fz.ignore_basic_change,
            fz.ignore_multistate_report, fz.ignore_multistate_change, fz.ignore_analog_change, fz.ignore_analog_report,
        ],
        toZigbee: [tz.onoff],
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral2'],
        model: 'QBKG03LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch',
        supports: 'release/hold, on/off',
        fromZigbee: [
            fz.QBKG03LM_QBKG12LM_state, fz.QBKG03LM_buttons, fz.ignore_basic_change, fz.ignore_basic_report,
        ],
        toZigbee: [tz.onoff],
        ep: {'left': 2, 'right': 3},
    },
    {
        zigbeeModel: ['lumi.ctrl_ln2.aq1'],
        model: 'QBKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch',
        supports: 'on/off, power measurement',
        fromZigbee: [
            fz.QBKG03LM_QBKG12LM_state, fz.QBKG12LM_power, fz.ignore_analog_change, fz.ignore_basic_change,
            fz.ignore_multistate_report, fz.ignore_multistate_change, fz.ignore_onoff_change, fz.ignore_analog_report,
        ],
        toZigbee: [tz.onoff],
        ep: {'left': 1, 'right': 2},
    },
    {
        zigbeeModel: ['lumi.sens'],
        model: 'WSDCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia temperature & humidity sensor ',
        supports: 'temperature and humidity',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WSDCGQ01LM_WSDCGQ11LM_interval, fz.generic_temperature, fz.xiaomi_humidity,
            fz.ignore_basic_change,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.weather'],
        model: 'WSDCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara temperature, humidity and pressure sensor',
        supports: 'temperature, humidity and pressure',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.generic_temperature, fz.xiaomi_humidity, fz.xiaomi_pressure,
            fz.ignore_basic_change, fz.ignore_temperature_change, fz.ignore_humidity_change,
            fz.ignore_pressure_change, fz.WSDCGQ01LM_WSDCGQ11LM_interval,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_motion'],
        model: 'RTCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia human body movement sensor',
        supports: 'occupancy',
        fromZigbee: [fz.xiaomi_battery_3v, fz.generic_occupancy, fz.ignore_basic_change],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_motion.aq2'],
        model: 'RTCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara human body movement and illuminance sensor',
        supports: 'occupancy and illuminance',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.generic_occupancy, fz.generic_illuminance, fz.ignore_basic_change,
            fz.ignore_illuminance_change, fz.ignore_occupancy_change,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet'],
        model: 'MCCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia door & window contact sensor',
        supports: 'contact',
        fromZigbee: [fz.xiaomi_battery_3v, fz.xiaomi_contact, fz.ignore_onoff_change, fz.ignore_basic_change],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet.aq2'],
        model: 'MCCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara door & window contact sensor',
        supports: 'contact',
        fromZigbee: [fz.xiaomi_battery_3v, fz.xiaomi_contact, fz.ignore_onoff_change, fz.ignore_basic_change],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_wleak.aq1'],
        model: 'SJCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara water leak sensor',
        supports: 'water leak true/false',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.SJCGQ11LM_water_leak_basic, fz.SJCGQ11LM_water_leak_iaszone,
            fz.ignore_basic_change,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_cube'],
        model: 'MFKZQ01LM',
        vendor: 'Xiaomi',
        description: 'Mi smart home cube',
        supports: 'shake, wakeup, fall, tap, slide, flip180, flip90, rotate_left and rotate_right',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.MFKZQ01LM_action_multistate, fz.MFKZQ01LM_action_analog,
            fz.ignore_analog_change, fz.ignore_multistate_change, fz.ignore_basic_change,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.plug'],
        model: 'ZNCZ02LM',
        description: 'Mi power plug ZigBee',
        supports: 'on/off, power measurement',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.generic_state, fz.xiaomi_power, fz.xiaomi_plug_state, fz.ignore_onoff_change,
            fz.ignore_basic_change, fz.ignore_analog_change,
        ],
        toZigbee: [tz.onoff],
    },
    {
        zigbeeModel: ['lumi.ctrl_86plug', 'lumi.ctrl_86plug.aq1'],
        model: 'QBCZ11LM',
        description: 'Aqara socket Zigbee',
        supports: 'on/off, power measurement',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.generic_state, fz.xiaomi_power, fz.xiaomi_plug_state, fz.ignore_onoff_change,
            fz.ignore_basic_change, fz.ignore_analog_change,
        ],
        toZigbee: [tz.onoff],
    },
    {
        zigbeeModel: ['lumi.sensor_smoke'],
        model: 'JTYJ-GD-01LM/BW',
        description: 'MiJia Honeywell smoke detector',
        supports: 'smoke',
        vendor: 'Xiaomi',
        fromZigbee: [fz.xiaomi_battery_3v, fz.JTYJGD01LMBW_smoke, fz.ignore_basic_change],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_natgas'],
        model: 'JTQJ-BF-01LM/BW',
        vendor: 'Xiaomi',
        description: 'MiJia gas leak detector ',
        supports: 'gas',
        fromZigbee: [fz.JTQJBF01LMBW_gas, fz.JTQJBF01LMBW_sensitivity, fz.ignore_basic_change],
        toZigbee: [tz.JTQJBF01LMBW_sensitivity, tz.JTQJBF01LMBW_selfest],
    },
    {
        zigbeeModel: ['lumi.lock.v1'],
        model: 'A6121',
        vendor: 'Xiaomi',
        description: 'Vima Smart Lock',
        supports: 'inserted, forgotten, key error',
        fromZigbee: [fz.xiaomi_lock_report, fz.ignore_basic_change],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.vibration.aq1'],
        model: 'DJT11LM',
        vendor: 'Xiaomi',
        description: 'Aqara vibration sensor',
        supports: 'drop, tilt and touch',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.DJT11LM_vibration, fz.ignore_basic_change, fz.ignore_doorlock_change,
        ],
        toZigbee: [tz.DJT11LM_vibration_sensitivity],
    },

    // IKEA
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 980lm', 'TRADFRI bulb E26 WS opal 980lm'],
        model: 'LED1545G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 980 lumen, dimmable, white spectrum, opal white',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 950lm', 'TRADFRI bulb E26 WS clear 950lm'],
        model: 'LED1546G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 950 lumen, dimmable, white spectrum, clear',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 1000lm', 'TRADFRI bulb E27 W opal 1000lm'],
        model: 'LED1623G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, opal white',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WS 400lm'],
        model: 'LED1537R6',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable, white spectrum',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 W 400lm'],
        model: 'LED1650R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 400lm', 'TRADFRI bulb E12 WS opal 400lm'],
        model: 'LED1536G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 400 lumen, dimmable, white spectrum, opal white',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 opal 1000lm', 'TRADFRI bulb E26 W opal 1000lm'],
        model: 'LED1622G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 1000 lumen, dimmable, opal white',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 CWS opal 600lm'],
        model: 'LED1624G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 600 lumen, dimmable, color, opal white',
        supports: generic.light_onoff_brightness_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 W op/ch 400lm'],
        model: 'LED1649C5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 400 lumen, dimmable warm white, chandelier opal',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI wireless dimmer'],
        model: 'ICTC-G-1',
        vendor: 'IKEA',
        description: 'TRADFRI wireless dimmer',
        supports: 'brightness [0-255], quick rotate for instant 0/255',
        fromZigbee: [
            fz.ICTC_G_1_move, fz.ICTC_G_1_moveWithOnOff, fz.ICTC_G_1_stop, fz.ICTC_G_1_stopWithOnOff,
            fz.ICTC_G_1_moveToLevelWithOnOff, fz.ignore_cmd_readRsp, fz.ignore_cmd_discoverRsp,
        ],
        toZigbee: [],
        onAfIncomingMsg: [1],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 1);
            execute(device, [(cb) => device.bind('genLevelCtrl', coordinator, cb)], callback);
        },
    },
    {
        zigbeeModel: ['TRADFRI transformer 10W'],
        model: 'ICPSHC24-10EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (10 watt)',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI transformer 30W'],
        model: 'ICPSHC24-30EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (30 watt)',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x30'],
        model: 'L1527',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x30 cm)',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['FLOALT panel WS 60x60'],
        model: 'L1529',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (60x60 cm)',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x90'],
        model: 'L1528',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x90 cm)',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['TRADFRI control outlet'],
        model: 'E1603',
        description: 'TRADFRI control outlet',
        supports: 'on/off',
        vendor: 'IKEA',
        fromZigbee: [fz.ignore_onoff_change, fz.generic_state],
        toZigbee: [tz.onoff],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 1);
            const cfg = {direction: 0, attrId: 0, dataType: 16, minRepIntval: 0, maxRepIntval: 1000, repChange: 0};
            const actions = [
                (cb) => device.bind('genOnOff', coordinator, cb),
                (cb) => device.foundation('genOnOff', 'configReport', [cfg], foundationCfg, cb),
            ];

            execute(device, actions, callback);
        },
    },

    // Philips
    {
        zigbeeModel: ['LLC012', 'LLC011'],
        model: '7299760PH',
        vendor: 'Philips',
        description: 'Hue Bloom',
        supports: generic.light_onoff_brightness_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['LLC020'],
        model: '7146060PH',
        vendor: 'Philips',
        description: 'Hue Go',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['LWB004'],
        model: '433714',
        vendor: 'Philips',
        description: 'Hue Lux A19 bulb E27',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['LWB006', 'LWB014'],
        model: '9290011370',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['LWB010'],
        model: '8718696449691',
        vendor: 'Philips',
        description: 'Hue White Single bulb B22',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['LST001'],
        model: '7299355PH',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip',
        supports: generic.light_onoff_brightness_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['LST002'],
        model: '915005106701',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['LCT001', 'LCT007', 'LCT010', 'LCT012', 'LCT014', 'LCT015', 'LCT016'],
        model: '9290012573A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27/E14',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['LCT003'],
        model: '8718696485880',
        vendor: 'Philips',
        description: 'Hue white and color ambiance GU10',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['LTW013'],
        model: '8718696598283',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['LTW010', 'LTW001', 'LTW004'],
        model: '8718696548738',
        vendor: 'Philips',
        description: 'Hue white ambiance E26/E27',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['LTC001'],
        model: '3261030P7',
        vendor: 'Philips',
        description: 'Hue Being',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['LLC010'],
        model: '7199960PH',
        vendor: 'Philips',
        description: 'Hue Iris',
        supports: generic.light_onoff_brightness_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['RWL020', 'RWL021'],
        model: '324131092621',
        vendor: 'Philips',
        description: 'Hue dimmer switch',
        supports: 'on/off',
        fromZigbee: [
            fz._324131092621_on, fz._324131092621_off, fz._324131092621_step, fz._324131092621_stop,
            fz.ignore_power_change, fz.generic_battery,
        ],
        toZigbee: [],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const ep1 = shepherd.find(ieeeAddr, 1);
            const actions = [
                (cb) => ep1.bind('genOnOff', coordinator, cb),
                (cb) => ep1.bind('genLevelCtrl', coordinator, cb),
            ];

            execute(ep1, actions, (result) => {
                if (result) {
                    const ep2 = shepherd.find(ieeeAddr, 2);
                    const actions = [
                        (cb) => ep2.bind('genPowerCfg', coordinator, cb),
                        (cb) => ep2.report('genPowerCfg', 'batteryPercentageRemaining', 0, 1000, 0, cb),
                    ];

                    execute(ep2, actions, callback);
                } else {
                    callback(result);
                }
            });
        },
    },
    {
        zigbeeModel: ['SML001'],
        model: '9290012607',
        vendor: 'Philips',
        description: 'Hue motion sensor',
        supports: 'occupancy, temperature, illuminance',
        fromZigbee: [
            fz.generic_battery, fz.generic_occupancy, fz.generic_temperature,
            fz.ignore_occupancy_change, fz.generic_illuminance, fz.ignore_illuminance_change,
            fz.ignore_temperature_change,
        ],
        toZigbee: [],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 2);

            const actions = [
                (cb) => device.bind('genPowerCfg', coordinator, cb),
                (cb) => device.bind('msIlluminanceMeasurement', coordinator, cb),
                (cb) => device.bind('msTemperatureMeasurement', coordinator, cb),
                (cb) => device.bind('msOccupancySensing', coordinator, cb),
                (cb) => device.report('genPowerCfg', 'batteryPercentageRemaining', 0, 1000, 0, cb),
                (cb) => device.report('msOccupancySensing', 'occupancy', 0, 600, null, cb),
                (cb) => device.report('msTemperatureMeasurement', 'measuredValue', 30, 600, 1, cb),
                (cb) => device.report('msIlluminanceMeasurement', 'measuredValue', 0, 600, null, cb),
            ];

            execute(device, actions, callback);
        },
    },

    // Belkin
    {
        zigbeeModel: ['MZ100'],
        model: 'F7C033',
        vendor: 'Belkin',
        description: 'WeMo smart LED bulb',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },

    // EDP
    {
        zigbeeModel: ['ZB-SmartPlug-1.0.0'],
        model: 'PLUG EDP RE:DY',
        vendor: 'EDP',
        description: 're:dy plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.ignore_onoff_change, fz.EDP_power, fz.ignore_metering_change],
        toZigbee: [tz.onoff],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 85);
            execute(device, [(cb) => device.report('seMetering', 'instantaneousDemand', 10, 60, 1, cb)], callback);
        },
    },

    // Custom devices (DiY)
    {
        zigbeeModel: ['lumi.router'],
        model: 'CC2530.ROUTER',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 router](http://ptvo.info/cc2530-based-zigbee-coordinator-and-router-112/)',
        supports: 'state, description, type, rssi',
        fromZigbee: [fz.CC2530ROUTER_state, fz.CC2530ROUTER_meta],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DNCKAT_S001'],
        model: 'DNCKATSW001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'on/off',
        fromZigbee: [fz.generic_state, fz.ignore_onoff_change],
        toZigbee: [tz.onoff],
    },
    {
        zigbeeModel: ['DNCKAT_S002'],
        model: 'DNCKATSW002',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT double key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'hold/release, on/off',
        fromZigbee: [fz.DNCKAT_S00X_state, fz.DNCKAT_S00X_buttons],
        toZigbee: [tz.onoff],
        ep: {'left': 1, 'right': 2},
    },
    {
        zigbeeModel: ['DNCKAT_S003'],
        model: 'DNCKATSW003',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT triple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'hold/release, on/off',
        fromZigbee: [fz.DNCKAT_S00X_state, fz.DNCKAT_S00X_buttons],
        toZigbee: [tz.onoff],
        ep: {'left': 1, 'center': 2, 'right': 3},
    },
    {
        zigbeeModel: ['DNCKAT_S004'],
        model: 'DNCKATSW004',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT quadruple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'hold/release, on/off',
        fromZigbee: [fz.DNCKAT_S00X_state, fz.DNCKAT_S00X_buttons],
        toZigbee: [tz.onoff],
        ep: {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4},
    },

    // OSRAM
    {
        zigbeeModel: ['Outdoor Lantern W RGBW OSRAM'],
        model: '4058075816718',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor wall lantern RGBW',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['Classic A60 RGBW'],
        model: 'AA69697',
        vendor: 'OSRAM',
        description: 'Classic A60 RGBW',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['CLA60 RGBW OSRAM'],
        model: 'AC03645',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED CLA60 E27 RGBW',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['CLA60 TW OSRAM'],
        model: 'AC03642',
        vendor: 'OSRAM',
        description: 'SMART+ CLASSIC A 60 TW',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        // AA70155 is model number of both bulbs.
        zigbeeModel: ['LIGHTIFY A19 Tunable White', 'Classic A60 TW'],
        model: 'AA70155',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED A19 tunable white / Classic A60 TW',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['PAR16 50 TW'],
        model: 'AA68199',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['Classic B40 TW - LIGHTIFY'],
        model: 'AB32840',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic B40 tunable white',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['Classic A60 W clear - LIGHTIFY'],
        model: 'AC03641',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic A60 clear',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['Surface Light TW'],
        model: 'AB401130055',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light LED Tunable White',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['Plug 01'],
        model: 'AB3257001NJ',
        description: 'Smart+ plug',
        supports: 'on/off',
        vendor: 'OSRAM',
        fromZigbee: [fz.ignore_onoff_change, fz.generic_state],
        toZigbee: [tz.onoff],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 3);
            const cfg = {direction: 0, attrId: 0, dataType: 16, minRepIntval: 0, maxRepIntval: 1000, repChange: 0};
            const actions = [
                (cb) => device.bind('genOnOff', coordinator, cb),
                (cb) => device.foundation('genOnOff', 'configReport', [cfg], foundationCfg, cb),
            ];

            execute(device, actions, callback);
        },
    },
    {
        zigbeeModel: ['Flex RGBW', 'LIGHTIFY Indoor Flex RGBW'],
        model: '4052899926110',
        vendor: 'OSRAM',
        description: 'Flex RGBW',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    
    {
        zigbeeModel: ['Gardenpole RGBW-Lightify'],
        model: 'to do',
        vendor: 'OSRAM',
        description: 'Gardenpole RGBW-Lightify Stripe',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    
    {
        zigbeeModel: ['PAR 16 50 RGBW - LIGHTIFY'],
        model: 'AB35996',
        vendor: 'OSRAM',
        description: 'Smart+ Spot GU10 Multicolor',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },


    // Hive
    {
        zigbeeModel: ['FWBulb01'],
        model: 'HALIGHTDIMWWE27',
        vendor: 'Hive',
        description: 'Active light dimmable',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },

    // Innr
    {
        zigbeeModel: ['RB 185 C'],
        model: 'RB 185 C',
        vendor: 'Innr',
        description: 'E27 Bulb RGBW',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['RB 165'],
        model: 'RB 165',
        vendor: 'Innr',
        description: 'E27 Bulb',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['RB 175 W'],
        model: 'RB 175 W',
        vendor: 'Innr',
        description: 'E27 Bulb warm dimming',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['RS 125'],
        model: 'RS 125',
        vendor: 'Innr',
        description: 'GU10 Spot',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['RB 145'],
        model: 'RB 145',
        vendor: 'Innr',
        description: 'E14 Candle',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['BY 165'],
        model: 'BY 165',
        vendor: 'Innr',
        description: 'B22 Bulb dimmable',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['PL 110'],
        model: 'PL 110',
        vendor: 'Innr',
        description: 'Puck Light',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['ST 110'],
        model: 'ST 110',
        vendor: 'Innr',
        description: 'Strip Light',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['UC 110'],
        model: 'UC 110',
        vendor: 'Innr',
        description: 'Under Cabinet Light',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['DL 110 N'],
        model: 'DL 110 N',
        vendor: 'Innr',
        description: 'Spot narrow',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['DL 110 W'],
        model: 'DL 110 W',
        vendor: 'Innr',
        description: 'Spot wide',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['SL 110 N'],
        model: 'SL 110 N',
        vendor: 'Innr',
        description: 'Spot Flex narrow',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['SL 110 M'],
        model: 'SL 110 M',
        vendor: 'Innr',
        description: 'Spot Flex medium',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['SL 110 W'],
        model: 'SL 110 W',
        vendor: 'Innr',
        description: 'Spot Flex wide',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },

    // Sylvania
    {
        zigbeeModel: ['LIGHTIFY RT Tunable White'],
        model: '73742',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white RT 5/6',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['LIGHTIFY BR Tunable White'],
        model: '73740',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white BR30',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 RGBW'],
        model: '73693',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW A19',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 ON/OFF/DIM'],
        model: '74283',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['A19 W 10 year'],
        model: '74696',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['PLUG'],
        model: '72922-A',
        vendor: 'Sylvania',
        description: 'SMART+ Smart Plug',
        supports: 'on/off',
        fromZigbee: [fz.ignore_onoff_change, fz.generic_state],
        toZigbee: [tz.onoff],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 1);
            const cfg = {direction: 0, attrId: 0, dataType: 16, minRepIntval: 0, maxRepIntval: 1000, repChange: 0};
            const actions = [
                (cb) => device.bind('genOnOff', coordinator, cb),
                (cb) => device.foundation('genOnOff', 'configReport', [cfg], foundationCfg, cb),
            ];

            execute(device, actions, callback);
        },
    },
    {
        zigbeeModel: ['MR16 TW'],
        model: '74282',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white MR16 LED bulb',
        supports: generic.light_onoff_brightness_colortemp().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp().toZigbee,
    },

    // GE
    {
        zigbeeModel: ['ZLL Light'],
        model: '22670',
        vendor: 'GE',
        description: 'Link smart LED light bulb, BR30 soft white (2700K)',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['45852'],
        model: '45852GE',
        vendor: 'GE',
        description: 'ZigBee plug-in smart dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.light_brightness, fz.ignore_onoff_change, fz.generic_state],
        toZigbee: [tz.onoff, tz.light_brightness, tz.ignore_transition],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const cfg = {direction: 0, attrId: 0, dataType: 16, minRepIntval: 0, maxRepIntval: 1000, repChange: 0};
            const device = shepherd.find(ieeeAddr, 1);
            const actions = [
                (cb) => device.bind('genOnOff', coordinator, cb),
                (cb) => device.foundation('genOnOff', 'configReport', [cfg], foundationCfg, cb),
            ];

            execute(device, actions, callback);
        },
    },
    {
        zigbeeModel: ['45857'],
        model: '45857GE',
        vendor: 'GE',
        description: 'ZigBee in-wall smart dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.light_brightness, fz.ignore_onoff_change, fz.generic_state],
        toZigbee: [tz.onoff, tz.light_brightness, tz.ignore_transition],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const cfg = {direction: 0, attrId: 0, dataType: 16, minRepIntval: 0, maxRepIntval: 1000, repChange: 0};
            const device = shepherd.find(ieeeAddr, 1);
            const actions = [
                (cb) => device.bind('genOnOff', coordinator, cb),
                (cb) => device.foundation('genOnOff', 'configReport', [cfg], foundationCfg, cb),
            ];

            execute(device, actions, callback);
        },
    },

    // Sengled
    {
        zigbeeModel: ['E11-G13'],
        model: 'E11-G13',
        vendor: 'Sengled',
        description: 'Element Classic (A19)',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['E11-G23'],
        model: 'E11-G23',
        vendor: 'Sengled',
        description: 'Element Classic (A60)',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['Z01-CIA19NAE26'],
        model: 'Z01-CIA19NAE26',
        vendor: 'Sengled',
        description: 'Element Touch (A19)',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },
    {
        zigbeeModel: ['E11-N1EA'],
        model: 'E11-N1EA',
        vendor: 'Sengled',
        description: 'Element Plus Color (A19)',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },

    // JIAWEN
    {
        zigbeeModel: ['FB56-ZCW08KU1.1'],
        model: 'K2RGBW01',
        vendor: 'JIAWEN',
        description: 'Wireless Bulb E27 9W RGBW',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },

    // Netvox
    {
        zigbeeModel: ['Z809AE3R'],
        model: 'Z809A',
        vendor: 'Netvox',
        description: 'Power socket with power consumption monitoring',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.generic_state, fz.ignore_onoff_change, fz.ignore_electrical_change, fz.Z809A_power],
        toZigbee: [tz.onoff],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 1);
            const actions = [
                (cb) => device.report('haElectricalMeasurement', 'rmsVoltage', 10, 1000, 1, cb),
                (cb) => device.report('haElectricalMeasurement', 'rmsCurrent', 10, 1000, 1, cb),
                (cb) => device.report('haElectricalMeasurement', 'activePower', 10, 1000, 1, cb),
                (cb) => device.report('haElectricalMeasurement', 'powerFactor', 10, 1000, 1, cb),
            ];

            execute(device, actions, callback);
        },
    },

    // Nanoleaf
    {
        zigbeeModel: ['NL08-0800'],
        model: 'NL08-0800',
        vendor: 'Nanoleaf',
        description: 'Smart Ivy Bulb E27',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },

    // Nue
    {
        zigbeeModel: ['FB56+ZSW05HG1.2'],
        model: 'FB56+ZSW05HG1.2',
        vendor: 'Nue',
        description: 'ZigBee one gang smart switch',
        supports: 'on/off',
        fromZigbee: [fz.generic_state],
        toZigbee: [tz.onoff],
    },

    // Gledopto
    {
        zigbeeModel: ['GLEDOPTO'],
        model: 'GL-C-008',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGB + CCT',
        supports: generic.light_onoff_brightness_colortemp_colorxy().supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy().fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy().toZigbee,
    },

    // SmartThings
    {
        zigbeeModel: ['PGC313'],
        model: 'STSS-MULT-001',
        vendor: 'SmartThings',
        description: 'SmartSense multi sensor',
        supports: 'contact',
        fromZigbee: [fz.smartthings_contact],
        toZigbee: [],
    },

    // Trust
    {
        zigbeeModel: ['ZLL-DimmableLigh'],
        model: 'ZLED-2709',
        vendor: 'Trust',
        description: 'Smart Dimmable LED Bulb',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },

    // Paulmann
    {
        zigbeeModel: ['Dimmablelight '],
        model: '50045',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee LED-stripe',
        supports: generic.light_onoff_brightness().supports,
        fromZigbee: generic.light_onoff_brightness().fromZigbee,
        toZigbee: generic.light_onoff_brightness().toZigbee,
    },

    // Bitron Home
    {
        zigbeeModel: ['902010/22'],
        model: 'AV2010/22',
        vendor: 'Bitron Home',
        description: 'Wireless motion detector',
        supports: 'occupancy',
        fromZigbee: [fz.bitron_occupancy],
        toZigbee: [],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 1);
            const actions = [
                (cb) => device.write('ssIasZone', 'iasCieAddr', coordinator.device.getIeeeAddr(), cb),
                (cb) => device.report('ssIasZone', 'zoneStatus', 0, 30, null, cb),
                (cb) => device.functional('ssIasZone', 'enrollRsp', {enrollrspcode: 1, zoneid: 23}, cb),
            ];

            execute(device, actions, callback);
        },
    },

    // Iris
    {
        zigbeeModel: ['3210-L'],
        model: '3210-L',
        vendor: 'Iris',
        description: 'Smart plug',
        supports: 'on/off',
        fromZigbee: [fz.ignore_onoff_change, fz.ignore_electrical_change, fz.generic_state, fz.iris_3210L_power],
        toZigbee: [tz.onoff],
        configure: (ieeeAddr, shepherd, coordinator, callback) => {
            const device = shepherd.find(ieeeAddr, 1);
            const actions = [
                (cb) => device.report('haElectricalMeasurement', 'activePower', 10, 1000, 1, cb),
            ];

            execute(device, actions, callback);
        },
    },
];

module.exports = devices;
