import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const ea = exposes.access;
const e = exposes.presets;

const tzLocal = {
    DTB190502A1_LED: {
        key: ["LED"],
        convertSet: async (entity, key, value, meta) => {
            if (value === "default") {
                value = 1;
            }
            const lookup = {
                OFF: 0,
                ON: 1,
            };
            value = utils.getFromLookup(value, lookup);
            // Check for valid data
            utils.assertNumber(value, key);
            if ((value >= 0 && value < 2) === false) value = 0;

            const payload = {
                16400: {
                    value,
                    type: 0x21,
                },
            };

            await entity.write("genBasic", payload);
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    DTB2011014: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            return {
                key_1: msg.data["41361"] === 1 ? "ON" : "OFF",
                key_2: msg.data["41362"] === 1 ? "ON" : "OFF",
                key_3: msg.data["41363"] === 1 ? "ON" : "OFF",
                key_4: msg.data["41364"] === 1 ? "ON" : "OFF",
            };
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
    DTB190502A1: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const lookupKEY: KeyValueAny = {
                "0": "KEY_SYS",
                "1": "KEY_UP",
                "2": "KEY_DOWN",
                "3": "KEY_NONE",
            };
            const lookupLED: KeyValueAny = {"0": "OFF", "1": "ON"};
            return {
                cpu_temperature: utils.precisionRound(msg.data["41361"] as number, 2),
                key_state: lookupKEY[msg.data["41362"] as number],
                led_state: lookupLED[msg.data["41363"] as number],
            };
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["DTB190502A1"],
        model: "DTB190502A1",
        vendor: "databyte.ch",
        description: "CC2530 based IO Board",
        fromZigbee: [fzLocal.DTB190502A1],
        toZigbee: [tzLocal.DTB190502A1_LED],
        exposes: [e.binary("led_state", ea.STATE, "ON", "OFF"), e.enum("key_state", ea.STATE, ["KEY_SYS", "KEY_UP", "KEY_DOWN", "KEY_NONE"])],
    },
    {
        zigbeeModel: ["DTB-ED2004-012"],
        model: "ED2004-012",
        vendor: "databyte.ch",
        description: "Panda 1 - wall switch",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["DTB-ED2011-014"],
        model: "Touch4",
        vendor: "databyte.ch",
        description: "Wall touchsensor with 4 keys",
        fromZigbee: [fzLocal.DTB2011014, fz.battery],
        toZigbee: [],
        exposes: [
            e.battery(),
            e.binary("key_1", ea.STATE, "ON", "OFF"),
            e.binary("key_2", ea.STATE, "ON", "OFF"),
            e.binary("key_3", ea.STATE, "ON", "OFF"),
            e.binary("key_4", ea.STATE, "ON", "OFF"),
        ],
    },
];
