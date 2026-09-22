import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

/*
 * Streda by Isolectra (reports "TKHTechnology" as manufacturer name).
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
 * Buttons report through genMultistateInput. Each endpoint carries one rocker,
 * with the value encoding both which half was pressed and what happened:
 *
 *   1 / 11   single press, upper / lower
 *   2 / 12   double press, upper / lower
 *   3 / 13   hold released, upper / lower
 *   4 / 14   hold started, upper / lower
 *
 * The devices also emit genOnOff commands for the same presses, duplicated
 * across two endpoints, so those are left unconverted to avoid double-firing.
 *
 * Several clusters are advertised but never populated by the firmware (tested
 * on 0.3.10): haElectricalMeasurement and seMetering on the load endpoints
 * return no values, genOnOff startUpOnOff is rejected with
 * UNSUPPORTED_ATTRIBUTE, and lightingColorCtrl reports colour temperature
 * support that has no visible effect. These are deliberately not exposed; the
 * manufacturer's own hub shows the same gaps.
 */

/** Rocker events, keyed by the genMultistateInput presentValue they arrive as. */
const ROCKER_ACTIONS = {
    single_up: 1,
    double_up: 2,
    release_up: 3,
    hold_up: 4,
    single_down: 11,
    double_down: 12,
    release_down: 13,
    hold_down: 14,
};

/** The doorbell push button is a single button, so only the "up" codes occur. */
const DOORBELL_BUTTON_ACTIONS = {
    single: 1,
    double: 2,
    release: 3,
    hold: 4,
};

/** Decodes the rockers on the given endpoint names into per-rocker actions. */
function rockerButtons(endpointNames: string[]) {
    return m.actionEnumLookup({
        cluster: "genMultistateInput",
        attribute: "presentValue",
        actionLookup: ROCKER_ACTIONS,
        endpointNames,
    });
}

/**
 * Indicator LED on the faceplate, or behind a fixture on the models with two.
 * Brightness and colour only — the firmware advertises colour temperature but
 * ignores it, and these are single RGB emitters so it would add nothing.
 */
function indicatorLeds(endpointNames: string[]) {
    return m.light({endpointNames, color: {modes: ["hs"]}});
}

/**
 * These devices signal low battery through batteryAlarmMask rather than the
 * batteryAlarmState that m.battery's own low-battery handling inspects.
 */
function batteryLow() {
    return m.binary({
        name: "battery_low",
        cluster: "genPowerCfg",
        attribute: "batteryAlarmMask",
        description: "Indicates if the battery of this device is almost empty",
        valueOn: [true, 1],
        valueOff: [false, 0],
        access: "STATE",
        entityCategory: "diagnostic",
    });
}

const tzLocal = {
    /**
     * Momentary trigger for the buzzer. Publishes no state back: the device
     * sounds once and clears itself, so there is nothing to track.
     */
    doorbell: {
        key: ["doorbell"],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = meta.device.getEndpoint(6);
            await endpoint.command("genOnOff", "on", {});
            return {};
        },
    } as Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["BN0-S-03/PW"],
        model: "BN0-S-03/PW",
        vendor: "STREDA",
        description: "2-button wall switch",
        extend: [
            m.deviceEndpoints({endpoints: {button_1: 3}}),
            rockerButtons(["button_1"]),
            // Reports voltage only; this is the same curve the manufacturer
            // applies to derive a percentage.
            m.battery({voltageToPercentage: "3V_2100", voltage: true}),
            batteryLow(),
        ],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["BN0-T-03/PW"],
        model: "BN0-T-03/PW",
        vendor: "STREDA",
        description: "4-button wall switch",
        extend: [
            m.deviceEndpoints({endpoints: {button_1: 3, button_2: 4}}),
            rockerButtons(["button_1", "button_2"]),
            m.battery({voltageToPercentage: "3V_2100", voltage: true}),
            batteryLow(),
        ],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["BN1-1-03/PW"],
        model: "BN1-1-03/PW",
        vendor: "STREDA",
        description: "Outlet",
        extend: [m.deviceEndpoints({endpoints: {led: 2}}), indicatorLeds(["led"])],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["BN3-110-03/PW"],
        model: "BN3-110-03/PW",
        vendor: "STREDA",
        description: "Outlet",
        extend: [m.deviceEndpoints({endpoints: {led: 2}}), indicatorLeds(["led"])],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["DF3-11R-03/PW"],
        model: "DF3-11R-03/PW",
        vendor: "STREDA",
        description: "Outlet",
        extend: [m.deviceEndpoints({endpoints: {led: 2, led_2: 4}}), indicatorLeds(["led", "led_2"])],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["BN1-C-03/PW", "HN1-CW-4-03/PW"],
        model: "BN1-C-03/PW",
        vendor: "STREDA",
        description: "Ceiling outlet",
        extend: [
            m.deviceEndpoints({endpoints: {led: 2, outlet: 3, led_2: 4}}),
            // startUpOnOff is rejected with UNSUPPORTED_ATTRIBUTE on this
            // endpoint, so power-on behaviour is disabled.
            m.onOff({endpointNames: ["outlet"], powerOnBehavior: false}),
            indicatorLeds(["led", "led_2"]),
        ],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["SN2-E-03/PW"],
        model: "SN2-E-03/PW",
        vendor: "STREDA",
        description: "Spotlight dimmer",
        extend: [
            m.deviceEndpoints({endpoints: {led: 2, dimmer: 3, led_2: 4}}),
            m.light({endpointNames: ["dimmer"], powerOnBehavior: false, levelConfig: {}}),
            indicatorLeds(["led", "led_2"]),
        ],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["SN3-1TB5-03/PW", "HNB-W-1TB5-03/PW"],
        model: "SN3-1TB5-03/PW",
        vendor: "STREDA",
        description: "Light and socket relay with buzzer and 4 buttons",
        extend: [
            m.deviceEndpoints({endpoints: {led: 2, socket: 3, button_1: 4, button_2: 5, light: 7}}),
            m.onOff({endpointNames: ["socket", "light"], powerOnBehavior: false}),
            indicatorLeds(["led"]),
            rockerButtons(["button_1", "button_2"]),
        ],
        // The buzzer on endpoint 6 sounds once and clears itself, so it is
        // exposed as a write-only enum rather than a switch. Not present in the
        // manufacturer's own definitions; found by experiment.
        toZigbee: [tzLocal.doorbell],
        exposes: [e.enum("doorbell", ea.SET, ["ring"]).withDescription("Sounds the doorbell buzzer")],
        ota: {manufacturerName: "Streda"},
    },
    {
        zigbeeModel: ["SN3-1TB5K-03/PW", "HNB-W-1TB5K-03/PW"],
        model: "SN3-1TB5K-03/PW",
        vendor: "STREDA",
        description: "Light and socket relay with buzzer, 4 buttons and doorbell push button",
        extend: [
            m.deviceEndpoints({
                endpoints: {led: 2, socket: 3, button_1: 4, button_2: 5, light: 7, doorbell_button: 8},
            }),
            m.onOff({endpointNames: ["socket", "light"], powerOnBehavior: false}),
            indicatorLeds(["led"]),
            rockerButtons(["button_1", "button_2"]),
            // The external doorbell push button, on its own endpoint.
            m.actionEnumLookup({
                cluster: "genMultistateInput",
                attribute: "presentValue",
                actionLookup: DOORBELL_BUTTON_ACTIONS,
                endpointNames: ["doorbell_button"],
            }),
        ],
        toZigbee: [tzLocal.doorbell],
        exposes: [e.enum("doorbell", ea.SET, ["ring"]).withDescription("Sounds the doorbell buzzer")],
        ota: {manufacturerName: "Streda"},
    },
];
