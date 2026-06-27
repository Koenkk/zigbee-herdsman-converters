import * as m from 'zigbee-herdsman-converters/lib/modernExtend';
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
            zigbeeModel: ['TS0601'],
            model: 'TS0601',
            vendor: '_TZE28C1000000_alh14edn',
            description: 'Automatically generated definition',
            extend: [m.battery()],
    },
];
