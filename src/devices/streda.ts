import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {Definition, DefinitionWithExtend, Fz, KeyValue, Publish, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

/*
 * Streda by Isolectra (manufacturer ID reports as "TKHTechnology").
 *
 * Wall switches, relays, dimmers and outlets from a modular in-wall system.
 * Most units share a common layout:
 *
 *   endpoint 2       faceplate indicator LED (RGB)
 *   endpoint 4       second indicator LED on some models — a sync indicator for
 *                    a relay behind a lamp or fixture
 *   endpoints 3/7    load channels (relay, dimmer or socket)
 *   endpoints 3,4,5  button inputs, depending on model
 *
 * Buttons report through genMultistateInput rather than genOnOff commands. The
 * value encodes both which button and which event:
 *
 *   endpoint    selects the rocker pair
 *   tens digit  selects upper/lower within the pair (0 = upper, 1 = lower)
 *   ones digit  is the event code
 *
 * Devices also emit genOnOff commands for the same presses, but duplicated
 * across two endpoints, so the multistate reports are used exclusively.
 *
 * Several clusters are advertised but never populated by the firmware (tested on
 * 0.3.10): haElectricalMeasurement and seMetering on the load endpoints return
 * no values, genOnOff startUpOnOff is rejected with UNSUPPORTED_ATTRIBUTE on
 * BN1-C, and lightingColorCtrl reports colour temperature support that has no
 * visible effect. These are deliberately not exposed. The manufacturer's own
 * hub shows the same gaps.
 */

const BUTTON_EVENTS: {[key: number]: string} = {
    1: "single",
    2: "double",
    3: "release",
    4: "hold",
};

/** Action names for a single button, e.g. button_1_single through button_1_hold. */
function actionsFor(prefix: string): string[] {
    return Object.values(BUTTON_EVENTS).map((event) => `${prefix}_${event}`);
}

/** Action names for a device with `buttonCount` buttons. */
function buttonActions(buttonCount: number): string[] {
    const values: string[] = [];
    for (let button = 1; button <= buttonCount; button++) {
        values.push(...actionsFor(`button_${button}`));
    }
    return values;
}

/** Action names for the external doorbell push button. */
const doorbellButtonActions = actionsFor("doorbell_button");

const fzLocal = {
    /**
     * Decodes genMultistateInput presentValue into per-button actions.
     * `firstEndpoint` is the endpoint carrying buttons 1 and 2.
     */
    button_action: (firstEndpoint: number, buttonCount: number, doorbellButtonEndpoint?: number) => ({
        cluster: "genMultistateInput",
        type: ["attributeReport", "readResponse"],
        convert: (model: Definition, msg: Fz.Message<"genMultistateInput">, publish: Publish, options: KeyValue, meta: Fz.Meta) => {
            const value = (msg.data as {presentValue?: number}).presentValue;
            if (value === undefined) return;

            const endpoint = msg.endpoint.ID;
            const event = BUTTON_EVENTS[value % 10];
            const half = Math.floor(value / 10);

            if (event === undefined || half > 1) {
                return {action: `unknown_ep${endpoint}_${value}`};
            }

            // Models with an external doorbell push button report it on its own
            // endpoint, as a single button.
            if (doorbellButtonEndpoint !== undefined && endpoint === doorbellButtonEndpoint && half === 0) {
                return {action: `doorbell_button_${event}`};
            }

            const button = (endpoint - firstEndpoint) * 2 + half + 1;
            if (button < 1 || button > buttonCount) {
                return {action: `unknown_ep${endpoint}_${value}`};
            }
            return {action: `button_${button}_${event}`};
        },
    }),

    /**
     * The low-battery flag comes from batteryAlarmMask; these devices do not
     * report batteryAlarmState, which is what fz.battery inspects.
     */
    battery_low: {
        cluster: "genPowerCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model: Definition, msg: Fz.Message<"genPowerCfg">, publish: Publish, options: KeyValue, meta: Fz.Meta) => {
            const mask = (msg.data as {batteryAlarmMask?: number}).batteryAlarmMask;
            if (mask === undefined) return;
            return {battery_low: Boolean(mask)};
        },
    },
};

const tzLocal = {
    /**
     * Momentary trigger for the buzzer. Publishes no state back: the device
     * clears itself after sounding, so there is nothing to track.
     */
    doorbell: (endpointId: number): Tz.Converter =>
        ({
            key: ["doorbell"],
            convertSet: async (entity, key, value, meta) => {
                const endpoint = meta.device.getEndpoint(endpointId);
                await endpoint.command("genOnOff", "on", {});
                return {};
            },
        }) as Tz.Converter,
};

/**
 * Indicator LED on the faceplate or behind a fixture. Brightness and colour
 * only — the firmware advertises colour temperature but ignores it.
 *
 * Marked as a config entity so Home Assistant leaves it out of service calls
 * targeting a whole device or area; without this, "turn off all lights in this
 * room" also switches off the indicators.
 */
function indicatorLed(endpointName: string) {
    const light = e.light_brightness_colorxy().withEndpoint(endpointName);
    light.category = "config";
    return light;
}

function batteryExposes() {
    return [e.battery(), e.battery_voltage(), e.battery_low()];
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["BN0-S-03/PW"],
        model: "BN0-S-03/PW",
        vendor: "STREDA",
        description: "2-button wall switch",
        fromZigbee: [fzLocal.button_action(3, 2), fz.battery, fzLocal.battery_low],
        toZigbee: [],
        exposes: [e.action(buttonActions(2)), ...batteryExposes()],
        // The device reports voltage but no percentage; this is the same curve
        // the manufacturer's own converter applies.
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["BN0-T-03/PW"],
        model: "BN0-T-03/PW",
        vendor: "STREDA",
        description: "4-button wall switch",
        fromZigbee: [fzLocal.button_action(3, 4), fz.battery, fzLocal.battery_low],
        toZigbee: [],
        exposes: [e.action(buttonActions(4)), ...batteryExposes()],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["BN1-1-03/PW"],
        model: "BN1-1-03/PW",
        vendor: "STREDA",
        description: "Outlet",
        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp],
        toZigbee: [tz.light_onoff_brightness, tz.light_color],
        exposes: [indicatorLed("led")],
        meta: {multiEndpoint: true},
        ota: {manufacturerName: "Streda"},
        endpoint: () => ({led: 2}),
        configure: async (device, coordinatorEndpoint) => {
            const led = device.getEndpoint(2);
            await reporting.bind(led, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
            await reporting.onOff(led);
            await reporting.brightness(led);
        },
    },
    {
        zigbeeModel: ["BN3-110-03/PW"],
        model: "BN3-110-03/PW",
        vendor: "STREDA",
        description: "Outlet",
        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp],
        toZigbee: [tz.light_onoff_brightness, tz.light_color],
        exposes: [indicatorLed("led")],
        meta: {multiEndpoint: true},
        ota: {manufacturerName: "Streda"},
        endpoint: () => ({led: 2}),
        configure: async (device, coordinatorEndpoint) => {
            const led = device.getEndpoint(2);
            await reporting.bind(led, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
            await reporting.onOff(led);
            await reporting.brightness(led);
        },
    },
    {
        zigbeeModel: ["DF3-11R-03/PW"],
        model: "DF3-11R-03/PW",
        vendor: "STREDA",
        description: "Outlet",
        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp],
        toZigbee: [tz.light_onoff_brightness, tz.light_color],
        exposes: [indicatorLed("led"), indicatorLed("led_2")],
        meta: {multiEndpoint: true},
        ota: {manufacturerName: "Streda"},
        endpoint: () => ({led: 2, led_2: 4}),
        configure: async (device, coordinatorEndpoint) => {
            for (const ep of [2, 4]) {
                const led = device.getEndpoint(ep);
                await reporting.bind(led, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
                await reporting.onOff(led);
                await reporting.brightness(led);
            }
        },
    },
    {
        zigbeeModel: ["BN1-C-03/PW", "HN1-CW-4-03/PW"],
        model: "BN1-C-03/PW",
        vendor: "STREDA",
        description: "Ceiling outlet",
        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp],
        // tz.on_off first so `state` keeps routing to the relay; `brightness`
        // only exists on the LED endpoints and falls through to the light
        // converter.
        toZigbee: [tz.on_off, tz.light_onoff_brightness, tz.light_color],
        exposes: [e.light(), indicatorLed("led"), indicatorLed("led_2")],
        meta: {multiEndpoint: true},
        ota: {manufacturerName: "Streda"},
        endpoint: () => ({default: 3, led: 2, led_2: 4}),
        configure: async (device, coordinatorEndpoint) => {
            const outlet = device.getEndpoint(3);
            await reporting.bind(outlet, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(outlet);
            for (const ep of [2, 4]) {
                const led = device.getEndpoint(ep);
                await reporting.bind(led, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
                await reporting.onOff(led);
                await reporting.brightness(led);
            }
        },
    },
    {
        zigbeeModel: ["SN2-E-03/PW"],
        model: "SN2-E-03/PW",
        vendor: "STREDA",
        description: "Spotlight dimmer",
        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp, fz.level_config],
        toZigbee: [tz.light_onoff_brightness, tz.light_color, tz.level_config],
        exposes: [e.light().withBrightness(), indicatorLed("led"), indicatorLed("led_2")],
        meta: {multiEndpoint: true},
        ota: {manufacturerName: "Streda"},
        endpoint: () => ({default: 3, led: 2, led_2: 4}),
        configure: async (device, coordinatorEndpoint) => {
            const dimmer = device.getEndpoint(3);
            await reporting.bind(dimmer, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
            await reporting.onOff(dimmer);
            await reporting.brightness(dimmer);
            for (const ep of [2, 4]) {
                const led = device.getEndpoint(ep);
                await reporting.bind(led, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
                await reporting.onOff(led);
                await reporting.brightness(led);
            }
        },
    },
    {
        zigbeeModel: ["SN3-1TB5-03/PW", "HNB-W-1TB5-03/PW"],
        model: "SN3-1TB5-03/PW",
        vendor: "STREDA",
        description: "Light and socket relay with buzzer and 4 buttons",
        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp, fzLocal.button_action(4, 4)],
        toZigbee: [tz.on_off, tz.light_onoff_brightness, tz.light_color, tzLocal.doorbell(6)],
        exposes: [
            e.light().withEndpoint("light"),
            e.switch().withEndpoint("socket"),
            indicatorLed("led"),
            // Write-only enum, which Home Assistant discovery turns into a
            // button entity. The buzzer sounds once and clears itself.
            e.enum("doorbell", ea.SET, ["ring"]).withDescription("Sounds the doorbell buzzer"),
            e.action(buttonActions(4)),
        ],
        // Endpoint 6 stays mapped so its on/off reports publish as
        // state_doorbell rather than colliding with the light's `state`.
        meta: {multiEndpoint: true},
        ota: {manufacturerName: "Streda"},
        endpoint: () => ({light: 7, socket: 3, doorbell: 6, led: 2}),
        configure: async (device, coordinatorEndpoint) => {
            for (const ep of [3, 7]) {
                const endpoint = device.getEndpoint(ep);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
                await reporting.onOff(endpoint);
            }
            const led = device.getEndpoint(2);
            await reporting.bind(led, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
            await reporting.onOff(led);
            await reporting.brightness(led);
        },
    },
    {
        zigbeeModel: ["SN3-1TB5K-03/PW", "HNB-W-1TB5K-03/PW"],
        model: "SN3-1TB5K-03/PW",
        vendor: "STREDA",
        description: "Light and socket relay with buzzer, 4 buttons and doorbell push button",
        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp, fzLocal.button_action(4, 4, 8)],
        toZigbee: [tz.on_off, tz.light_onoff_brightness, tz.light_color, tzLocal.doorbell(6)],
        exposes: [
            e.light().withEndpoint("light"),
            e.switch().withEndpoint("socket"),
            indicatorLed("led"),
            e.enum("doorbell", ea.SET, ["ring"]).withDescription("Sounds the doorbell buzzer"),
            e.action([...buttonActions(4), ...doorbellButtonActions]),
        ],
        meta: {multiEndpoint: true},
        ota: {manufacturerName: "Streda"},
        endpoint: () => ({light: 7, socket: 3, doorbell: 6, led: 2}),
        configure: async (device, coordinatorEndpoint) => {
            for (const ep of [3, 7]) {
                const endpoint = device.getEndpoint(ep);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
                await reporting.onOff(endpoint);
            }
            const led = device.getEndpoint(2);
            await reporting.bind(led, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
            await reporting.onOff(led);
            await reporting.brightness(led);
        },
    },
];
