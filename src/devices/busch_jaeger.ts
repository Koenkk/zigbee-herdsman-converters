import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PU01"],
        model: "6717-84",
        vendor: "Busch-Jaeger",
        description: "Adaptor plug",
        extend: [m.onOff()],
    },
    {
        // Busch-Jaeger 6735, 6736 and 6737 have been tested with the 6710 U (Power Adapter),
        // 6711 U (Relay) and 6715 U (dimmer) back-ends. Unfortunately both the relay and the dimmer
        // report as model 'RM01' with genLevelCtrl clusters, so we need to set up both of them
        // as dimmable lights.
        //
        // The battery-powered version of the device ('RB01') is supported as well. These devices are
        // sold as Busch-Jaeger 6735/01, 6736/01 and 6737/01.
        //
        // In order to manually capture scenes as described in the devices manual, the endpoint
        // corresponding to the row needs to be unbound (https://www.zigbee2mqtt.io/information/binding.html)
        // If that operation was successful, the switch will respond to button presses on that
        // by blinking multiple times (vs. just blinking once if it's bound).
        zigbeeModel: ["RM01", "RB01"],
        model: "6735/6736/6737",
        vendor: "Busch-Jaeger",
        description: "Zigbee Light Link power supply/relay/dimmer/wall-switch",
        endpoint: (device) => {
            return {row_1: 0x0a, row_2: 0x0b, row_3: 0x0c, row_4: 0x0d, relay: 0x12};
        },
        exposes: (device, options) => {
            const expose = [];

            // If endpoint 0x12 (18) is present this means the following two things:
            //  1. The device is connected to a relay or dimmer and needs to be exposed as a dimmable light
            //  2. The top rocker will not be usable (not emit any events) as it's hardwired to the relay/dimmer
            if (utils.isDummyDevice(device) || device.getEndpoint(0x12) != null) {
                expose.push(e.light_brightness().withEndpoint("relay"));
            }
            // Not all devices support all actions (depends on number of rocker rows and if relay/dimmer is installed),
            // but defining all possible actions here won't do any harm.
            // The recall actions are only emitted when the `genScenes` cluster is bound to a group/light.
            expose.push(
                e.action([
                    "off_row_1",
                    "on_row_1",
                    "brightness_step_down_row_1",
                    "brightness_step_up_row_1",
                    "brightness_stop_row_1",
                    "off_row_2",
                    "on_row_2",
                    "brightness_step_down_row_2",
                    "brightness_step_up_row_2",
                    "brightness_stop_row_2",
                    "off_row_3",
                    "on_row_3",
                    "brightness_step_down_row_3",
                    "brightness_step_up_row_3",
                    "brightness_stop_row_3",
                    "off_row_4",
                    "on_row_4",
                    "brightness_step_down_row_4",
                    "brightness_step_up_row_4",
                    "brightness_stop_row_4",
                    "recall_*_row_*",
                ]),
            );

            return expose;
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            // Depending on the actual devices - 6735, 6736, or 6737 - there are 1, 2, or 4 endpoints for
            // the rockers. If the module is installed on a dimmer or relay, there is an additional endpoint (18).

            // These devices only have a very limited amount of memory available. Possibly depending on network size (?)
            // they only support around 5 bindings so we need to be very careful about the binding setup. We intentionally
            // skip binding the endpoint 18 (light endpoint) to the coordinator. The device does not support Zigbee
            // reporting anyways and we poll the device's state instead, so this does not cause any loss of functionality.
            const endpoint18 = device.getEndpoint(0x12);
            if (endpoint18 == null) {
                // We only need to bind endpoint 10 (top rocker) if endpoint 18 (relay/dimmer) is not present.
                // Otherwise the top rocker is hard-wired to the relay/dimmer and cannot be used anyways.
                const endpoint10 = device.getEndpoint(0x0a);
                if (endpoint10 != null) {
                    await reporting.bind(endpoint10, coordinatorEndpoint, ["genLevelCtrl"]);
                }
            }

            const endpoint11 = device.getEndpoint(0x0b);
            if (endpoint11 != null) {
                await reporting.bind(endpoint11, coordinatorEndpoint, ["genLevelCtrl"]);
            }
            const endpoint12 = device.getEndpoint(0x0c);
            if (endpoint12 != null) {
                await reporting.bind(endpoint12, coordinatorEndpoint, ["genLevelCtrl"]);
            }
            const endpoint13 = device.getEndpoint(0x0d);
            if (endpoint13 != null) {
                await reporting.bind(endpoint13, coordinatorEndpoint, ["genLevelCtrl"]);
            }
        },
        fromZigbee: [fz.on_off, fz.brightness, fz.command_on, fz.command_off, fz.command_step, fz.command_stop, fz.command_recall],
        toZigbee: [tz.light_onoff_brightness, tz.light_brightness_step, tz.light_brightness_move],
        extend: [
            // This device doesn't support reporting. Therefore we read the on/off state every 60 seconds.
            // This is the same was as the Hue bridge does it.
            m.poll({
                key: "state",
                option: e
                    .numeric("state_poll_interval", ea.SET)
                    .withValueMin(-1)
                    .withDescription(
                        "This device does not support state reporting so it is polled instead. The default poll interval is 60 seconds, set to -1 to disable.",
                    ),
                defaultIntervalSeconds: 60,
                poll: async (device) => {
                    const switchEndpoint = device.getEndpoint(0x12);
                    if (switchEndpoint == null) {
                        return;
                    }
                    await switchEndpoint.read("genOnOff", ["onOff"]);
                    await switchEndpoint.read("genLevelCtrl", ["currentLevel"]);
                },
            }),
        ],
    },
];
