import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz} from "../lib/types";

// Control4 Vibrant bulbs use a 0-100 scale for genLevelCtrl currentLevel instead of 0-254:
// moveToLevel above 100 is ignored and currentLevel is reported as 0-100.
// A plain "on" also makes the bulb go to full brightness instead of its previous level.
const BULB_MAX_LEVEL = 100;
const MAX_LEVEL = 254;

const toBulbLevel = (value: number) => {
    if (!(value > 0)) return 0;
    return Math.min(BULB_MAX_LEVEL, Math.max(1, Math.round((value * BULB_MAX_LEVEL) / MAX_LEVEL)));
};

const fromBulbLevel = (value: number) => Math.min(MAX_LEVEL, Math.max(0, Math.round((value * MAX_LEVEL) / BULB_MAX_LEVEL)));

const toBulbRate = (value: number) => {
    if (value === 0 || Number.isNaN(value)) return value;
    return Math.sign(value) * Math.max(1, Math.round((Math.abs(value) * BULB_MAX_LEVEL) / MAX_LEVEL));
};

const scaledToZigbee = (converter: Tz.Converter): Tz.Converter => ({
    ...converter,
    convertSet: async (entity, key, value, meta) => {
        const message: KeyValueAny = {...meta.message};
        const state = typeof message.state === "string" ? message.state.toUpperCase() : undefined;
        const turningOn = state === "ON" || (state === "TOGGLE" && meta.state.state === "OFF");
        if (
            key === "state" &&
            turningOn &&
            message.brightness === undefined &&
            message.brightness_percent === undefined &&
            Number(meta.state.brightness) > 0
        ) {
            // Turn on at the previous level instead of letting the bulb go to full brightness
            message.state = "ON";
            message.brightness = meta.state.brightness;
        }
        if (message.brightness_percent !== undefined) {
            message.brightness = Math.min(BULB_MAX_LEVEL, Math.max(0, Math.round(Number(message.brightness_percent))));
            delete message.brightness_percent;
        } else if (message.brightness !== undefined) {
            message.brightness = toBulbLevel(Number(message.brightness));
        }
        for (const k of ["brightness_step", "brightness_step_onoff", "brightness_move", "brightness_move_onoff"]) {
            if (message[k] !== undefined && message[k] !== "stop") message[k] = toBulbRate(Number(message[k]));
        }
        const bulbState: KeyValueAny = {...meta.state};
        if (bulbState.brightness !== undefined) bulbState.brightness = toBulbLevel(Number(bulbState.brightness));

        let bulbValue = value;
        if (key in message) bulbValue = message[key];
        if (key === "brightness_percent") bulbValue = message.brightness;

        const result = await converter.convertSet(entity, key, bulbValue, {...meta, message, state: bulbState});
        if (result && result.state?.brightness !== undefined) {
            result.state.brightness = fromBulbLevel(Number(result.state.brightness));
        }
        return result;
    },
});

const fzBrightness: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
    ...fz.brightness,
    convert: (model, msg, publish, options, meta) => {
        const result = fz.brightness.convert(model, msg, publish, options, meta) as KeyValueAny;
        if (result) {
            for (const k of Object.keys(result)) {
                if (k.startsWith("brightness") && typeof result[k] === "number") result[k] = fromBulbLevel(result[k]);
            }
        }
        return result;
    },
};

const vibrantLight = (args: m.LightArgs): ModernExtend => {
    const extend = m.light(args);
    const scaled = new Map<Tz.Converter, Tz.Converter>([
        [tz.light_onoff_brightness, scaledToZigbee(tz.light_onoff_brightness)],
        [tz.light_brightness_step, scaledToZigbee(tz.light_brightness_step)],
        [tz.light_brightness_move, scaledToZigbee(tz.light_brightness_move)],
    ]);
    extend.toZigbee = extend.toZigbee.map((c) => scaled.get(c) ?? c);
    extend.fromZigbee = extend.fromZigbee.map((c) => (c === fz.brightness ? fzBrightness : c));
    return extend;
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["C4-VB-FTW-A19"],
        model: "VB-FTW-A19",
        vendor: "Control4",
        description: "Vibrant Fully Tunable White A19 Lamp",
        extend: [m.identify(), vibrantLight({colorTemp: {range: [153, 555]}})],
        ota: true,
    },
    {
        zigbeeModel: ["C4-VB-RGBTW-A19"],
        model: "VB-RGBTW-A19",
        vendor: "Control4",
        description: "Vibrant RGB Tunable White A19 Lamp",
        extend: [m.identify(), vibrantLight({colorTemp: {range: [153, 555]}, color: {modes: ["xy"]}})],
        ota: true,
    },
];
