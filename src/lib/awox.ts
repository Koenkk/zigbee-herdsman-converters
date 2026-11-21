import * as tz from "../converters/toZigbee";
import * as exposes from "./exposes";
import * as globalStore from "./store";
import type {KeyValue, KeyValueAny, ModernExtend, Tz, Zh} from "./types";
import * as utils from "./utils";

// The firmware merges or drops commands that arrive too quickly after each other.
const STEP_DELAY_MS = 250;
// Pause between the color and the level command.
const COLOR_LEVEL_DELAY_MS = 100;
// meta.state keeps showing a light as ON for a moment after OFF was sent (it is updated when convertSet returns).
const OFF_GRACE_MS = 3000;

const COMMAND_ID = "ebf_command_id";
const FADE = "ebf_fade";
const OFF_AT = "ebf_off_at";
const INTENT = "ebf_intent";
// What the user asked for, in groups: a newer message that sets none of a group's keys takes that group over.
const INTENT_GROUPS = [["state"], ["brightness", "brightness_percent"], ["color", "color_temp", "color_temp_percent"]];

interface Fade {
    out: boolean;
    level: number;
}

const withMessage = (meta: Tz.Meta, message: KeyValue): Tz.Meta => ({...meta, message});
const clampLevel = (level: number) => Math.min(254, Math.max(1, Math.round(level)));

// A command that a newer one cuts short has not applied its color or level yet (Home Assistant sends them as separate messages),
// so the newer command carries on with whatever it does not set itself.
const inheritIntent = (entity: Zh.Endpoint | Zh.Group, message: KeyValueAny): KeyValueAny => {
    const unfinished = globalStore.getValue(entity, INTENT) as KeyValueAny | undefined;
    const merged = {...message};
    for (const group of INTENT_GROUPS) {
        if (unfinished && !group.some((key) => message[key] !== undefined)) {
            for (const key of group) if (unfinished[key] !== undefined) merged[key] = unfinished[key];
        }
    }
    const intent = Object.fromEntries(INTENT_GROUPS.flat().flatMap((key) => (merged[key] !== undefined ? [[key, merged[key]]] : [])));
    globalStore.putValue(entity, INTENT, intent);
    return merged;
};

/**
 * One set request for the EBF_RGB_Zm light (white ring and RGB strip).
 *
 * The two parts share one on/off state but keep separate levels, and the part that lights is decided by the order of the
 * commands. A color change is therefore sent as OFF, color, level, and OFF always parks the level at 1 so the next turn on
 * never starts at an old level. A transition to OFF is a ramp to level 1 followed by OFF, because the firmware ends a
 * transition to 0 with the light on at level 1 (zigbee2mqtt#31956).
 */
class LightCommand {
    private readonly commandId: number;
    private readonly runningFade: Fade | undefined;
    private readonly justOff: boolean;
    private readonly lit: boolean;
    private readonly currentLevel: number;
    private readonly transition: {time: number; specified: boolean};
    private readonly options: KeyValue;
    private readonly message: KeyValueAny;
    private readonly messageMeta: Tz.Meta;
    private readonly state: unknown;
    private readonly setsColor: boolean;
    private readonly colorTempKey: string | undefined;
    private readonly setsLevel: boolean;
    private readonly targetLevel: number;
    // A group is driven by unicasts to each member: a multicast took ~0.6 s per command and fades wobbled.
    private readonly targets: Zh.Endpoint[];

    constructor(
        private readonly entity: Zh.Endpoint | Zh.Group,
        private readonly key: string,
        private readonly value: unknown,
        private readonly meta: Tz.Meta,
    ) {
        this.commandId = (globalStore.getValue(entity, COMMAND_ID, 0) as number) + 1;
        globalStore.putValue(entity, COMMAND_ID, this.commandId);
        // meta.state is updated only after convertSet returns, so during a fade it still shows the old state.
        this.runningFade = globalStore.getValue(entity, FADE) as Fade | undefined;
        globalStore.clearValue(entity, FADE);
        this.justOff = Date.now() - (globalStore.getValue(entity, OFF_AT, 0) as number) < OFF_GRACE_MS;
        this.lit = this.runningFade !== undefined || (meta.state.state === "ON" && !this.justOff);
        this.currentLevel = this.runningFade?.level ?? Math.max(1, (meta.state.brightness as number | undefined) ?? 254);
        this.transition = utils.getTransition(entity, "brightness", meta);
        this.options = utils.getOptions(meta.mapped, entity);
        this.targets = utils.isGroup(entity) ? entity.members : [entity];

        let message: KeyValueAny = inheritIntent(entity, meta.message);
        let state = typeof message.state === "string" ? message.state.toLowerCase() : message.state;
        if (state === "toggle") {
            state = this.runningFade ? (this.runningFade.out ? "on" : "off") : this.lit ? "off" : "on";
            message = {...message, state};
        }
        // As in light_onoff_brightness, brightness 0 means off.
        if (Number(message.brightness ?? message.brightness_percent) === 0) state = "off";
        this.message = message;
        this.state = state;
        this.messageMeta = withMessage(meta, message);
        this.setsColor = message.color !== undefined;
        this.colorTempKey =
            message.color_temp !== undefined ? "color_temp" : message.color_temp_percent !== undefined ? "color_temp_percent" : undefined;
        this.setsLevel = state !== undefined || message.brightness !== undefined || message.brightness_percent !== undefined;
        this.targetLevel = clampLevel(
            message.brightness ??
                (message.brightness_percent !== undefined
                    ? Number(message.brightness_percent) * 2.54
                    : ((meta.state.brightness as number | undefined) ?? 254)),
        );
    }

    async run(): Promise<Tz.ConvertSetResult> {
        try {
            if (this.state === "off") return await this.handleOff();
            if (!this.setsColor && !this.colorTempKey) return await this.handleLevel();
            return await this.handleColor();
        } finally {
            // Done, or failed: nothing is left for a newer command to take over (unless it already has).
            if (!this.superseded()) globalStore.clearValue(this.entity, INTENT);
        }
    }

    // A newer command cancels a running ramp or sequence.
    private superseded() {
        return globalStore.getValue(this.entity, COMMAND_ID) !== this.commandId;
    }

    // One unreachable member must not stop the others; fails only when no member was reached.
    private async forTargets<T>(send: (target: Zh.Endpoint) => Promise<T> | T): Promise<T> {
        const results = await Promise.allSettled(this.targets.map((target) => send(target)));
        const ok = results.find((r): r is PromiseFulfilledResult<Awaited<T>> => r.status === "fulfilled");
        if (!ok) {
            const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
            throw failed ? failed.reason : new Error("No group member to send to");
        }
        return ok.value;
    }

    private moveToLevel(level: number, transtime: number) {
        return this.forTargets((target) =>
            target.command("genLevelCtrl", "moveToLevel", {level, transtime, optionsMask: 0, optionsOverride: 0}, this.options),
        );
    }

    private moveToLevelWithOnOff(level: number, transtime: number) {
        globalStore.clearValue(this.entity, OFF_AT);
        return this.forTargets((target) =>
            target.command("genLevelCtrl", "moveToLevelWithOnOff", {level, transtime, optionsMask: 0, optionsOverride: 0}, this.options),
        );
    }

    private turnOff() {
        globalStore.putValue(this.entity, OFF_AT, Date.now());
        return this.forTargets((target) => tz.on_off.convertSet(target, "state", "off", withMessage(this.meta, {state: "off"})));
    }

    // Ramp with the firmware transition and wait for it; false when a newer command took over.
    private async ramp(to: number, time: number, out: boolean): Promise<boolean> {
        globalStore.putValue(this.entity, FADE, {out, level: to} satisfies Fade);
        await this.moveToLevel(to, time);
        await utils.sleep(time * 100);
        if (this.superseded()) return false;
        // A finished fade-out stays marked until OFF is sent, so a toggle in between still turns the light on.
        if (!out) globalStore.clearValue(this.entity, FADE);
        return true;
    }

    private async fadeIn(from: number, time: number): Promise<KeyValueAny | undefined> {
        if (from <= 1) await this.moveToLevelWithOnOff(1, 0);
        if (!(await this.ramp(this.targetLevel, time, false))) return undefined;
        return {state: "ON", brightness: this.targetLevel};
    }

    // Ramp the lit part down, then OFF (at once without a transition), then park its level at the minimum so it never
    // lights at an old level next time.
    private async dimAndOff(time: number): Promise<boolean> {
        if (time > 0 && this.currentLevel > 1 && !(await this.ramp(1, time, true))) return false;
        try {
            await this.turnOff();
        } finally {
            if (!this.superseded()) globalStore.clearValue(this.entity, FADE);
        }
        if (time === 0 && this.currentLevel > 1) {
            await utils.sleep(STEP_DELAY_MS);
            if (this.superseded()) return false;
            // ExecuteIfOff lets the level apply while the light is off.
            await this.moveToLevel(1, 0);
        }
        return true;
    }

    // An OFF cut short by this command may not have parked the level yet.
    private async parkAfterQuickOff() {
        if (this.lit || !this.justOff) return;
        await this.moveToLevel(1, 0);
        await utils.sleep(STEP_DELAY_MS);
    }

    private async handleOff(): Promise<Tz.ConvertSetResult> {
        if (!this.lit) return await this.turnOff();
        return (await this.dimAndOff(this.transition.time)) ? {state: {state: "OFF"}} : undefined;
    }

    // Brightness and on/off without a color.
    private async handleLevel(): Promise<Tz.ConvertSetResult> {
        if (this.setsLevel && (!this.lit || this.runningFade?.out)) {
            await this.parkAfterQuickOff();
            if (this.transition.time > 0) {
                const result = await this.fadeIn(this.lit ? this.currentLevel : 1, this.transition.time);
                return result && {state: result};
            }
            // genOnOff.on would light at the parked level 1 while the state keeps the old brightness.
            await this.moveToLevelWithOnOff(this.targetLevel, 0);
            return {state: {state: "ON", brightness: this.targetLevel}};
        }
        return await this.forTargets((target) => tz.light_onoff_brightness.convertSet(target, this.key, this.value, this.messageMeta));
    }

    // Color or color temperature, with or without turning the light on.
    private async handleColor(): Promise<Tz.ConvertSetResult> {
        const {message, meta} = this;
        const colorMode = meta.state.color_mode;
        // Switching between the white ring and the RGB strip: the part that is lit has to go off first.
        const switchesMode = this.lit && (this.setsColor ? colorMode === "color_temp" : colorMode === "xy" || colorMode === "hs");
        const colorKey = (this.setsColor ? "color" : this.colorTempKey) as string;

        if (!this.setsColor && !this.setsLevel && !switchesMode) {
            return await this.forTargets((target) => tz.light_color_colortemp.convertSet(target, colorKey, message[colorKey], this.messageMeta));
        }

        const darkAfterwards = !this.lit || switchesMode;
        // A mode switch fades the old part out and the new part in, each over half of the transition.
        const phaseTime = switchesMode ? this.transition.time / 2 : this.transition.time;
        if (switchesMode) {
            if (!(await this.dimAndOff(phaseTime))) return;
            await utils.sleep(STEP_DELAY_MS);
            if (this.superseded()) return;
        } else {
            await this.parkAfterQuickOff();
        }

        const result: KeyValueAny = {};
        const merge = (r: Tz.ConvertSetResult) => Object.assign(result, (r as {state?: KeyValue} | undefined)?.state);

        // The color step gets only the color (and transition), so it does not apply state/brightness itself.
        // light_color turns the light on by itself when an HS colour carries a brightness.
        const colorValue =
            this.setsColor && utils.isObject(message.color) ? (({b, brightness, ...color}) => color)(message.color) : message[colorKey];
        const transitionPart = darkAfterwards ? {transition: 0} : message.transition !== undefined ? {transition: message.transition} : {};
        const colorMeta = withMessage(meta, {[colorKey]: colorValue, ...transitionPart});
        merge(await this.forTargets((target) => tz.light_color_colortemp.convertSet(target, colorKey, colorValue, colorMeta)));

        // With an unchanged level after an in-place color_temp transition, the white jumped back to the old color_temp.
        const levelUnchanged = !darkAfterwards && this.transition.time > 0 && this.targetLevel === meta.state.brightness;
        if ((this.setsLevel || switchesMode) && !levelUnchanged) {
            await utils.sleep(COLOR_LEVEL_DELAY_MS);
            if (this.superseded()) return;
            if (darkAfterwards && this.transition.time > 0) {
                const faded = await this.fadeIn(1, phaseTime);
                if (!faded) return;
                merge({state: faded});
            } else {
                const levelMessage = {...message, state: "on", brightness: this.targetLevel};
                globalStore.clearValue(this.entity, OFF_AT);
                merge(
                    await this.forTargets((target) =>
                        tz.light_onoff_brightness.convertSet(target, "brightness", this.targetLevel, withMessage(meta, levelMessage)),
                    ),
                );
            }
        }

        return {state: result};
    }
}

export const tzAwox = {
    light_onoff_brightness: {
        key: ["state", "brightness", "brightness_percent", "on_time", "off_wait_time", "color", "color_temp", "color_temp_percent"],
        options: [exposes.options.color_sync(), exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => await new LightCommand(entity, key, value, meta).run(),
        convertGet: async (entity, key, meta) => {
            if (key === "state" || key === "brightness") {
                await tz.light_onoff_brightness.convertGet(entity, key, meta);
            } else {
                await tz.light_color_colortemp.convertGet(entity, key, meta);
            }
        },
    } satisfies Tz.Converter,
    // The light needs ExecuteIfOff on color as well, so the one level_config setting is written to both clusters.
    level_config: {
        ...tz.level_config,
        convertSet: async (entity, key, value, meta) => {
            const result = await tz.level_config.convertSet?.(entity, key, value, meta);
            if (utils.isObject(value) && value.execute_if_off != null) {
                await entity.write("lightingColorCtrl", {options: value.execute_if_off ? 1 : 0}, utils.getOptions(meta.mapped, entity));
            }
            return result;
        },
    } satisfies Tz.Converter,
};

// tzAwox.light_onoff_brightness sends level and color commands while the light is off; ZCL drops them unless ExecuteIfOff is set.
export const awoxExecuteIfOff = (): ModernExtend => ({
    configure: [
        async (device) => {
            const endpoint = device.getEndpoint(1);
            utils.assertEndpoint(endpoint);
            await endpoint.write("genLevelCtrl", {options: 1});
            await endpoint.write("lightingColorCtrl", {options: 1});
            // Read back so the shown state matches the device.
            await endpoint.read("genLevelCtrl", ["options"]);
            await endpoint.read("lightingColorCtrl", ["options"]);
        },
    ],
    isModernExtend: true,
});
