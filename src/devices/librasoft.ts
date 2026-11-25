import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const visspointChannels = ["1", "2", "3", "4"];
/** On Time of On With Timed Off is a 16-bit value in tenths of a second */
const onTimeMax = 6553;
/** Extra time before the relay state is read back after a pulse */
const pulseReadDelay = 2000;

/** Device meta key holding the pulse times per channel, e.g. {"1": 0.5} */
const triggerMetaKey = "visspointTrigger";

/**
 * Pulse time of a channel. It is kept in the device meta (database) rather than in the published state,
 * so storing it does not depend on the `optimistic` option. The published state is the fallback for
 * values stored before.
 */
function getTrigger(device: Zh.Device | undefined, state: KeyValueAny, endpointName: string): number {
    const stored = (device?.meta?.[triggerMetaKey] as KeyValueAny | undefined)?.[endpointName];
    return Number(stored ?? state[`trigger_${endpointName}`] ?? 0);
}

function parseTrigger(value: unknown): number {
    const seconds = utils.isNumber(value) ? value : utils.isString(value) && value.trim() !== "" ? Number(value) : Number.NaN;
    // 0 switches pulses off; anything between 0 and 0.1 s would round to 0 and turn a pulse into a permanent ON
    if (!Number.isFinite(seconds) || (seconds !== 0 && (seconds < 0.1 || seconds > onTimeMax))) {
        throw new Error(`trigger must be 0 (plain switching) or a number of seconds from 0.1 to ${onTimeMax}, got '${value}'`);
    }
    return Math.round(seconds * 10) / 10;
}

const tzLocal = {
    /** Stores the pulse time of a channel; nothing is sent to the device. */
    visspoint_trigger: {
        key: ["trigger"],
        endpoints: visspointChannels,
        convertSet: (entity, key, value, meta) => {
            const seconds = parseTrigger(value);
            if (meta.device) {
                meta.device.meta[triggerMetaKey] = {...(meta.device.meta[triggerMetaKey] as KeyValueAny), [meta.endpoint_name]: seconds};
                meta.device.save();
            }
            return {state: {trigger: seconds}};
        },
    } satisfies Tz.Converter,
    /**
     * Plain on_off, except that ON without an explicit on_time is sent as On With Timed Off
     * when a pulse time is stored for the channel.
     */
    visspoint_on_off: {
        ...tz.on_off,
        endpoints: visspointChannels,
        convertSet: async (entity, key, value, meta) => {
            const on = utils.isString(meta.message.state) && meta.message.state.toLowerCase() === "on";
            const seconds = getTrigger(meta.device, meta.state, meta.endpoint_name);
            let message = meta.message;
            if (on && seconds > 0 && message.on_time == null && message.off_wait_time == null) {
                message = {...message, on_time: seconds};
            }
            const result = await tz.on_off.convertSet(entity, key, value, {...meta, message});
            // The end of a pulse is only known from the device's report; read the state back in case it was lost.
            // A failed command throws above and leaves the read-back of a running pulse in place.
            clearTimeout(globalStore.getValue(entity, "pulseReadTimer"));
            globalStore.clearValue(entity, "pulseReadTimer");
            const onTime = Number(message.on_time ?? 0);
            if (on && onTime > 0 && utils.isEndpoint(entity)) {
                const timer = setTimeout(() => entity.read("genOnOff", ["onOff"]).catch(() => {}), onTime * 1000 + pulseReadDelay);
                globalStore.putValue(entity, "pulseReadTimer", timer);
            }
            return result;
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    /** Publishes the stored pulse time (0 by default) whenever the published state does not show it. */
    visspoint_trigger_default: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const property = utils.postfixWithEndpointName("trigger", msg, model, meta);
            const seconds = getTrigger(meta.device, meta.state, String(utils.getEndpointName(msg, model, meta)));
            return meta.state[property] === seconds ? {} : {[property]: seconds};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
};

const visspointTrigger = (): ModernExtend => ({
    isModernExtend: true,
    toZigbee: [tzLocal.visspoint_trigger],
    fromZigbee: [fzLocal.visspoint_trigger_default],
    exposes: visspointChannels.map((ep) =>
        e
            .numeric("trigger", ea.STATE_SET)
            .withEndpoint(ep)
            .withLabel("Trigger")
            .withUnit("s")
            .withValueMin(0)
            .withValueMax(onTimeMax)
            .withValueStep(0.1)
            .withDescription(
                "Pulse time: turning the relay ON switches it off again after this many seconds. " +
                    "0 = plain switching (ON holds until OFF). Changing the value only stores it, nothing is switched.",
            ),
    ),
});

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["visspoint-io4"],
        model: "visspoint-io4",
        vendor: "LibraSoft",
        description: "I/O module with 4 relays and 4 dry contact inputs",
        toZigbee: [tzLocal.visspoint_on_off],
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2, 3: 3, 4: 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: visspointChannels}),
            visspointTrigger(),
            ...visspointChannels.map((ep) =>
                m.binary({
                    name: "input",
                    cluster: "genBinaryInput",
                    attribute: "presentValue",
                    valueOn: [true, 1],
                    valueOff: [false, 0],
                    access: "STATE_GET",
                    endpointName: ep,
                    description: "Dry contact input: true = contact closed",
                }),
            ),
        ],
    },
];
