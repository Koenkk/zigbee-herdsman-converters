import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const buttonModesList = {
    single_click: 0x01,
    multi_click: 0x02,
};

const inputLinkList = {
    no: 0x00,
    yes: 0x01,
};

const bindCommandList = {
    "on/off": 0x00,
    toggle: 0x01,
    change_level_up: 0x02,
    change_level_down: 0x03,
    change_level_up_with_off: 0x04,
    change_level_down_with_off: 0x05,
    recall_scene_0: 0x06,
    recall_scene_1: 0x07,
    recall_scene_2: 0x08,
    recall_scene_3: 0x09,
    recall_scene_4: 0x0a,
    recall_scene_5: 0x0b,
};

const switchTypesList = {
    switch: 0x00,
    single_click: 0x01,
    multi_click: 0x02,
    reset_to_defaults: 0xff,
};

const switchActionsList = {
    on: 0x00,
    off: 0x01,
    toggle: 0x02,
};

function getSortedList(source: {[key: string]: number}): string[] {
    const keysSorted: [string, number][] = [];

    for (const key in source) {
        if (key != null) {
            keysSorted.push([key, source[key]]);
        }
    }

    keysSorted.sort((a, b) => {
        return a[1] - b[1];
    });

    const result: string[] = [];
    keysSorted.forEach((item) => {
        result.push(item[0]);
    });

    return result;
}

function zigDcInputConfigExposes(epName: string, desc: string) {
    const features = [];
    features.push(e.enum("switch_type", exposes.access.ALL, getSortedList(switchTypesList)).withEndpoint(epName).withDescription(desc));
    features.push(e.enum("switch_actions", exposes.access.ALL, getSortedList(switchActionsList)).withEndpoint(epName));
    features.push(e.enum("bind_command", exposes.access.ALL, getSortedList(bindCommandList)).withEndpoint(epName));
    return features;
}

const tzLocal = {
    zigusb_button_config: {
        key: ["button_mode", "link_to_output", "bind_command"],
        convertGet: async (entity, key, meta) => {
            await entity.read("genOnOffSwitchCfg", ["switchType", 0x4001, 0x4002]);
        },
        convertSet: async (entity, key, value, meta) => {
            let payload: Parameters<typeof entity.write<"genOnOffSwitchCfg">>[1];
            let data: unknown;
            switch (key) {
                case "button_mode":
                    data = utils.getFromLookup(value, buttonModesList);
                    payload = {switchType: data as number};
                    break;
                case "link_to_output":
                    data = utils.getFromLookup(value, inputLinkList);
                    payload = {16385: {value: data, type: 32 /* uint8 */}};
                    break;
                case "bind_command":
                    data = utils.getFromLookup(value, bindCommandList);
                    payload = {16386: {value: data, type: 32 /* uint8 */}};
                    break;
            }
            await entity.write("genOnOffSwitchCfg", payload);
        },
    } satisfies Tz.Converter,
    zigusb_on_off_invert: {
        key: ["state", "on_time", "off_wait_time"],
        convertSet: async (entity, key, value, meta) => {
            const state = utils.isString(meta.message.state) ? meta.message.state.toLowerCase() : null;
            utils.validateValue(state, ["toggle", "off", "on"]);

            if (state === "on" && (meta.message.on_time != null || meta.message.off_wait_time != null)) {
                const onTime = meta.message.on_time != null ? meta.message.on_time : 0;
                const offWaitTime = meta.message.off_wait_time != null ? meta.message.off_wait_time : 0;

                if (typeof onTime !== "number") {
                    throw new Error("The on_time value must be a number!");
                }
                if (typeof offWaitTime !== "number") {
                    throw new Error("The off_wait_time value must be a number!");
                }

                const payload = {ctrlbits: 0, ontime: Math.round(onTime * 10), offwaittime: Math.round(offWaitTime * 10)};
                await entity.command("genOnOff", "onWithTimedOff", payload, utils.getOptions(meta.mapped, entity));
            } else {
                if (state === "toggle") {
                    await entity.command("genOnOff", state, {}, utils.getOptions(meta.mapped, entity));
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ""}`];
                    return currentState ? {state: {state: currentState === "OFF" ? "OFF" : "ON"}} : {};
                }
                await entity.command("genOnOff", state === "off" ? "on" : "off", {}, utils.getOptions(meta.mapped, entity));
                return {state: {state: state === "off" ? "OFF" : "ON"}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genOnOff", ["onOff"]);
        },
    } satisfies Tz.Converter,
    zigusb_restart_interval: {
        key: ["restart", "interval"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            utils.assertEndpoint(entity);
            if (key === "restart") {
                await entity.command("genOnOff", "onWithTimedOff", {ctrlbits: 0, ontime: Math.round(value * 10), offwaittime: 0});
                return {state: {[key]: value}};
            }
            if (key === "interval") {
                await entity.configureReporting("genOnOff", [
                    {
                        attribute: "onOff",
                        minimumReportInterval: value,
                        maximumReportInterval: value,
                        reportableChange: 0,
                    },
                ]);
                return {state: {[key]: value}};
            }
        },
    } satisfies Tz.Converter,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ZigDC_interval: {
        key: ["interval"],
        convertSet: async (entity, key, value, meta) => {
            const epId = 2;
            const endpoint = meta.device.getEndpoint(epId);
            const value2 = Number.parseInt(value.toString(), 10);
            if (!Number.isNaN(value2) && value2 > 0) {
                await endpoint.configureReporting("genOnOff", [
                    {
                        attribute: "onOff",
                        minimumReportInterval: value2,
                        maximumReportInterval: value2,
                        reportableChange: 0,
                    },
                ]);
            }
            return;
        },
    } satisfies Tz.Converter,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ZigDC_input_config: {
        key: ["switch_type", "switch_actions", "bind_command"],
        convertGet: async (entity, key, meta) => {
            await entity.read("genOnOffSwitchCfg", ["switchType", "switchActions", 0x4001, 0x4002]);
        },
        convertSet: async (entity, key, value, meta) => {
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let payload;
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let data;
            switch (key) {
                case "switch_type":
                    data = utils.getFromLookup(value, switchTypesList);
                    payload = {switchType: data};
                    break;
                case "switch_actions":
                    data = utils.getFromLookup(value, switchActionsList);
                    payload = {switchActions: data};
                    break;
                case "bind_command":
                    data = utils.getFromLookup(value, bindCommandList);
                    payload = {16386: {value: data, type: 32 /* uint8 */}};
                    break;
            }
            await entity.write("genOnOffSwitchCfg", payload);
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    zigusb_button_config: {
        cluster: "genOnOffSwitchCfg",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            const channel = utils.getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const {switchType} = msg.data;
            const inputLink = msg.data[0x4001];
            const bindCommand = msg.data[0x4002];
            return {
                [`button_mode_${channel}`]: utils.getKey(buttonModesList, switchType),
                [`link_to_output_${channel}`]: utils.getKey(inputLinkList, inputLink),
                [`bind_command_${channel}`]: utils.getKey(bindCommandList, bindCommand),
            };
        },
    } satisfies Fz.Converter<"genOnOffSwitchCfg", undefined, ["readResponse", "attributeReport"]>,
    zigusb_analog_input: {
        cluster: "genAnalogInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            const channel = msg.endpoint.ID;
            const name = `l${channel}`;
            payload[name] = utils.precisionRound(msg.data.presentValue, 3);
            if (channel === 5) {
                payload[`uptime_${name}`] = utils.precisionRound(msg.data.presentValue, 3);
            } else if (msg.data.description !== undefined) {
                const data1 = msg.data.description;
                if (data1) {
                    const data2 = data1.split(",");
                    const devid = data2[1];
                    const unit = data2[0];
                    if (devid) {
                        payload[`device_${name}`] = devid;
                    }

                    const valRaw = msg.data.presentValue;
                    if (unit) {
                        let val = utils.precisionRound(valRaw, 1);

                        const nameLookup: KeyValueAny = {
                            C: "temperature",
                            V: "voltage",
                            A: "current",
                            W: "power",
                        };

                        let nameAlt = "";
                        if (unit === "A") {
                            if (valRaw < 1) {
                                val = utils.precisionRound(valRaw, 3);
                            } else {
                                val = utils.precisionRound(valRaw, 2);
                            }
                        }
                        nameAlt = nameLookup[unit];

                        if (nameAlt === undefined) {
                            const valueIndex = Number.parseInt(unit, 10);
                            if (!Number.isNaN(valueIndex)) {
                                nameAlt = `val${unit}`;
                            }
                        }

                        if (nameAlt !== undefined) {
                            payload[`${nameAlt}_${name}`] = val;
                        }
                    }
                }
            }
            return payload;
        },
    } satisfies Fz.Converter<"genAnalogInput", undefined, ["attributeReport", "readResponse"]>,
    zigusb_on_off_invert: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.onOff !== undefined) {
                const payload: KeyValueAny = {};
                const endpointName = model.endpoint !== undefined ? utils.getKey(model.endpoint(meta.device), msg.endpoint.ID) : msg.endpoint.ID;
                const state = msg.data.onOff === 1 ? "OFF" : "ON";
                payload[`state_${endpointName}`] = state;
                return payload;
            }
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ZigDC_ina3221: {
        cluster: "genAnalogInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const payload: {[key: string]: number} = {};
            const endpoint = msg.endpoint.ID;

            if (endpoint === 3 || endpoint === 5) {
                const parts = msg.data.description.split(",");
                const numbers = parts[1].split("-");
                const param = parts[0];
                const addr = Number.parseInt(numbers[0], 10);
                const ch = Number.parseInt(numbers[1], 10);
                const isCurrent = param === "A";
                const name = isCurrent ? "current" : "voltage";
                const alt = isCurrent ? "voltage" : "current";
                const baseCh = addr === 41 ? 1 : 4;
                const suffix = `_ch${baseCh + ch - 1}`;
                const otherKey = alt + suffix;
                const otherValue = meta.state[otherKey] as number;
                const value = msg.data.presentValue * (isCurrent ? 30 : 1);
                const power = value * otherValue;

                payload[`power${suffix}`] = power;
                payload[`${name}${suffix}`] = value;
            }
            return payload;
        },
    } satisfies Fz.Converter<"genAnalogInput", undefined, ["attributeReport", "readResponse"]>,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ZigDC_uptime: {
        cluster: "genAnalogInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const payload: {[key: string]: number} = {};
            const channel = msg.endpoint.ID;

            if (channel === 1) {
                payload.uptime = msg.data.presentValue;
            }

            return payload;
        },
    } satisfies Fz.Converter<"genAnalogInput", undefined, ["attributeReport", "readResponse"]>,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ZigDC_input_config: {
        cluster: "genOnOffSwitchCfg",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            const channel = utils.getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const {switchActions, switchType} = msg.data;
            const bindCommand = msg.data[0x4002];
            return {
                [`switch_type_${channel}`]: utils.getKey(switchTypesList, switchType),
                [`switch_actions_${channel}`]: utils.getKey(switchActionsList, switchActions),
                [`bind_command_${channel}`]: utils.getKey(bindCommandList, bindCommand),
            };
        },
    } satisfies Fz.Converter<"genOnOffSwitchCfg", undefined, ["readResponse", "attributeReport"]>,
};

function zigusbBtnConfigExposes(epName: string) {
    const features = [];
    features.push(e.enum("button_mode", exposes.access.ALL, getSortedList(buttonModesList)).withEndpoint(epName));
    features.push(e.enum("link_to_output", exposes.access.ALL, getSortedList(inputLinkList)).withEndpoint(epName));
    features.push(e.enum("bind_command", exposes.access.ALL, getSortedList(bindCommandList)).withEndpoint(epName));
    return features;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZigUSB"],
        model: "ZigUSB",
        vendor: "xyzroe",
        description: "Zigbee USB power monitor and switch",
        fromZigbee: [
            fzLocal.zigusb_on_off_invert,
            fzLocal.zigusb_analog_input,
            fz.temperature,
            fz.ptvo_multistate_action,
            fzLocal.zigusb_button_config,
        ],
        toZigbee: [tzLocal.zigusb_restart_interval, tzLocal.zigusb_on_off_invert, tz.ptvo_switch_analog_input, tzLocal.zigusb_button_config],
        exposes: [
            e.switch().withEndpoint("l1"),
            e
                .numeric("restart", ea.SET)
                .withEndpoint("l1")
                .withValueMin(1)
                .withValueMax(30)
                .withValueStep(1)
                .withDescription("OFF time")
                .withUnit("seconds"),
            ...zigusbBtnConfigExposes("l1"),
            e.action(["single", "double", "triple"]).withDescription("Single click works only with NO link to output"),
            e.current().withAccess(ea.STATE).withEndpoint("l2"),
            e.voltage().withAccess(ea.STATE).withEndpoint("l2"),
            e.power().withAccess(ea.STATE).withEndpoint("l2"),
            e
                .numeric("interval", ea.SET)
                .withEndpoint("l2")
                .withValueMin(1)
                .withValueMax(3600)
                .withValueStep(1)
                .withDescription("Reporting interval")
                .withUnit("sec"),
            e.cpu_temperature().withProperty("temperature").withEndpoint("l4"),
            e.numeric("uptime", ea.STATE).withEndpoint("l5").withDescription("CC2530").withUnit("seconds"),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l4: 4, l5: 5};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genBasic", ["modelId", "swBuildId", "powerSource"]);
        },
    },
    {
        zigbeeModel: ["ZigDC"],
        model: "ZigDC",
        vendor: "xyzroe",
        description: "ZigDC",
        fromZigbee: [fz.temperature, fz.humidity, fz.ptvo_multistate_action, fzLocal.ZigDC_ina3221, fzLocal.ZigDC_uptime, fzLocal.ZigDC_input_config],
        toZigbee: [tzLocal.ZigDC_interval, tzLocal.ZigDC_input_config],
        exposes: [
            e.current().withAccess(ea.STATE).withEndpoint("ch1"),
            e.voltage().withAccess(ea.STATE).withEndpoint("ch1"),
            e.power().withAccess(ea.STATE).withEndpoint("ch1"),
            e.current().withAccess(ea.STATE).withEndpoint("ch2"),
            e.voltage().withAccess(ea.STATE).withEndpoint("ch2"),
            e.power().withAccess(ea.STATE).withEndpoint("ch2"),
            e.current().withAccess(ea.STATE).withEndpoint("ch3"),
            e.voltage().withAccess(ea.STATE).withEndpoint("ch3"),
            e.power().withAccess(ea.STATE).withEndpoint("ch3"),
            e.current().withAccess(ea.STATE).withEndpoint("ch4"),
            e.voltage().withAccess(ea.STATE).withEndpoint("ch4"),
            e.power().withAccess(ea.STATE).withEndpoint("ch4"),
            e.current().withAccess(ea.STATE).withEndpoint("ch5"),
            e.voltage().withAccess(ea.STATE).withEndpoint("ch5"),
            e.power().withAccess(ea.STATE).withEndpoint("ch5"),
            e.current().withAccess(ea.STATE).withEndpoint("ch6"),
            e.voltage().withAccess(ea.STATE).withEndpoint("ch6"),
            e.power().withAccess(ea.STATE).withEndpoint("ch6"),
            e.temperature().withEndpoint("l6"),
            e.humidity().withEndpoint("l6"),
            e.action(["single", "double", "triple", "hold", "release"]),
            e.cpu_temperature().withProperty("temperature").withEndpoint("l2"),
            ...zigDcInputConfigExposes("l7", "IN1"),
            ...zigDcInputConfigExposes("l8", "IN2"),
            ...zigDcInputConfigExposes("l1", "BTN"),
            e.numeric("uptime", ea.STATE).withDescription("Uptime").withUnit("sec"),
            e.numeric("interval", ea.SET).withValueMin(5).withValueMax(600).withValueStep(1).withDescription("Reporting interval").withUnit("sec"),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l5: 5, l6: 6, l7: 7, l8: 8};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read("genBasic", ["modelId", "swBuildId", "powerSource"]);
            const endpoint2 = device.getEndpoint(2);
            await endpoint2.configureReporting("genOnOff", [
                {attribute: "onOff", minimumReportInterval: 20, maximumReportInterval: 120, reportableChange: 0.1},
            ]);
        },
    },
    {
        zigbeeModel: ["ZigUSB_C6"],
        model: "ZigUSB_C6",
        vendor: "xyzroe",
        description: "Zigbee USB switch with monitoring",
        ota: true,
        toZigbee: [tzLocal.zigusb_restart_interval],
        exposes: [
            e
                .numeric("restart", ea.SET)
                .withEndpoint("4")
                .withValueMin(1)
                .withValueMax(30)
                .withValueStep(1)
                .withDescription("Restart USB device - OFF time")
                .withUnit("seconds"),
        ],
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2, 3: 3, 4: 4}}),
            m.identify(),
            m.electricityMeter({
                cluster: "electrical",
                electricalMeasurementType: "both",
                // Since this device measures lower voltage devices, lower the change value.
                current: {change: 100},
                power: {change: 100},
                voltage: {change: 100},
                endpointNames: ["1"],
            }),
            m.temperature(),
            m.onOff({endpointNames: ["1"], description: "Controls the USB port"}),
            m.onOff({powerOnBehavior: false, endpointNames: ["2"], description: "LED indicates the Zigbee status"}),
            m.onOff({powerOnBehavior: false, endpointNames: ["3"], description: "LED indicates the USB state"}),
            m.iasZoneAlarm({zoneType: "generic", zoneAttributes: ["alarm_1"], description: "Over current alarm"}),
        ],
        meta: {multiEndpoint: true},
    },
];
