import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

type GlydeaTarget = number | "stop";

type GlydeaState = {
    /**
     * Expected final position in Zigbee2MQTT coordinates:
     * 0 = closed, 100 = open.
     *
     * "stop" means that an explicit stop command was sent.
     * undefined means that no Z2M command context is available.
     */
    target?: GlydeaTarget;

    /**
     * True after the device reports windowCoveringType=0.
     * This allows stale command context to be discarded when a later
     * movement starts outside Zigbee2MQTT.
     */
    stopped: boolean;
};

const glydeaStateKey = "glydea_position_state";

function getGlydeaState(endpoint: Zh.Endpoint): GlydeaState {
    return globalStore.getValue(endpoint, glydeaStateKey, {
        stopped: false,
    });
}

function saveGlydeaState(endpoint: Zh.Endpoint, state: GlydeaState): void {
    globalStore.putValue(endpoint, glydeaStateKey, state);
}

function getGlydeaEndpoints(entity: Zh.Endpoint | Zh.Group): Zh.Endpoint[] {
    return utils.isEndpoint(entity) ? [entity] : entity.members;
}

function setGlydeaTarget(entity: Zh.Endpoint | Zh.Group, target: GlydeaTarget): void {
    for (const endpoint of getGlydeaEndpoints(entity)) {
        const state = getGlydeaState(endpoint);

        state.target = target;
        state.stopped = false;

        saveGlydeaState(endpoint, state);
    }
}

function clearGlydeaTarget(entity: Zh.Endpoint | Zh.Group): void {
    for (const endpoint of getGlydeaEndpoints(entity)) {
        const state = getGlydeaState(endpoint);

        delete state.target;

        saveGlydeaState(endpoint, state);
    }
}

const fzLocal = {
    glydeaPosition: {
        ...fz.cover_position_tilt,

        convert: (model, msg, publish, options, meta) => {
            const converted = fz.cover_position_tilt.convert(model, msg, publish, options, meta) as KeyValueAny | undefined;

            /*
             * An explicit read is authoritative. It is not part of the
             * faulty movement-stop reporting sequence.
             */
            if (msg.type === "readResponse") {
                return converted;
            }

            const state = getGlydeaState(msg.endpoint);

            const coveringType = msg.data.windowCoveringType;

            if (coveringType !== undefined) {
                const moving = coveringType !== 0;

                if (moving) {
                    /*
                     * When a new movement starts after the preceding
                     * operation stopped, and no new Z2M command replaced
                     * the state, treat it as externally initiated.
                     */
                    if (state.stopped) {
                        delete state.target;
                    }

                    state.stopped = false;
                } else {
                    state.stopped = true;
                }

                saveGlydeaState(msg.endpoint, state);
            }

            const rawPosition = msg.data.currentPositionLiftPercentage;

            /*
             * Only raw zero is affected by the Glydea bug.
             * All normal position reports pass through unchanged.
             */
            if (rawPosition !== 0) {
                return converted;
            }

            /*
             * Without command context it is impossible to distinguish
             * a real raw-zero endpoint from the device's faulty raw-zero
             * report. Preserve standard Z2M behaviour in that case.
             */
            if (state.target === undefined) {
                return converted;
            }

            const convertedPosition = converted?.position;

            /*
             * A zero after STOP is always spurious.
             *
             * For OPEN, CLOSE and exact-position commands, compare with
             * the expected position in exposed Z2M coordinates.
             *
             * convertedPosition was produced by the standard converter,
             * so options such as invert_cover have already been applied.
             */
            const spurious = state.target === "stop" || convertedPosition !== state.target;

            delete state.target;

            saveGlydeaState(msg.endpoint, state);

            return spurious ? {} : converted;
        },
    } satisfies Fz.Converter<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    glydeaCoverState: {
        ...tz.cover_state,

        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, key);

            const normalized = value.toLowerCase();

            let target: GlydeaTarget | undefined;

            switch (normalized) {
                case "open":
                case "on":
                    target = 100;
                    break;

                case "close":
                case "off":
                    target = 0;
                    break;

                case "stop":
                    target = "stop";
                    break;
            }

            if (target !== undefined) {
                setGlydeaTarget(entity, target);
            }

            const convertSet = tz.cover_state.convertSet;

            if (convertSet === undefined) {
                throw new Error("cover_state converter does not support convertSet");
            }

            try {
                return await convertSet(entity, key, value, meta);
            } catch (error) {
                if (target !== undefined) {
                    clearGlydeaTarget(entity);
                }

                throw error;
            }
        },
    } satisfies Tz.Converter,

    glydeaCoverPositionTilt: {
        ...tz.cover_position_tilt,

        convertSet: async (entity, key, value, meta) => {
            const tracksPosition = key === "position";

            if (tracksPosition) {
                utils.assertNumber(value, key);

                setGlydeaTarget(entity, value);
            }

            const convertSet = tz.cover_position_tilt.convertSet;

            if (convertSet === undefined) {
                throw new Error("cover_position_tilt converter does not support convertSet");
            }

            try {
                return await convertSet(entity, key, value, meta);
            } catch (error) {
                if (tracksPosition) {
                    clearGlydeaTarget(entity);
                }

                throw error;
            }
        },
    } satisfies Tz.Converter,
};

const glydeaWindowCovering = m.windowCovering({
    controls: ["lift"],
});

glydeaWindowCovering.fromZigbee = [fzLocal.glydeaPosition];

glydeaWindowCovering.toZigbee = [tzLocal.glydeaCoverState, tzLocal.glydeaCoverPositionTilt];

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Tilt Only 50 WF TiltOnly"],
        model: "1245600",
        vendor: "Somfy",
        description: "Tilt only 50 WF (tilt only)",
        extend: [m.windowCovering({controls: ["tilt"]}), m.battery()],
    },
    {
        zigbeeModel: ["Sonesse 28 WF Li-Ion Roller", "Sonesse 28 WF Roller", "Sonesse 28 WF Li-Ion Zebra"],
        model: "1241755",
        vendor: "Somfy",
        description: "Sonesse 28 WF Li-Ion roller shades",
        extend: [m.battery(), m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Sonesse 28 WF Zebra"],
        model: "1241754",
        vendor: "Somfy",
        description: "Sonesse 28 WF roller shades (external battery)",
        extend: [m.windowCovering({controls: ["lift"]}), m.battery()],
    },
    {
        zigbeeModel: ["Sonesse2 28 WF Roller"],
        model: "1003296",
        vendor: "Somfy",
        description: "Sonesse2 28 WF roller shades",
        extend: [m.battery(), m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Sonesse2 28 WF Li-Ion Roller"],
        model: "1245943",
        vendor: "Somfy",
        description: "Sonesse2 28 WF Li-Ion roller shades",
        extend: [m.battery(), m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Sonesse Ultra 30 WF Li-Ion Rolle", "Sonesse2 ULTRA 30 WF Li-ion Roll"],
        model: "SOMFY-1241752",
        vendor: "Somfy",
        description: "Blinds",
        extend: [m.windowCovering({controls: ["lift"]}), m.battery()],
    },
    {
        zigbeeModel: ["Roll Up 24 WF Li-ion Roller"],
        model: "1246037",
        vendor: "Somfy",
        description: "Blinds",
        extend: [m.windowCovering({controls: ["lift"]}), m.battery()],
    },
    {
        zigbeeModel: ["Sonesse 30 DC 24V Roller"],
        model: "1241970",
        vendor: "Somfy",
        description: "Sonesse 30 DC 24V roller shades",
        extend: [m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Sonesse2 40 Zigbee Roller"],
        model: "1245920",
        vendor: "Somfy",
        description: "Sonesse2 40 Zigbee roller shades",
        extend: [m.windowCovering({controls: ["lift"]})],
    },
    {
        zigbeeModel: ["Ysia 5 HP Zigbee"],
        model: "1871154",
        vendor: "Somfy",
        description: "Ysia 5 channel blinds remote",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "232": 232}}),
            m.battery(),
            m.commandsOnOff({endpointNames: ["1", "2", "3", "4", "5"]}),
            m.commandsWindowCovering({endpointNames: ["1", "2", "3", "4", "5"]}),
        ],
    },
    {
        zigbeeModel: ["Ysia 1 Zigbee Europe", "Ysia 1 HP Zigbee"],
        model: "1871157",
        vendor: "Somfy",
        description: "Ysia 1 channel blinds remote",
        whiteLabel: [{vendor: "Somfy", model: "5163664A"}],
        extend: [m.battery(), m.commandsOnOff(), m.commandsWindowCovering()],
    },
    {
        zigbeeModel: ["1822647"],
        model: "1822647A",
        vendor: "Somfy",
        description: "Zigbee smart plug",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(12);
            await reporting.bind(ep, coordinatorEndpoint, ["genBasic", "genIdentify", "genOnOff", "seMetering"]);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            await reporting.currentSummReceived(ep);
        },
    },
    {
        zigbeeModel: ["1811680"],
        model: "1811680",
        vendor: "Somfy",
        description: "Zigbee opening sensor",
        extend: [m.identify(), m.iasZoneAlarm({zoneType: "generic", zoneAttributes: ["alarm_1", "battery_low"]}), m.battery()],
    },
    {
        zigbeeModel: ["1811681"],
        model: "1811681",
        vendor: "Somfy",
        description: "Zigbee motion sensor",
        extend: [m.identify(), m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "battery_low"]}), m.battery()],
    },
    {
        zigbeeModel: ["Glydea Ultra Curtain"],
        model: "9028412A",
        vendor: "Somfy",
        description: "Glydea Curtain motor Zigbee module",
        extend: [glydeaWindowCovering],
    },
    {
        zigbeeModel: ["Tilt & Lift 25 WF Roller"],
        model: "1245602",
        vendor: "Somfy",
        description: "Tilt and lift blinds motor",
        extend: [m.windowCovering({controls: ["lift", "tilt"]}), m.battery(), m.identify()],
    },
    {
        zigbeeModel: ["1871215B"],
        model: "1871215B",
        vendor: "Somfy",
        description: "Connected plug E type with power monitoring",
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["Situo 1 Zigbee"],
        model: "1800194",
        vendor: "Somfy",
        description: "Situo 1 channel blinds remote",
        extend: [m.battery(), m.commandsOnOff(), m.commandsWindowCovering()],
    },
    {
        zigbeeModel: ["Situo 4 Zigbee"],
        model: "1800195",
        vendor: "Somfy",
        description: "Situo 4 channel blinds remote",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "232": 232}}),
            m.battery(),
            m.commandsOnOff({endpointNames: ["1", "2", "3", "4"]}),
            m.commandsWindowCovering({endpointNames: ["1", "2", "3", "4"]}),
        ],
    },
    {
        zigbeeModel: ["Sonesse2 40 WF Li-ion Roller"],
        model: "1245993",
        vendor: "Somfy",
        description: "Sonesse 40 WireFree Zigbee Li-ion USB-C roller shade",
        extend: [m.windowCovering({controls: ["lift"]}), m.battery()],
    },
];
