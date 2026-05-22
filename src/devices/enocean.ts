import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import type {DefinitionWithExtend, Fz} from "../lib/types";
import {hasAlreadyProcessedMessage} from "../lib/utils";

const e = exposes.presets;

const NS = "zhc:enocean";

// Button 1: A0 (top left)
// Button 2: A1 (bottom left)
// Button 3: B0 (top right)
// Button 4: B1 (bottom right)
const ENOCEAN_PTM215Z_LOOKUP: Record<number, string> = {
    16: "press_1",
    20: "release_1",
    17: "press_2",
    21: "release_2",
    19: "press_3",
    23: "release_3",
    18: "press_4",
    22: "release_4",
    100: "press_1_and_3",
    101: "release_1_and_3",
    98: "press_2_and_4",
    99: "release_2_and_4",
    34: "press_energy_bar",
};
// Button 1: A0 (top left)
// Button 2: A1 (bottom left)
// Button 3: B0 (top right)
// Button 4: B1 (bottom right)
const ENOCEAN_PTM215ZE_LOOKUP: Record<number, string> = {
    34: "press_1",
    35: "release_1",
    24: "press_2",
    25: "release_2",
    20: "press_3",
    21: "release_3",
    18: "press_4",
    19: "release_4",
    100: "press_1_and_2",
    101: "release_1_and_2",
    98: "press_1_and_3",
    99: "release_1_and_3",
    30: "press_1_and_4",
    31: "release_1_and_4",
    28: "press_2_and_3",
    29: "release_2_and_3",
    26: "press_2_and_4",
    27: "release_2_and_4",
    22: "press_3_and_4",
    23: "release_3_and_4",
    16: "press_energy_bar",
    17: "release_energy_bar",
    0: "press_or_release_all",
    80: "lock",
    81: "unlock",
    82: "half_open",
    83: "tilt",
};
// Button 1: A0 (top left)
// Button 2: A1 (bottom left)
// Button 3: B0 (top right)
// Button 4: B1 (bottom right)
const ENOCEAN_PTM216Z_LOOKUP: Record<string, string> = {
    "105_1": "press_1",
    "105_2": "press_2",
    "105_3": "press_1_and_2",
    "105_4": "press_3",
    "105_5": "press_1_and_3",
    "105_6": "press_2_and_3",
    "105_7": "press_1_and_2_and_3",
    "105_8": "press_4",
    "105_9": "press_1_and_4",
    "105_10": "press_2_and_4",
    "105_11": "press_1_and_2_and_4",
    "105_12": "press_3_and_4",
    "105_13": "press_1_and_3_and_4",
    "105_14": "press_2_and_3_and_4",
    "105_15": "press_all",
    "105_16": "press_energy_bar",
    "106_0": "release",
    "104_": "short_press_2_of_2",
};

const fzLocal = {
    enocean_ptm215z: {
        cluster: "greenPower",
        type: ["commandNotification", "commandCommissioningNotification"],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID >= 0xe0) return; // Skip op commands

            const action = ENOCEAN_PTM215Z_LOOKUP[commandID] !== undefined ? ENOCEAN_PTM215Z_LOOKUP[commandID] : `unknown_${commandID}`;
            return {action};
        },
    } satisfies Fz.Converter<"greenPower", undefined, ["commandNotification", "commandCommissioningNotification"]>,
    enocean_ptm215ze: {
        cluster: "greenPower",
        type: ["commandNotification", "commandCommissioningNotification"],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID >= 0xe0) return; // Skip op commands

            if (ENOCEAN_PTM215ZE_LOOKUP[commandID] === undefined) {
                logger.error(`PTM 215ZE: missing command '${commandID}'`, NS);
            } else {
                return {action: ENOCEAN_PTM215ZE_LOOKUP[commandID]};
            }
        },
    } satisfies Fz.Converter<"greenPower", undefined, ["commandNotification", "commandCommissioningNotification"]>,
    enocean_ptm216z: {
        cluster: "greenPower",
        type: ["commandNotification", "commandCommissioningNotification"],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID >= 0xe0) return; // Skip op commands

            const ID = `${commandID}_${"raw" in msg.data.commandFrame ? (msg.data.commandFrame.raw[0] ?? "") : ""}`;

            if (ENOCEAN_PTM216Z_LOOKUP[ID] === undefined) {
                logger.error(`PTM 216Z: missing command '${ID}'`, NS);
            } else {
                return {action: ENOCEAN_PTM216Z_LOOKUP[ID]};
            }
        },
    } satisfies Fz.Converter<"greenPower", undefined, ["commandNotification", "commandCommissioningNotification"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "GreenPower_2", ieeeAddr: /^0x00000000017.....$/}],
        model: "PTM 215Z",
        vendor: "EnOcean",
        description: "Pushbutton transmitter module",
        fromZigbee: [fzLocal.enocean_ptm215z],
        toZigbee: [],
        exposes: [
            e.action([
                "press_1",
                "release_1",
                "press_2",
                "release_2",
                "press_3",
                "release_3",
                "press_4",
                "release_4",
                "press_1_and_3",
                "release_1_and_3",
                "press_2_and_4",
                "release_2_and_4",
                "press_energy_bar",
            ]),
        ],
        whiteLabel: [
            {vendor: "Niko", description: "Dimmer switch for Hue system", model: "91004"},
            {vendor: "NodOn", description: "Smart switch for Philips Hue", model: "CWS-4-1-01_HUE"},
            {vendor: "Vimar", description: "Zigbee Friends of Hue RF switch", model: "03906"},
            {vendor: "Sunricher", model: "SR-ZGP2801K4-FOH-E"},
            {vendor: "Sunricher", model: "SR-ZG2833PAC"},
            {vendor: "LED-Trading", model: "9125"},
            {vendor: "Feller", description: "Smart light control for Philips Hue", model: "4120.2.S.FMI.61"},
            {vendor: "Namron", description: " Zigbee FOH Green Bryter K4", model: "4512727"},
        ],
    },
    {
        fingerprint: [{modelID: "GreenPower_2", ieeeAddr: /^0x00000000015.....$/}],
        model: "PTM 215ZE",
        vendor: "EnOcean",
        description: "Pushbutton transmitter module",
        fromZigbee: [fzLocal.enocean_ptm215ze],
        toZigbee: [],
        exposes: [
            e.action([
                "press_1",
                "release_1",
                "press_2",
                "release_2",
                "press_3",
                "release_3",
                "press_4",
                "release_4",
                "press_1_and_2",
                "release_1_and_2",
                "press_1_and_3",
                "release_1_and_3",
                "press_1_and_4",
                "release_1_and_4",
                "press_2_and_3",
                "release_2_and_3",
                "press_2_and_4",
                "release_2_and_4",
                "press_3_and_4",
                "release_3_and_4",
                "press_energy_bar",
                "release_energy_bar",
                "press_or_release_all",
                "lock",
                "unlock",
                "half_open",
                "tilt",
            ]),
        ],
        whiteLabel: [
            {vendor: "Easyfit by EnOcean", description: "Wall switch for Zigbee", model: "EWSxZ"},
            {vendor: "Trio2sys", description: "Zigbee Green Power complete switch", model: "20020002"},
        ],
    },
    {
        fingerprint: [{modelID: "GreenPower_7", ieeeAddr: /^0x00000000015.....$/}],
        model: "PTM 216Z",
        vendor: "EnOcean",
        description: "Pushbutton transmitter module",
        fromZigbee: [fzLocal.enocean_ptm216z],
        toZigbee: [],
        exposes: [
            e.action([
                "press_1",
                "press_2",
                "press_1_and_2",
                "press_3",
                "press_1_and_3",
                "press_2_and_3",
                "press_1_and_2_and_3",
                "press_4",
                "press_1_and_4",
                "press_2_and_4",
                "press_1_and_2_and_4",
                "press_3_and_4",
                "press_1_and_3_and_4",
                "press_2_and_3_and_4",
                "press_all",
                "press_energy_bar",
                "release",
                "short_press_2_of_2",
            ]),
        ],
    },
];
