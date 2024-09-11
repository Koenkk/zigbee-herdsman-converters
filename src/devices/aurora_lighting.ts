import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {Configure, DefinitionWithExtend, Fz, OnEvent, Tz, Zh} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;
import {identify, light} from '../lib/modernExtend';
import * as ota from '../lib/ota';
import * as utils from '../lib/utils';
import { Endpoint } from 'zigbee-herdsman/dist/controller/model';
import { Group, Meta } from 'zigbee-herdsman/dist/controller/model'; 




// Custom fromZigbee converter for brightness to handle global brightness
const fzBrightness = {
    cluster: 'genLevelCtrl',
    type: ['attributeReport', 'readResponse'],
    convert: (model: any, msg: any, publish: any, options: any, meta: any) => {
        const brightness = msg.data['currentLevel'];
        return { brightness: brightness !== undefined ? brightness : null };  // Ensure brightness is reported globally
    },
};

// Custom fromZigbee converter for child lock
const fzChildLock = {
    cluster: 'genBasic',
    type: ['attributeReport', 'readResponse'],
    convert: (model: any, msg: any, publish: any, options: any, meta: any) => {
        const endpoint = msg.endpoint.ID;
        const childLockState = msg.data['deviceEnabled'] === 1 ? 'UNLOCKED' : 'LOCKED';
        if (endpoint === 1) {
            return { socket_left_child_lock: childLockState };
        } else if (endpoint === 2) {
            return { socket_right_child_lock: childLockState };
        }
    },
};

// Custom toZigbee converter for child lock (with manual refresh support)
const tzChildLock = {
    key: ['socket_left_child_lock', 'socket_right_child_lock'],
    
    // Fixing the convertSet method
    convertSet: async (entity: Endpoint | Group, key: string, value: string, meta: Meta) => {
        const childLock = value.toLowerCase() === 'locked' ? 0 : 1;
        const endpointId = (key === 'socket_left_child_lock') ? 1 : 2;

        if (entity instanceof Endpoint) {
            const endpoint = entity.getDevice().getEndpoint(endpointId);

            if (!endpoint) {
                console.error(`Endpoint ${endpointId} not found`);
                return;
            }

            try {
                await endpoint.write('genBasic', { deviceEnabled: childLock });
            } catch (error) {
                console.error(`Error setting child lock on endpoint ${endpointId}: ${error}`);
            }

            return { state: { [key]: value.toUpperCase() } };
        } else {
            console.error(`Entity is not an Endpoint`);
        }
    },

    // Fixing the convertGet method
    convertGet: async (entity: Endpoint | Group, key: string, meta: Meta) => {
        const endpointId = (key === 'socket_left_child_lock') ? 1 : 2;

        if (entity instanceof Endpoint) {
            const endpoint = entity.getDevice().getEndpoint(endpointId);

            try {
                const result = await endpoint.read('genBasic', ['deviceEnabled']);
                const childLockState = result['deviceEnabled'] === 1 ? 'UNLOCKED' : 'LOCKED';
                return { [key]: childLockState };
            } catch (error) {
                console.error(`Error reading child lock state from endpoint ${endpointId}: ${error}`);
            }
        } else {
            console.error(`Entity is not an Endpoint`);
        }
    },
};


const tzLocal = {
    aOneBacklight: {
        key: ['backlight_led'],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, 'backlight_led');
            const state = value.toLowerCase();
            utils.validateValue(state, ['toggle', 'off', 'on']);
            const endpoint = meta.device.getEndpoint(3);
            await endpoint.command('genOnOff', state, {});
            return { state: { backlight_led: state.toUpperCase() } };
        },
    } satisfies Tz.Converter,
    
    // Merged backlight_brightness converter
    backlight_brightness: {
        key: ['brightness'],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genLevelCtrl', 'moveToLevel', { level: value, transtime: 0 }, utils.getOptions(meta.mapped, entity));
            return { state: { brightness: value } };
        },
        convertGet: async (entity, key, meta) => {
            try {
                const endpoint = entity.getDevice().getEndpoint(1);
                const result = await endpoint.read('genLevelCtrl', ['currentLevel']);
                return { brightness: result['currentLevel'] };
            } catch (error) {
                console.error(`Error reading brightness: ${error}`);
                throw error;
            }
        },
    } satisfies Tz.Converter,
};


const disableBatteryRotaryDimmerReporting = async (endpoint: Zh.Endpoint) => {
    // The default is for the device to also report the on/off and
    // brightness at the same time as sending on/off and step commands.
    // Disable the reporting by setting the max interval to 0xFFFF.
    await reporting.brightness(endpoint, {max: 0xffff});
    await reporting.onOff(endpoint, {max: 0xffff});
};

const batteryRotaryDimmer = (...endpointsIds: number[]) => ({
    fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_step_color_temperature] satisfies Fz.Converter[],
    toZigbee: [] as Tz.Converter[], // TODO: Needs documented reasoning for asserting this as a type it isn't
    exposes: [
        e.battery(),
        e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down']),
    ],
    configure: (async (device, coordinatorEndpoint) => {
        const endpoints = endpointsIds.map((endpoint) => device.getEndpoint(endpoint));

        // Battery level is only reported on first endpoint
        await reporting.batteryVoltage(endpoints[0]);

        for await (const endpoint of endpoints) {
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);

            await disableBatteryRotaryDimmerReporting(endpoint);
        }
    }) satisfies Configure,
    onEvent: (async (type, data, device) => {
        // The rotary dimmer devices appear to lose the configured reportings when they
        // re-announce themselves which they do roughly every 6 hours.
        if (type === 'deviceAnnounce') {
            for (const endpoint of device.endpoints) {
                // First disable the default reportings (for the dimmer endpoints only)
                if ([1, 2].includes(endpoint.ID)) {
                    await disableBatteryRotaryDimmerReporting(endpoint);
                }
                // Then re-apply the configured reportings
                for (const c of endpoint.configuredReportings) {
                    await endpoint.configureReporting(c.cluster.name, [
                        {
                            attribute: c.attribute.name,
                            minimumReportInterval: c.minimumReportInterval,
                            maximumReportInterval: c.maximumReportInterval,
                            reportableChange: c.reportableChange,
                        },
                    ]);
                }
            }
        }
    }) satisfies OnEvent,
});

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['TWBulb51AU'],
        model: 'AU-A1GSZ9CX',
        vendor: 'Aurora Lighting',
        description: 'AOne GLS lamp 9w tunable dimmable 2200-5000K',
        extend: [light({colorTemp: {range: [200, 454]}})],
    },
    {
        zigbeeModel: ['RGBCXStrip50AU'],
        model: 'AU-A1ZBSCRGBCX',
        vendor: 'Aurora Lighting',
        description: 'RGBW LED strip controller',
        extend: [light({colorTemp: {range: [166, 400]}, color: true})],
    },
    {
        zigbeeModel: ['TWGU10Bulb50AU'],
        model: 'AU-A1GUZBCX5',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.4W smart tuneable GU10 lamp',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['TWMPROZXBulb50AU'],
        model: 'AU-A1ZBMPRO1ZX',
        vendor: 'Aurora Lighting',
        description: 'AOne MPROZX fixed IP65 fire rated smart tuneable LED downlight',
        extend: [light({colorTemp: {range: [200, 455]}, powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['FWG125Bulb50AU'],
        model: 'AU-A1VG125Z5E/19',
        vendor: 'Aurora Lighting',
        description: 'AOne 4W smart dimmable G125 lamp 1900K',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['FWBulb51AU'],
        model: 'AU-A1GSZ9B/27',
        vendor: 'Aurora Lighting',
        description: 'AOne 9W smart GLS B22',
        extend: [light()],
    },
    {
        zigbeeModel: ['FWGU10Bulb50AU', 'FWGU10Bulb01UK'],
        model: 'AU-A1GUZB5/30',
        vendor: 'Aurora Lighting',
        description: 'AOne 4.8W smart dimmable GU10 lamp 3000K',
        extend: [light()],
    },
    {
        zigbeeModel: ['FWA60Bulb50AU'],
        model: 'AU-A1VGSZ5E/19',
        vendor: 'Aurora Lighting',
        description: 'AOne 4W smart dimmable Vintage GLS lamp 1900K',
        extend: [light({effect: false})],
    },
    {
        zigbeeModel: ['RGBGU10Bulb50AU', 'RGBGU10Bulb50AU2'],
        model: 'AU-A1GUZBRGBW',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.6w smart RGBW tuneable GU10 lamp',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['RGBBulb01UK', 'RGBBulb02UK', 'RGBBulb51AU'],
        model: 'AU-A1GSZ9RGBW_HV-GSCXZB269K',
        vendor: 'Aurora Lighting',
        description: 'AOne 9.5W smart RGBW GLS E27/B22',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['Remote50AU'],
        model: 'AU-A1ZBRC',
        vendor: 'Aurora Lighting',
        description: 'AOne smart remote',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_recall, fz.command_store],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'recall_1', 'store_1'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'genScenes']);
        },
    },
    {
        zigbeeModel: ['MotionSensor51AU'],
        model: 'AU-A1ZBPIRS',
        vendor: 'Aurora Lighting',
        description: 'AOne PIR sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.illuminance],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(39);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['SingleSocket50AU'],
        model: 'AU-A1ZBPIAB',
        vendor: 'Aurora Lighting',
        description: 'Power plug Zigbee EU',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['WindowSensor51AU'],
        model: 'AU-A1ZBDWS',
        vendor: 'Aurora Lighting',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['WallDimmerMaster'],
        model: 'AU-A1ZB2WDM',
        vendor: 'Aurora Lighting',
        description: 'AOne 250W smart rotary dimmer module',
        exposes: [e.binary('backlight_led', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable or disable the blue backlight LED')],
        toZigbee: [tzLocal.aOneBacklight],
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['DoubleSocket50AU'],
        model: 'AU-A1ZBDSS',
        vendor: 'Aurora Lighting',
        description: 'Double smart socket UK',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fzChildLock, fzBrightness],
        toZigbee: [tz.on_off, tzChildLock, tzLocal.backlight_brightness],
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'),
            e.power().withEndpoint('right'),
            e.numeric('brightness', ea.ALL)
                .withValueMin(0).withValueMax(254)
                .withDescription('Brightness of the backlight LED'),
            e.binary('socket_left_child_lock', ea.STATE_SET | ea.STATE_GET, 'LOCKED', 'UNLOCKED')
                .withDescription('Child lock status for left socket'),
            e.binary('socket_right_child_lock', ea.STATE_SET | ea.STATE_GET, 'LOCKED', 'UNLOCKED')
                .withDescription('Child lock status for right socket')
        ],
        meta: { multiEndpoint: true },
        ota: ota.zigbeeOTA,

        // Map the device's endpoints
        endpoint: (device) => {
            return { 'left': 1, 'right': 2 };
        },

        // Device configuration to set up reporting and initial read
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);

            // Bind necessary clusters for both endpoints
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement', 'genBasic']);
            await reporting.onOff(endpoint1);

            await reporting.bind(endpoint2, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement', 'genBasic']);
            await reporting.onOff(endpoint2);

            // Read initial child lock states
            try {
                const result1 = await endpoint1.read('genBasic', ['deviceEnabled']);
                const result2 = await endpoint2.read('genBasic', ['deviceEnabled']);
                console.log(`Initial child lock state for endpoint 1: ${result1.deviceEnabled}, endpoint 2: ${result2.deviceEnabled}`);
            } catch (error) {
                console.error('Failed to read initial child lock states:', error);
            }

            // Set default brightness
            try {
                const defaultBrightness = 50;
                await endpoint1.command('genLevelCtrl', 'moveToLevel', { level: defaultBrightness, transtime: 0 });
                console.log(`Default brightness set to ${defaultBrightness}`);
            } catch (error) {
                console.error('Failed to set default brightness on endpoint 1:', error);
            }

            // Force immediate state read after configuration
            try {
                const stateLeft = await endpoint1.read('genOnOff', ['onOff']);
                const stateRight = await endpoint2.read('genOnOff', ['onOff']);
                const brightness = await endpoint1.read('genLevelCtrl', ['currentLevel']);
                
                // Publish the initial state to MQTT
                device.publish('state_left', { state: stateLeft.onOff ? 'ON' : 'OFF' });
                device.publish('state_right', { state: stateRight.onOff ? 'ON' : 'OFF' });
                device.publish('brightness', { brightness: brightness.currentLevel });
            } catch (error) {
                console.error('Failed to read state or brightness after configuration:', error);
            }
        }
    },
    {
        zigbeeModel: ['SmartPlug51AU'],
        model: 'AU-A1ZBPIA',
        vendor: 'Aurora Lighting',
        description: 'Aurora smart plug',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        exposes: [e.switch(), e.power(), e.voltage(), e.current(), e.device_temperature(), e.energy()],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {default: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff',
                'genIdentify',
                'haElectricalMeasurement',
                'seMetering',
                'genDeviceTempCfg',
            ]);

            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);

            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            // Report 5v voltage change, 5a current, 5 watt power change to reduce the noise
            await reporting.rmsVoltage(endpoint, {change: 500});
            await reporting.rmsCurrent(endpoint, {change: 500});
            await reporting.activePower(endpoint, {change: 5});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {change: 500});
        },
    },
    {
        zigbeeModel: ['1GBatteryDimmer50AU'],
        model: 'AU-A1ZBR1GW',
        vendor: 'Aurora Lighting',
        description: 'AOne one gang wireless battery rotary dimmer',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        // One gang battery rotary dimmer with endpoint ID 1
        ...batteryRotaryDimmer(1),
    },
    {
        zigbeeModel: ['2GBatteryDimmer50AU'],
        model: 'AU-A1ZBR2GW',
        vendor: 'Aurora Lighting',
        description: 'AOne two gang wireless battery rotary dimmer',
        meta: {multiEndpoint: true, battery: {voltageToPercentage: '3V_2100'}},
        endpoint: (device) => {
            return {right: 1, left: 2};
        },
        // Two gang battery rotary dimmer with endpoint IDs 1 and 2
        ...batteryRotaryDimmer(1, 2),
    },
    {
        zigbeeModel: ['NPD3032'],
        model: 'AU-A1ZB110',
        vendor: 'Aurora Lighting',
        description: 'AOne 1-10V in-line dimmer',
        extend: [identify(), light({powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
