const legacy = require('zigbee-herdsman-converters/lib/legacy');
const fz = {...require('zigbee-herdsman-converters/converters/fromZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').fromZigbee};
const tz = {...require('zigbee-herdsman-converters/converters/toZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').toZigbee};
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const color = require('zigbee-herdsman-converters/lib/color');
const light = require('zigbee-herdsman-converters/lib/light');
const ota = require('zigbee-herdsman-converters/lib/ota');
const skip = {
    // Prevent state from being published when already ON and brightness is also published. 
    // This prevents 100% -> X% brightness jumps when the switch is already on
    // https://github.com/Koenkk/zigbee2mqtt/issues/13800#issuecomment-1263592783
    stateOnAndBrightnessPresent: (meta) => meta.message.hasOwnProperty('brightness') && meta.state.state === 'ON',
}

const definition = {
	fingerprint: [
		{
			// The model ID from: Device with modelID 'TS0601' is not supported
			// You may need to add \u0000 at the end of the name in some cases
			modelID: 'TS0601',
			// The manufacturer name from: Device with modelID 'TS0601' is not supported.
			manufacturerName: '_TZE200_86nbew0j',
							
		},
	],    
	model: 'TY-12-100-400-W1Z', // Vendor model number, look on the device for a model number
	vendor: 'Ltech', // Vendor of the device (only used for documentation and startup logging)
	description: '12W 100-400mA Tuya Zigbee CC Dimmable LED driver',
	fromZigbee: [tuya.fz.datapoints],
	toZigbee: [tuya.tz.datapoints],
	exposes: [
		tuya.exposes.lightBrightness()
	],
	meta: {
		tuyaDatapoints: [
			[1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
			[3, 'brightness', tuya.valueConverter.scale0_254to0_1000],
		]
	},
},


const legacy = require('zigbee-herdsman-converters/lib/legacy');
const fz = {...require('zigbee-herdsman-converters/converters/fromZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').fromZigbee};
const tz = {...require('zigbee-herdsman-converters/converters/toZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').toZigbee};
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const color = require('zigbee-herdsman-converters/lib/color');
const light = require('zigbee-herdsman-converters/lib/light');
const ota = require('zigbee-herdsman-converters/lib/ota');
const skip = {
    // Prevent state from being published when already ON and brightness is also published. 
    // This prevents 100% -> X% brightness jumps when the switch is already on
    // https://github.com/Koenkk/zigbee2mqtt/issues/13800#issuecomment-1263592783
    stateOnAndBrightnessPresent: (meta) => meta.message.hasOwnProperty('brightness') && meta.state.state === 'ON',
}

const definition = {
	fingerprint: [
		{
			// The model ID from: Device with modelID 'TS0601' is not supported
			// You may need to add \u0000 at the end of the name in some cases
			modelID: 'TS0601',
			// The manufacturer name from: Device with modelID 'TS0601' is not supported.
			manufacturerName: '_TZE200_io0zdqh1',
							
		},
	],    
	model: 'TY-75-24-G2Z2', // Vendor model number, look on the device for a model number
	vendor: 'Ltech', // Vendor of the device (only used for documentation and startup logging)
	description: '150W 24V Tuya Zigbee CV tunable white LED driver',
	fromZigbee: [tuya.fz.datapoints],
	toZigbee: [tuya.tz.datapoints],
	exposes: [
		tuya.exposes.lightBrightness()
	],
	meta: {
		tuyaDatapoints: [
			[1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
			[3, 'brightness', tuya.valueConverter.scale0_254to0_1000],
		]
	},
};
