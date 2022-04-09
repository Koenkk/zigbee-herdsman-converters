const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const globalStore = require('zigbee-herdsman-converters/lib/store');//这里原本没有，在最新版本的fromzigbee.js里复制过来的，路径要和上面的其他一样，不能用...代替
const e = exposes.presets;
const ea = exposes.access;

const occupancyTimeout = 10; // In seconds

const getKey = (object, value) => {
    for (const key in object) {
        if (object[key] == value) return key;
    }
};
const bind = async (endpoint, target, clusters) => {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
};

const fzLocal = {
	REJIA_3keys_armmode: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.armmode != null) {
                const lookup = {
                    0: 'disarm',
                    2: 'sos',
                    3: 'arm',
                };
                const value = msg.data.armmode;
                return {action: lookup[value] || `armmode_${value}`};
            }
        },
    },
	

    REJIA_vibration_alarm_1_with_timeout: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;

            const timeout = options && options.hasOwnProperty('vibration_timeout') ?
                options.vibration_timeout : 10;

            // Stop existing timers because vibration is detected and set a new one.
            globalStore.getValue(msg.endpoint, 'timers', []).forEach((t) => clearTimeout(t));
            globalStore.putValue(msg.endpoint, 'timers', []);

            if (timeout !== 0) {
                const timer = setTimeout(() => {
                    publish({vibration: false});
                }, timeout * 1000);

                globalStore.getValue(msg.endpoint, 'timers').push(timer);
            }

            return {
                vibration: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },

};

const definition = [
{
    fingerprint: [{modelID: 'HR108 V01', manufacturerName: 'REJIA'}],   //这里的填写设备自己的ieee不知道是不是必须的，如果不识别可以尝试
	zigbeeModel: ['HR108 V01'], //睿家3按钮按键
	model: 'RJ-HR108',
	vendor: 'REJIA',
	description: '3-key remote control',
	supports: 'action',
	fromZigbee: [fzLocal.REJIA_3keys_armmode, fz.battery],
	toZigbee: [],
	exposes: [e.action(), e.battery_low(), e.battery()],//这个语句在新的converters中是必须的，和以前版本不同，注意
},



{
	fingerprint: [{modelID: 'HR109 V01', manufacturerName: 'REJIA'}],   //这里的填写设备自己的ieee不知道是不是必须的，如果不识别可以尝试
	zigbeeModel: ['HR109 V01'],
	model: 'RJ-HR109',
	vendor: 'REJIA',
	description: 'Ruijia-ZD vibration sensor',
	fromZigbee: [fzLocal.REJIA_vibration_alarm_1_with_timeout],   //改完后重新配对下，振动就可以了
	exposes: [e.vibration(['vibration']), e.battery_low(), exposes.enum('sensitivity', exposes.access.STATE_SET, ['low', 'medium', 'high'])], //振动关键词
	toZigbee: [],
},
	

];

module.exports = definition;