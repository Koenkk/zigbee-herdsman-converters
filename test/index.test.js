import {access as _access, enum as _enum, list as _list} from '../src/lib/exposes';
import * as sunricher from '../src/lib/sunricher';
import {tz} from '../src/lib/tuya';
import {COLORTEMP_RANGE_MISSING_ALLOWED} from './colortemp_range_missing_allowed';

describe('index.js', () => {
    it('Exposes access matches toZigbee', () => {
        definitions.forEach((device) => {
            // tuya.tz.datapoints is generic, keys cannot be used to determine expose access
            if (device.toZigbee.includes(tz.datapoints)) return;

            // sunricher.tz.setModel is used to switch modelId for devices with conflicting modelId, skip expose access check
            if (device.toZigbee.includes(sunricher.tz.setModel)) return;

            const toCheck = [];
            const expss = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
            for (const expose of expss) {
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

                const toZigbee = device.toZigbee.find(
                    (item) => item.key.includes(property) && (!item.endpoints || (expose.endpoint && item.endpoints.includes(expose.endpoint))),
                );

                if ((expose.access & _access.SET) != (toZigbee && toZigbee.convertSet ? _access.SET : 0)) {
                    throw new Error(`${device.model} - ${property}, supports set: ${!!(toZigbee && toZigbee.convertSet)}`);
                }

                if ((expose.access & _access.GET) != (toZigbee && toZigbee.convertGet ? _access.GET : 0)) {
                    throw new Error(`${device.model} - ${property} (${expose.name}), supports get: ${!!(toZigbee && toZigbee.convertGet)}`);
                }
            }
        });
    });

    it('Exposes properties are unique', () => {
        definitions.forEach((device) => {
            const exposes = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
            const found = [];
            for (const expose of exposes) {
                if (expose.property && found.includes(expose.property)) {
                    throw new Error(`Duplicate expose property found: '${expose.property}' for '${device.model}'`);
                }
                found.push(expose.property);
            }
        });
    });

    it('Check if all exposes have a color temp range', () => {
        for (const definition of definitions) {
            const exposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes();
            for (const expose of exposes.filter((e) => e.type === 'light')) {
                const colorTemp = expose.features.find((f) => f.name === 'color_temp');
                if (colorTemp && !colorTemp._colorTempRangeProvided && !COLORTEMP_RANGE_MISSING_ALLOWED.includes(definition.model)) {
                    throw new Error(
                        `'${definition.model}' is missing color temp range, see https://github.com/Koenkk/zigbee2mqtt.io/blob/develop/docs/how_tos/how_to_support_new_devices.md#31-retrieving-color-temperature-range-only-required-for-lights-which-support-color-temperature`,
                    );
                }
            }
        }
    });

    it('Number exposes with set access should have a range', () => {
        definitions.forEach((device) => {
            if (device.exposes) {
                const expss = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
                for (const expose of expss) {
                    if (expose.type == 'numeric' && expose.access & _access.SET) {
                        if (expose.value_min == null || expose.value_max == null) {
                            throw new Error(`Value min or max unknown for ${expose.property}`);
                        }
                    }
                }
            }
        });
    });
});
