import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as adurosmart from "../lib/adurosmart";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
    zigbeeModel: ['AD-RGBWH3001'],
    model: 'AD-RGBWH3001',
    vendor: 'ERIA',
    description: 'Automatically generated definition',
    extend: [m.light({"colorTemp":{"range":[153,500]},"color":{"modes":["xy","hs"],"enhancedHue":true}})],
    },
];
