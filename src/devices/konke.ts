import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

function voltageToPercentage(voltage, min, max) {
    if (voltage <= min) return 0;
    if (voltage >= max) return 100;
    return Math.round(((voltage - min) / (max - min)) * 100);
}

const fzLocal = {
    command_recall_konke: {
        cluster: "genScenes",
        type: "commandRecall",
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                241: "hexagon",
                242: "square",
                243: "triangle",
                244: "circle",
            };
            return {action: utils.getFromLookup(msg.data.sceneid, payload)};
        },
    } satisfies Fz.Converter<"genScenes", undefined, "commandRecall">,
    battery_debug: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            
            // 配置电压范围 (mV)
            const minVoltage = 2500;  // 空电电压
            const maxVoltage = 3300;  // 满电电压
            
            // 调试：打印所有接收到的数据
            console.log(`[KK-WA-J01W DEBUG] 收到 genPowerCfg 数据:`, JSON.stringify(msg.data));
            
            // 处理电池电压 (标准 ZCL 属性 0x0020, 单位 100mV)
            if (msg.data.batteryVoltage !== undefined) {
                const rawVoltage = msg.data.batteryVoltage;
                console.log(`[KK-WA-J01W DEBUG] batteryVoltage 原始值: ${rawVoltage}`);
                
                if (rawVoltage < 255) {
                    // 标准 ZCL: batteryVoltage 是以 100mV 为单位
                    // 如果原始值 < 50，说明是以 100mV 为单位 (例如 33 = 3300mV)
                    // 如果原始值 > 100，可能设备直接上报 mV 值
                    let voltage;
                    if (rawVoltage > 100) {
                        // 设备可能直接上报 mV
                        voltage = rawVoltage;
                        console.log(`[KK-WA-J01W DEBUG] 检测到设备直接上报 mV: ${voltage}mV`);
                    } else {
                        // 标准 ZCL 格式，乘以 100 转换为 mV
                        voltage = rawVoltage * 100;
                        console.log(`[KK-WA-J01W DEBUG] 标准 ZCL 格式，转换后: ${voltage}mV`);
                    }
                    
                    payload.voltage = voltage;
                    payload.battery = voltageToPercentage(voltage, minVoltage, maxVoltage);
                    console.log(`[KK-WA-J01W DEBUG] 最终电压: ${voltage}mV, 电量: ${payload.battery}%`);
                }
            }
            
            // 处理电池百分比 (标准 ZCL 属性 0x0021)
            if (msg.data.batteryPercentageRemaining !== undefined) {
                const rawPercentage = msg.data.batteryPercentageRemaining;
                console.log(`[KK-WA-J01W DEBUG] batteryPercentageRemaining 原始值: ${rawPercentage}`);
                
                // 有些设备上报 0-100，有些上报 0-200 (需要除以2)
                // 如果已经从电压计算了百分比，则忽略设备上报的百分比
                if (payload.battery === undefined && rawPercentage < 255) {
                    // 检测是否需要除以2
                    if (rawPercentage > 100) {
                        payload.battery = Math.round(rawPercentage / 2);
                    } else {
                        payload.battery = rawPercentage;
                    }
                    console.log(`[KK-WA-J01W DEBUG] 使用设备上报的百分比: ${payload.battery}%`);
                }
            }
            
            // 处理电池报警状态
            if (msg.data.batteryAlarmState !== undefined) {
                console.log(`[KK-WA-J01W DEBUG] batteryAlarmState: ${msg.data.batteryAlarmState}`);
                const battery1Low = (msg.data.batteryAlarmState & (1 << 0) ||
                    msg.data.batteryAlarmState & (1 << 1) ||
                    msg.data.batteryAlarmState & (1 << 2) ||
                    msg.data.batteryAlarmState & (1 << 3)) > 0;
                payload.battery_low = battery1Low;
            }
            
            console.log(`[KK-WA-J01W DEBUG] 最终 payload:`, JSON.stringify(payload));
            return payload;
        },
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["3AFE170100510001", "3AFE280100510001"],
        model: "2AJZ4KPKEY",
        vendor: "Konke",
        description: "Multi-function button",
        fromZigbee: [fz.konke_action, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.battery(), e.action(["single", "double", "hold"])],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryVoltage(endpoint);
            // Has Unknown power source, force it.
            device.powerSource = "Battery";
            device.save();
        },
    },
    {
        zigbeeModel: ["3AFE14010402000D", "3AFE27010402000D", "3AFE28010402000D"],
        model: "2AJZ4KPBS",
        vendor: "Konke",
        description: "Motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["3AFE140103020000", "3AFE220103020000"],
        model: "2AJZ4KPFT",
        vendor: "Konke",
        description: "Temperature and humidity sensor",
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "msTemperatureMeasurement"]);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ["3AFE010104020028", "LH05121"],
        model: "TW-S1",
        description: "Photoelectric smoke detector",
        vendor: "Konke",
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [],
        exposes: [e.smoke(), e.battery_low()],
    },
    {
        zigbeeModel: ["3AFE130104020015", "3AFE270104020015", "3AFE280104020015"],
        model: "2AJZ4KPDR",
        vendor: "Konke",
        description: "Contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["LH07321"],
        model: "LH07321",
        vendor: "Konke",
        description: "Water detector",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: "TS0222", manufacturerName: "_TYZB01_fi5yftwv"}, {modelID: "3AFE090103021000"}],
        model: "KK-ES-J01W",
        vendor: "Konke",
        description: "Temperature, relative humidity and illuminance sensor",
        fromZigbee: [fz.battery, fz.humidity, fz.temperature],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.humidity(), e.temperature()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["3AFE241000040002"],
        model: "KK-TQ-J01W",
        vendor: "Konke",
        description: "Smart 4 key scene switch",
        fromZigbee: [fzLocal.command_recall_konke, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.battery(), e.battery_voltage(), e.battery_low(), e.action(["hexagon", "square", "triangle", "circle"])],
    },
    {
        zigbeeModel: ["3AFE07010402100D", "3AFE08010402100D"],
        model: "KK-BS-J01W",
        vendor: "Konke",
        description: "Occupancy sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_voltage(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["3AFE21100402102A", "3AFE22010402102A"],
        model: "KK-WA-J01W",
        vendor: "Konke",
        description: "Water detector",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
    },
	{
	    zigbeeModel: ["3AFE12010402102A"],
		model: 'KK-WA-J01W',
		vendor: 'Konke',
		description: "Water detector(Old versions of water sensors:KK-WA-J01W with custom battery converter)",
		fromZigbee: [fz.ias_water_leak_alarm_1, fzLocal.battery_debug],
		toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ["3AFE221004021015"],
        model: "KK-DS-J01W",
        vendor: "Konke",
        description: "Contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ["3AFE292000068621"],
        model: "KK-LP-Q01D",
        vendor: "Konke",
        description: "Light years switch 1 gang",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["3AFE292000068622"],
        model: "KK-LP-Q02D",
        vendor: "Konke",
        description: "Light years switch 2 gangs",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["3AFE292000068623"],
        model: "KK-LP-Q03D",
        vendor: "Konke",
        description: "Light years switch 3 gangs",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), m.onOff({endpointNames: ["l1", "l2", "l3"]})],
    },
    {
        zigbeeModel: ["3AFE2610010C0021"],
        model: "KK-QD-Y01w",
        vendor: "Konke",
        description: "Spotlight driver (cw mode)",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
];
