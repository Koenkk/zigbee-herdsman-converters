import type {RawClusterAttributes} from "zigbee-herdsman/dist/controller/tstype";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, ModernExtend, Zh} from "../lib/types";

const NS = "zhc:livolo";

const e = exposes.presets;
const ea = exposes.access;

const poll = async (device: Zh.Device) => {
    try {
        const endpoint = device.getEndpoint(6);
        const options = {transactionSequenceNumber: 0, srcEndpoint: 8, disableResponse: true, disableRecovery: true};
        await endpoint.command("genOnOff", "toggle", {}, options);
    } catch {
        // device is lost, need to permit join
    }
};

const mLocal = {
    poll: (): ModernExtend => {
        const extend = m.poll({
            key: "interval",
            defaultIntervalSeconds: 300,
            poll,
        });
        return {...extend, configure: [poll]};
    },
};

const fzLocal = {
    // biome-ignore lint/suspicious/noExplicitAny: ignore
    prevent_disconnect: (args: {dp: number; payload: ((data: any) => RawClusterAttributes) | RawClusterAttributes}): Fz.Converter<"genPowerCfg"> => {
        return {
            // This is needed while pairing in order to let the device know that the interview went right and prevent
            // it from disconnecting from the Zigbee network.
            cluster: "genPowerCfg",
            type: ["raw"],
            convert: (model, msg, publish, options, meta) => {
                const dp = msg.data[10];
                if (msg.data[0] === 0x7a && msg.data[1] === 0xd1) {
                    const endpoint = msg.device.getEndpoint(6);
                    if (dp === args.dp) {
                        const options = {
                            manufacturerCode: 0x1ad2,
                            disableDefaultResponse: true,
                            disableResponse: true,
                            reservedBits: 3,
                            direction: 1,
                            writeUndiv: true,
                        };
                        endpoint
                            .readResponse("genPowerCfg", 0xe9, typeof args.payload === "function" ? args.payload(msg.data) : args.payload, options)
                            .catch((error) => logger.error(`Failed to prevent disconnect of '${msg.device.ieeeAddr}}' (${error})`, NS));
                    }
                }
            },
        };
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TI0001          "],
        model: "TI0001",
        description: "Zigbee switch (1, 2, 3, 4 gang)",
        vendor: "Livolo",
        exposes: [
            e.switch().withEndpoint("left"),
            e.switch().withEndpoint("right"),
            e.switch().withEndpoint("bottom_left"),
            e.switch().withEndpoint("bottom_right"),
        ],
        fromZigbee: [
            fz.livolo_switch_state,
            fz.livolo_switch_state_raw,
            fz.livolo_new_switch_state_4gang,
            fzLocal.prevent_disconnect({dp: 1, payload: {8194: {value: 0n, type: 0x0e}}}),
        ],
        toZigbee: [tz.livolo_socket_switch_on_off],
        endpoint: (device) => {
            return {left: 6, right: 6, bottom_left: 6, bottom_right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-switch"],
        model: "TI0001-switch",
        description: "Zigbee switch 1 gang",
        vendor: "Livolo",
        fromZigbee: [fz.livolo_new_switch_state, fz.power_on_behavior],
        toZigbee: [tz.livolo_socket_switch_on_off, tz.power_on_behavior],
        exposes: [e.switch()],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-switch-2gang"],
        model: "TI0001-switch-2gang",
        description: "Zigbee Switch 2 gang",
        vendor: "Livolo",
        fromZigbee: [fz.livolo_new_switch_state_2gang],
        toZigbee: [tz.livolo_socket_switch_on_off],
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right")],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-curtain-switch"],
        model: "TI0001-curtain-switch",
        description: "Zigbee curtain switch (can only read status, control does not work yet)",
        vendor: "Livolo",
        fromZigbee: [fz.livolo_curtain_switch_state],
        toZigbee: [tz.livolo_socket_switch_on_off],
        // toZigbee: [tz.livolo_curtain_switch_on_off],
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right")],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-socket"],
        model: "TI0001-socket",
        description: "Zigbee socket",
        vendor: "Livolo",
        exposes: [e.switch()],
        fromZigbee: [fz.livolo_socket_state, fz.power_on_behavior],
        toZigbee: [tz.livolo_socket_switch_on_off, tz.power_on_behavior],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-dimmer"],
        model: "TI0001-dimmer",
        description: "Zigbee dimmer",
        vendor: "Livolo",
        fromZigbee: [fz.livolo_dimmer_state],
        toZigbee: [tz.livolo_socket_switch_on_off, tz.livolo_dimmer_level],
        exposes: [e.light_brightness()],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-cover"],
        model: "TI0001-cover",
        description: "Zigbee roller blind motor",
        vendor: "Livolo",
        fromZigbee: [
            fz.livolo_cover_state,
            fz.command_off,
            fzLocal.prevent_disconnect({
                dp: 0x02,
                payload(data) {
                    return {2050: {value: [data[3], 0, 0, 0, 0, 0, 0], type: data[2]}};
                },
            }),
        ],
        toZigbee: [tz.livolo_cover_state, tz.livolo_cover_position, tz.livolo_cover_options],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e
                .composite("options", "options", ea.STATE_SET)
                .withDescription("Motor options")
                .withFeature(e.numeric("motor_speed", ea.STATE_SET).withValueMin(20).withValueMax(40).withDescription("Motor speed").withUnit("rpm"))
                .withFeature(e.enum("motor_direction", ea.STATE_SET, ["FORWARD", "REVERSE"]).withDescription("Motor direction")),
            e.binary("moving", ea.STATE, true, false).withDescription("Motor is moving"),
        ],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-pir"],
        model: "TI0001-pir",
        description: "Zigbee motion Sensor",
        vendor: "Livolo",
        exposes: [e.occupancy()],
        fromZigbee: [
            fz.livolo_pir_state,
            fzLocal.prevent_disconnect({
                dp: 0x01,
                payload: {8194: {value: 0n, type: 0x0e}},
            }),
        ],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-hygrometer"],
        model: "TI0001-hygrometer",
        description: "Zigbee Digital Humidity and Temperature Sensor",
        vendor: "Livolo",
        exposes: [e.humidity(), e.temperature()],
        fromZigbee: [
            fz.livolo_hygrometer_state,
            fzLocal.prevent_disconnect({
                dp: 0x02,
                payload(data) {
                    return {8194: {value: [data[3], 0, 0, 0, 0, 0, 0], type: data[2]}};
                },
            }),
        ],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-illuminance"],
        model: "TI0001-illuminance",
        description: "Zigbee digital illuminance and sound sensor",
        vendor: "Livolo",
        exposes: [
            e.noise_detected(),
            e.illuminance(),
            e.enum("noise_level", ea.STATE, ["silent", "normal", "lively", "noisy"]).withDescription("Detected noise level"),
        ],
        fromZigbee: [
            fz.livolo_illuminance_state,
            fzLocal.prevent_disconnect({
                dp: 0x02,
                payload(data) {
                    return {8194: {value: [data.data[3], 0, 0, 0, 0, 0, 0], type: data.data[2]}};
                },
            }),
        ],
        extend: [mLocal.poll()],
    },
];
