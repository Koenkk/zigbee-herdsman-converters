import * as tz from "../converters/toZigbee";
import * as m from "../lib/modernExtend";
import type {Tz} from "../lib/types";
import {getTransition, replaceToZigbeeConvertersInArray} from "../lib/utils";
import type {DefinitionWithExtend} from "../lib/types";

const NS = "zhc:ribag";
const COLOR_TEMP_MIN = 153;
const COLOR_TEMP_MAX = 500;

/**
 * The Air O only accepts the short ZCL form of moveToColorTemp. In particular,
 * it rejects the optional optionsMask/optionsOverride fields that the generic
 * light converter currently adds.
 */

const ribagColorTemp: Tz.Converter = {
    key: ["color_temp", "color_temp_percent"],
    options: tz.light_colortemp.options,
    convertSet: async (entity, key, value, meta) => {
        const colorTempValue = key === "color_temp_percent" ? COLOR_TEMP_MIN + ((COLOR_TEMP_MAX - COLOR_TEMP_MIN) * Number(value)) / 100 : value;

        const colorTemp = Math.round(Number(colorTempValue));
        if (!Number.isFinite(colorTemp) || colorTemp < COLOR_TEMP_MIN || colorTemp > COLOR_TEMP_MAX) {
            throw new Error(`color_temp must be between ${COLOR_TEMP_MIN} and ${COLOR_TEMP_MAX}`);
        }

        await entity.command("lightingColorCtrl", "moveToColorTemp", {colortemp: colorTemp, transtime: getTransition(entity, key, meta).time});

        return {state: {color_mode: "color_temp", color_temp: colorTemp}};
    },
    convertGet: async (entity) => {
        await entity.read("lightingColorCtrl", ["colorMode", "colorTemperature"]);
    },
};

const ribagLight = () => {
    const extension = m.light({colorTemp: {range: [COLOR_TEMP_MIN, COLOR_TEMP_MAX]}});
    extension.toZigbee = replaceToZigbeeConvertersInArray(extension.toZigbee ?? [], [tz.light_colortemp], [ribagColorTemp]);
    return extension;
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Ribag Air O"],
        model: "Ribag Air O",
        vendor: "RIBAG Licht",
        description: "RIBAG Vertico Air Pendelleuchte",
        extend: [ribagLight()],
    },
];
