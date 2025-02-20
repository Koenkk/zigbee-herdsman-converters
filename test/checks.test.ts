import baseDefinitions from '../src/devices/index';
import {Definition, prepareDefinition} from '../src/index';
import {access, Numeric} from '../src/lib/exposes';
import * as sunricher from '../src/lib/sunricher';
import {tz} from '../src/lib/tuya';
import {COLORTEMP_RANGE_MISSING_ALLOWED} from './colortemp_range_missing_allowed';

describe('Check definitions', () => {
    const definitions: Definition[] = [];

    beforeAll(() => {
        for (const def of baseDefinitions) {
            definitions.push(
                prepareDefinition(
                    // @ts-expect-error inferred type is wrong
                    def,
                ),
            );
        }
    });

    it('Exposes access matches toZigbee', () => {
        for (const definition of definitions) {
            // tuya.tz.datapoints is generic, keys cannot be used to determine expose access
            if (definition.toZigbee.includes(tz.datapoints)) return;

            // sunricher.tz.setModel is used to switch modelId for devices with conflicting modelId, skip expose access check
            if (definition.toZigbee.includes(sunricher.tz.setModel)) return;

            const toCheck = [];
            const exposes = typeof definition.exposes == 'function' ? definition.exposes(undefined, undefined) : definition.exposes;

            for (const expose of exposes) {
                if (expose.access !== undefined) {
                    toCheck.push(expose);
                } else if (expose.features) {
                    toCheck.push(...expose.features.filter((e) => e.access !== undefined));
                }
            }

            for (const expose of toCheck) {
                let property = expose.property;

                if (expose.endpoint && expose.property.length > expose.endpoint.length) {
                    property = expose.property.slice(0, (expose.endpoint.length + 1) * -1);
                }

                const toZigbee = definition.toZigbee.find(
                    (item) => item.key.includes(property) && (!item.endpoints || (expose.endpoint && item.endpoints.includes(expose.endpoint))),
                );

                if ((expose.access & access.SET) != (toZigbee && toZigbee.convertSet ? access.SET : 0)) {
                    throw new Error(`${definition.model} - ${property}, supports set: ${!!(toZigbee && toZigbee.convertSet)}`);
                }

                if ((expose.access & access.GET) != (toZigbee && toZigbee.convertGet ? access.GET : 0)) {
                    throw new Error(`${definition.model} - ${property} (${expose.name}), supports get: ${!!(toZigbee && toZigbee.convertGet)}`);
                }
            }
        }
    });

    it('Exposes properties are unique', () => {
        for (const definition of definitions) {
            const exposes = typeof definition.exposes == 'function' ? definition.exposes(undefined, undefined) : definition.exposes;
            const found: string[] = [];

            for (const expose of exposes) {
                if (expose.property && found.includes(expose.property)) {
                    throw new Error(`Duplicate expose property found: '${expose.property}' for '${definition.model}'`);
                }

                found.push(expose.property);
            }
        }
    });

    it('Check if all exposes have a color temp range', () => {
        for (const definition of definitions) {
            const exposes = typeof definition.exposes == 'function' ? definition.exposes(undefined, undefined) : definition.exposes;

            for (const expose of exposes.filter((e) => e.type === 'light')) {
                const colorTemp = expose.features.find((f) => f.name === 'color_temp');

                if (
                    colorTemp &&
                    // @ts-expect-error test-only
                    !colorTemp._colorTempRangeProvided &&
                    !COLORTEMP_RANGE_MISSING_ALLOWED.includes(definition.model)
                ) {
                    throw new Error(
                        `'${definition.model}' is missing color temp range, see https://github.com/Koenkk/zigbee2mqtt.io/blob/develop/docs/how_tos/how_to_support_new_devices.md#31-retrieving-color-temperature-range-only-required-for-lights-which-support-color-temperature`,
                    );
                }
            }
        }
    });

    it('Number exposes with set access should have a range', () => {
        for (const definition of definitions) {
            if (definition.exposes) {
                const exposes = typeof definition.exposes == 'function' ? definition.exposes(undefined, undefined) : definition.exposes;

                for (const expose of exposes) {
                    if (expose.type == 'numeric' && expose.access & access.SET) {
                        assert(expose instanceof Numeric);

                        if (expose.value_min == undefined || expose.value_max == undefined) {
                            throw new Error(`Value min or max unknown for ${expose.property}`);
                        }
                    }
                }
            }
        }
    });
});
