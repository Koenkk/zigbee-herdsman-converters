import assert from "node:assert";
import {beforeAll, describe, it} from "vitest";
import baseDefinitions from "../src/devices/index";
import {type Definition, type Expose, prepareDefinition} from "../src/index";
import {access, Numeric} from "../src/lib/exposes";
import * as sunricher from "../src/lib/sunricher";
import {tz} from "../src/lib/tuya";
import {COLORTEMP_RANGE_MISSING_ALLOWED} from "./colortemp_range_missing_allowed";

describe("Check definitions", () => {
    const definitions: Definition[] = [];

    function definitionExposes(definition: Definition): Expose[] {
        return typeof definition.exposes === "function" ? definition.exposes({isDummyDevice: true}, {}) : definition.exposes;
    }

    function iterateExposes(exposes: Expose[], fn: (expose: Expose) => void): number {
        let count = 0;

        for (const expose of exposes) {
            count++;

            fn(expose);

            if (expose.features) {
                iterateExposes(expose.features, fn);
            }

            if ("item_type" in expose && expose.item_type.features) {
                iterateExposes(expose.item_type.features, fn);
            }
        }

        return count;
    }

    beforeAll(() => {
        for (const def of baseDefinitions) {
            definitions.push(prepareDefinition(def));
        }
    });

    it("Exposes access matches toZigbee", () => {
        for (const definition of definitions) {
            // tuya.tz.datapoints is generic, keys cannot be used to determine expose access
            if (definition.toZigbee.includes(tz.datapoints)) return;

            // sunricher.tz.setModel is used to switch modelId for devices with conflicting modelId, skip expose access check
            if (definition.toZigbee.includes(sunricher.tz.setModel)) return;

            const toCheck = [];
            const exposes = definitionExposes(definition);

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

                if ((expose.access & access.SET) !== (toZigbee?.convertSet ? access.SET : 0)) {
                    throw new Error(`${definition.model} - ${property}, supports set: ${!!(toZigbee?.convertSet)}`);
                }

                if ((expose.access & access.GET) !== (toZigbee?.convertGet ? access.GET : 0)) {
                    throw new Error(`${definition.model} - ${property} (${expose.name}), supports get: ${!!(toZigbee?.convertGet)}`);
                }
            }
        }
    });

    it("Exposes properties are unique", () => {
        for (const definition of definitions) {
            const exposes = definitionExposes(definition);
            const found: string[] = [];

            for (const expose of exposes) {
                if (expose.property && found.includes(expose.property)) {
                    throw new Error(`Duplicate expose property found: '${expose.property}' for '${definition.model}'`);
                }

                found.push(expose.property);
            }
        }
    });

    it("Model should be unique", () => {
        const models = new Set<string>();
        for (const definition of definitions) {
            assert(!models.has(definition.model), `Duplicate model ${definition.model}`);
            models.add(definition.model);

            if (definition.whiteLabel) {
                for (const whiteLabel of definition.whiteLabel) {
                    // Only consider the ones with `fingerprint`, otherwise they cannot be detected anyway.
                    if ("fingerprint" in whiteLabel) {
                        assert(!models.has(whiteLabel.model), `Duplicate model ${whiteLabel.model}`);
                        models.add(whiteLabel.model);
                    }
                }
            }
        }
    });

    it("Check if all exposes have a color temp range", () => {
        for (const definition of definitions) {
            const exposes = definitionExposes(definition);

            for (const expose of exposes.filter((e) => e.type === "light")) {
                const colorTemp = expose.features.find((f) => f.name === "color_temp");

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

    it("Number exposes with set access should have a range", () => {
        for (const definition of definitions) {
            if (definition.exposes) {
                const exposes = definitionExposes(definition);

                for (const expose of exposes) {
                    if (expose.type === "numeric" && expose.access & access.SET) {
                        assert(expose instanceof Numeric);

                        if (expose.value_min === undefined || expose.value_max === undefined) {
                            throw new Error(`Value min or max unknown for ${expose.property}`);
                        }
                    }
                }
            }
        }
    });

    it("respect snake case naming conventions for exposes and options", () => {
        const SNAKE_CASE_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
        /** @deprecated 3.0 (change will break cache) */
        const IGNORE_CASE_LIST = [
            "BTicino|K4003C/L4003C/N4003C/NT4003C",
            "BTicino|4411C/L4411C/N4411C/NT4411C",
            "BTicino|F20T60A",
            "BTicino|L4531C",
            "EFEKTA|EFEKTA_T1_NTC10K",
            "EFEKTA|EFEKTA_T1_POW_NTC10K",
            "EFEKTA|EFEKTA_PS_POW_PRO",
            "Efektalab|Netuya_CO2_Smart_Box",
            "EFEKTA|EFEKTA_eAir_Monitor",
            "Inovelli|VZM30-SN",
            "Inovelli|VZM31-SN",
            "Inovelli|VZM32-SN",
            "Inovelli|VZM35-SN",
            "Inovelli|VZM36",
            "Legrand|412173",
            "Legrand|412171",
            "Legrand|412170",
            "Legrand|067776",
            "Legrand|067776_inverted",
            "Legrand|067776A",
            "Legrand|067771",
            "Legrand|199182",
            "Legrand|067775/741811",
            "Legrand|064888",
            "Legrand|412175",
            "Legrand|412015",
            "Legrand|067772",
            "Legrand|WNRR15/WNRR20",
            "Legrand|WNAL50/WNRL50",
            "Legrand|067766",
            "Legrand|067797",
            "Legrand|281506",
            "LiXee|ZLinky_TIC",
            "LiXee|ZiPulses",
            "LYTKO|L101Ze-DBN",
            "LYTKO|L101Ze-SBN",
            "Aqara|TH-S04D",
            "Schneider Electric|MEG5779",
            "Slacky-DIY|THERM_SLACKY_DIY_R01",
            "Slacky-DIY|THERM_SLACKY_DIY_R01",
            "Slacky-DIY|THERM_SLACKY_DIY_R02",
            "Slacky-DIY|THERM_SLACKY_DIY_R02",
            "Slacky-DIY|THERM_SLACKY_DIY_R03",
            "Slacky-DIY|THERM_SLACKY_DIY_R03",
            "Slacky-DIY|THERM_SLACKY_DIY_R04",
            "Slacky-DIY|THERM_SLACKY_DIY_R04",
            "Slacky-DIY|THERM_SLACKY_DIY_R05",
            "Slacky-DIY|THERM_SLACKY_DIY_R05",
            "Slacky-DIY|THERM_SLACKY_DIY_R06",
            "Slacky-DIY|THERM_SLACKY_DIY_R06",
            "Slacky-DIY|THERM_SLACKY_DIY_R07",
            "Slacky-DIY|THERM_SLACKY_DIY_R07",
            "Slacky-DIY|THERM_SLACKY_DIY_R08",
            "Slacky-DIY|THERM_SLACKY_DIY_R08",
            "Slacky-DIY|THERM_SLACKY_DIY_R09",
            "Slacky-DIY|THERM_SLACKY_DIY_R09",
            "Slacky-DIY|THERM_SLACKY_DIY_R0A",
            "Slacky-DIY|THERM_SLACKY_DIY_R0A",
            "Slacky-DIY|THERM_SLACKY_DIY_R0B",
            "Slacky-DIY|THERM_SLACKY_DIY_R0B",
            "Slacky-DIY|THERM_SLACKY_DIY_R0C",
            "Slacky-DIY|THERM_SLACKY_DIY_R0C",
            "Tuya|SPM02",
            "Ubisys|H1",
            "Ubisys|H1",
            "Viessmann|ZK03840",
            "Viessmann|ZK03840",
            "YOKIS|MTR500E-UP",
            "YOKIS|MTR1300E-UP",
            "YOKIS|MTR2000E-UP",
            "YOKIS|MTV300E-UP",
            "YOKIS|MVR500E-UP",
            "YOKIS|TLC1-UP",
            "YOKIS|TLM1-UP",
            "YOKIS|TLM2-UP",
            "YOKIS|TLM4-UP",
            "YOKIS|GALET4-UP",
        ];
        const ignoredList = new Set<string>();
        const badList = new Set<string>();
        let exposesCount = 0;
        let optionsCount = 0;

        for (const definition of definitions) {
            const ignored = IGNORE_CASE_LIST.includes(`${definition.vendor}|${definition.model}`);

            if (definition.exposes) {
                const exposes = definitionExposes(definition);

                exposesCount += iterateExposes(exposes, (expose) => {
                    if (expose.name) {
                        if (!SNAKE_CASE_RE.test(expose.name)) {
                            if (ignored) {
                                ignoredList.add(`${definition.vendor}|${definition.model}|expose.name=${expose.name}`);
                            } else {
                                badList.add(`${definition.vendor}|${definition.model}|expose.name=${expose.name}`);
                            }
                        }
                    }

                    if (expose.property) {
                        if (!SNAKE_CASE_RE.test(expose.property)) {
                            if (ignored) {
                                ignoredList.add(`${definition.vendor}|${definition.model}|expose.name=${expose.property}`);
                            } else {
                                badList.add(`${definition.vendor}|${definition.model}|expose.name=${expose.property}`);
                            }
                        }
                    }
                });
            }

            if (definition.options) {
                optionsCount += iterateExposes(definition.options, (option) => {
                    if (option.name) {
                        if (!SNAKE_CASE_RE.test(option.name)) {
                            if (ignored) {
                                ignoredList.add(`${definition.vendor}|${definition.model}|option.name=${option.name}`);
                            } else {
                                badList.add(`${definition.vendor}|${definition.model}|option.name=${option.name}`);
                            }
                        }
                    }

                    if (option.property) {
                        if (!SNAKE_CASE_RE.test(option.property)) {
                            if (ignored) {
                                ignoredList.add(`${definition.vendor}|${definition.model}|option.name=${option.property}`);
                            } else {
                                badList.add(`${definition.vendor}|${definition.model}|option.name=${option.property}`);
                            }
                        }
                    }
                });
            }
        }

        if (badList.size > 0) {
            let lines = "Definitions not using snake case for expose/option:\n";

            for (const entry of badList) {
                lines += `${entry}\n`;
            }

            lines += `TOTAL: ${badList.size} out of ${exposesCount + optionsCount} (e=${exposesCount}, o=${optionsCount})`;

            throw new Error(lines);
        }

        if (ignoredList.size > 0) {
            let lines = "Definitions currently ignored (3.0 breaking change) not using snake case for expose/option:\n";

            for (const entry of ignoredList) {
                lines += `${entry}\n`;
            }

            lines += `TOTAL: ${ignoredList.size} out of ${exposesCount + optionsCount} (e=${exposesCount}, o=${optionsCount})`;

            console.log(lines);
        }
    });
});
