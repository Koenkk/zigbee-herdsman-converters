import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, Publish, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    FB20002_on: {
        cluster: "genOnOff",
        type: "commandTuyaAction",
        convert: (model, msg, publish, options, meta) => {
            return {action: "on"};
        },
    } satisfies Fz.Converter<"genOnOff", tuya.TuyaGenOnOff, "commandTuyaAction">,
};

const valueConverterLocal = {
    wateringState: {
        from: (value: number, meta: Fz.Meta, options: KeyValue, publish: Publish) => {
            const result = {
                state: value ? "ON" : "OFF",
                ...(value
                    ? {}
                    : {
                          // ensure time_left is set to zero when it's OFF
                          time_left: 0,
                      }),
            };

            // prepare the time reporting for water scheduler
            // indications when the watering was triggered by scheduler:
            // - scheduling is enabled
            // - current state is on
            // - time_left wasn't reported before and is 0
            // - current hour & minute matches scheduling period
            if (
                meta.state.schedule_mode !== "OFF" &&
                result.state === "ON" &&
                meta.state.time_left === 0 &&
                !globalStore.hasValue(meta.device, "watering_timer_active_time_slot")
            ) {
                const now = new Date();
                const timeslot = [1, 2, 3, 4, 5, 6]
                    .map((slotNumber) => utils.getObjectProperty(meta.state, `schedule_slot_${slotNumber}`, {}))
                    // @ts-expect-error ignore
                    .find((ts) => ts.state === "ON" && ts.start_hour === now.getHours() && ts.start_minute === now.getMinutes() && ts.timer > 0);

                if (timeslot) {
                    // @ts-expect-error ignore
                    const iterationDuration = timeslot.timer + timeslot.pause;
                    // automatic watering detected
                    globalStore.putValue(meta.device, "watering_timer_active_time_slot", {
                        timeslot_start_timestamp: now.getTime(),
                        // end of last watering excluding last pause
                        // @ts-expect-error ignore
                        timeslot_end_timestamp: now.getTime() + (timeslot.iterations * iterationDuration - timeslot.pause) * 60 * 1000,
                        // @ts-expect-error ignore
                        timer: timeslot.timer,
                        iteration_inverval: null, // will be set in the next step
                        iteration_start_timestamp: 0, // will be set in the next step
                    });
                }
            }

            // setup time reporting for water scheduler when necessary
            if (globalStore.hasValue(meta.device, "watering_timer_active_time_slot")) {
                const ts = globalStore.getValue(meta.device, "watering_timer_active_time_slot");

                if (
                    // time slot execution is already completed
                    Date.now() > ts.timeslot_end_timestamp - 5000 ||
                    // scheduling was interrupted by turning watering on manually
                    // @ts-expect-error ignore
                    (result.state === "ON" && result.state !== meta.state.state && meta.state.time_left > 0)
                ) {
                    // reporting is no longer necessary
                    clearInterval(ts.iteration_inverval);
                    globalStore.clearValue(meta.device, "watering_timer_active_time_slot");
                } else if (result.state === "OFF" && result.state !== meta.state.state) {
                    // turned off --> disable reporting for this iteration only
                    clearInterval(ts.iteration_inverval);
                    ts.iteration_inverval = null;
                } else if (result.state === "ON" && result.state !== meta.state.state && meta.state.time_left === 0) {
                    // automatic scheduling detected (reported as ON, but without any info about duration)
                    ts.iteration_report = true;
                    ts.iteration_start_timestamp = Date.now();
                    if (ts.timer > 1) {
                        // report every minute
                        ts.iteration_inverval = setInterval(() => {
                            const now = Date.now();
                            const wateringEndTime = ts.iteration_start_timestamp + ts.timer * 60 * 1000;
                            const timeLeftInMinutes = Math.round((wateringEndTime - now) / 1000 / 60);
                            if (timeLeftInMinutes > 0) {
                                if (timeLeftInMinutes === 1) {
                                    clearInterval(ts.iteration_inverval);
                                }
                                publish({
                                    time_left: timeLeftInMinutes,
                                });
                            }
                        }, 60 * 1000);
                    }
                    // initial reporting
                    result.time_left = ts.timer;
                }
            }
            return result;
        },
    },
    wateringScheduleMode: {
        from: (value: number[]) => {
            const [scheduleMode, scheduleValue] = value;
            const isWeekday = scheduleMode === 0;
            return {
                schedule_mode: scheduleValue === 0 ? "OFF" : isWeekday ? "WEEKDAY" : "PERIODIC",
                schedule_periodic: !isWeekday ? scheduleValue : 0,
                schedule_weekday: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].reduce(
                    (scheduleMap, dayName, index) => ({
                        // biome-ignore lint/performance/noAccumulatingSpread: ignored using `--suppress`
                        ...scheduleMap,
                        [dayName]: isWeekday && (scheduleValue & (1 << index)) > 0 ? "ON" : "OFF",
                    }),
                    {},
                ),
            };
        },
    },
    wateringSchedulePeriodic: {
        to: (value: number) => {
            if (!utils.isInRange(0, 7, value)) throw new Error(`Invalid value: ${value} (expected ${0} to ${7})`);
            // Note: mode value of 0 switches to disabled weekday scheduler
            const scheduleMode = value > 0 ? 1 : 0;
            return [scheduleMode, value];
        },
    },
    wateringScheduleWeekday: {
        to: (value: KeyValue, meta: Tz.Meta) => {
            // map each day to ON/OFF and use current state as default to allow partial updates
            const dayValues = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                // @ts-expect-error ignore
                .map((dayName) => utils.getObjectProperty(value, dayName, utils.getObjectProperty(meta.state.schedule_weekday, dayName, "OFF")));

            const scheduleValue = dayValues.reduce((dayConfig, value, index) => {
                // @ts-expect-error ignore
                return dayConfig | (value === "ON" ? 1 << index : 0);
            }, 0);

            // value of 0 switches to weekday scheduler
            const scheduleMode = 0;

            return [scheduleMode, scheduleValue];
        },
    },
    wateringScheduleSlot: (timeSlotNumber: number) => ({
        from: (buffer: Buffer) => {
            return {
                state: buffer.readUInt8(0) === 1 ? "ON" : "OFF",
                start_hour: utils.numberWithinRange(buffer.readUInt8(1), 0, 23), // device reports non-valid value 255 initially
                start_minute: utils.numberWithinRange(buffer.readUInt8(2), 0, 59), // device reports non-valid value 255 initially
                timer: utils.numberWithinRange(buffer.readUInt8(3) * 60 + buffer.readUInt8(4), 1, 599), // device reports non-valid value 0 initially
                pause: utils.numberWithinRange(buffer.readUInt8(6) * 60 + buffer.readUInt8(7), 0, 599),
                iterations: utils.numberWithinRange(buffer.readUInt8(9), 1, 9), // device reports non-valid value 0 initially
            };
        },
        to: (value: KeyValue, meta: Tz.Meta) => {
            // use default values from current config to allow partial updates
            const timeslot = utils.getObjectProperty(meta.state, `schedule_slot_${timeSlotNumber}`, {}) as KeyValue;

            const state = utils.getObjectProperty(value, "state", timeslot.state ?? false) as number;
            const startHour = utils.getObjectProperty(value, "start_hour", timeslot.start_hour ?? 23) as number;
            const startMinute = utils.getObjectProperty(value, "start_minute", timeslot.start_minute ?? 59) as number;
            const duratonInMin = utils.getObjectProperty(value, "timer", timeslot.timer ?? 1) as number;
            const iterations = utils.getObjectProperty(value, "iterations", timeslot.iterations ?? 1) as number;
            const pauseInMin = utils.getObjectProperty(value, "pause", timeslot.pause ?? 0) as number;

            if (!utils.isInRange(0, 23, startHour)) throw new Error(`Invalid start hour value ${startHour} (expected ${0} to ${23})`);
            if (!utils.isInRange(0, 59, startMinute)) throw new Error(`Invalid start minute value: ${startMinute} (expected ${0} to ${59})`);
            if (!utils.isInRange(1, 599, duratonInMin)) throw new Error(`Invalid timer value: ${duratonInMin} (expected ${1} to ${599})`);
            if (!utils.isInRange(1, 9, iterations)) throw new Error(`Invalid iterations value: ${iterations} (expected ${1} to ${9})`);
            if (!utils.isInRange(0, 599, pauseInMin)) throw new Error(`Invalid pause value: ${pauseInMin} (expected ${0} to ${599})`);
            if (iterations > 1 && pauseInMin === 0) throw new Error("Pause value must be at least 1 minute when using multiple iterations");

            return [
                // @ts-expect-error ignore
                state === "ON" ? 1 : 0, // time slot enabled or not
                startHour, // start hour
                startMinute, // start minute
                Math.floor(duratonInMin / 60), // duration for n hours
                duratonInMin % 60, // duration + n minutes
                0, // what's this? -> was always reported as 0
                Math.floor(pauseInMin / 60), // pause in hours
                pauseInMin % 60, // pause + n minutes
                0, // what's this? -> was always reported as 0
                iterations, // iterations
            ];
        },
    }),
};


// Silvercrest 368308_2010 schedule converter
// Wire format: [dayNum, temp1, time1, temp2, time2, ..., temp8, time8, temp9] = 18 bytes
// Temperature: raw * 2 (0.5°C steps), Time: hour * 4 + minute / 15 (15-min steps)
function silvercrestSchedule(dayNum: number) {
    return {
        from: (v: number[]) => {
            if (!v || v.length < 18) return "";
            const parts: string[] = [];
            for (let i = 0; i < 8; i++) {
                const temp = (v[1 + i * 2] / 2).toFixed(1);
                const raw = v[2 + i * 2];
                const hh = String(Math.floor(raw / 4)).padStart(2, "0");
                const mm = String((raw % 4) * 15).padStart(2, "0");
                parts.push(`${hh}:${mm}/${temp}`);
            }
            return parts.join(" ");
        },
        to: (v: string) => {
            const parts = String(v).trim().split(/\s+/);
            if (parts.length < 1 || parts.length > 8) {
                throw new Error(`Invalid schedule: expected 1-8 transitions, got ${parts.length}`);
            }
            const buf = [dayNum];
            let lastTemp = 34;
            for (const part of parts) {
                const [time, temp] = part.split("/");
                if (!time || temp === undefined) throw new Error(`Invalid: "${part}"`);
                const [hh, mm] = time.split(":").map(Number);
                lastTemp = Math.round(Number.parseFloat(temp) * 2);
                buf.push(lastTemp, Math.round(hh * 4 + mm / 15));
            }
            while (buf.length < 17) {
                buf.push(lastTemp, 96);
            }
            buf.push(lastTemp);
            return buf;
        },
    };
}

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {manufacturerName: "_TZ3000_kdi2o9m6"}, // EU
            {modelID: "TS011F", manufacturerName: "_TZ3000_plyvnuf5"}, // CH
            {modelID: "TS011F", manufacturerName: "_TZ3000_wamqdr3f"}, // FR
            {modelID: "TS011F", manufacturerName: "_TZ3000_00mk2xzy"}, // BS
            {modelID: "TS011F", manufacturerName: "_TZ3000_upjrsxh1"}, // DK
            {manufacturerName: "_TZ3000_00mk2xzy"}, // BS
        ],
        model: "HG06337",
        vendor: "Lidl",
        description: "Silvercrest smart plug (EU, CH, FR, BS, DK)",
        extend: [tuya.modernExtend.tuyaOnOff({indicatorMode: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_j1v25l17", "_TZ3000_ynmowqk2", "_TZ3000_3uimvkn6"]),
        model: "HG08673",
        vendor: "Lidl",
        description: "Silvercrest smart plug with power monitoring (EU, FR)",
        ota: true,
        extend: [
            tuya.modernExtend.tuyaOnOff({electricalMeasurements: true, powerOutageMemory: true, indicatorMode: true, childLock: true}),
            tuya.modernExtend.electricityMeasurementPoll({
                electricalMeasurement: false,
                metering: true,
                optionDescription: "Only the energy value is polled for this device.",
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            // Energy reporting (currentSummDelivered) doesn't work; requires polling: https://github.com/Koenkk/zigbee2mqtt/issues/14356
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 100, multiplier: 1});
            device.save();
        },
        whiteLabel: [tuya.whitelabel("Lidl", "HG08673-BS", "Silvercrest smart plug with power monitoring (BS)", ["_TZ3000_3uimvkn6"])],
    },
    {
        fingerprint: tuya.fingerprint("TS004F", ["_TZ3000_rco1yzb1"]),
        model: "HG08164",
        vendor: "Lidl",
        description: "Silvercrest smart button",
        extend: [tuya.clusters.addTuyaGenOnOffCluster()],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_stop, fz.battery, tuya.fz.on_off_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genBasic", [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.read("genOnOff", ["tuyaOperationMode"]);
            try {
                await endpoint.read(0xe001, [0xd011]);
            } catch {
                /* do nothing */
            }
            await endpoint.read("genPowerCfg", ["batteryVoltage", "batteryPercentageRemaining"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.action(["on", "off", "brightness_stop", "brightness_step_up", "brightness_step_down", "single", "double"]), e.battery()],
    },
    {
        fingerprint: tuya.fingerprint("TS0211", ["_TZ1800_ladpngdx", "_TZ1800_akzvkzqq"]),
        model: "HG06668",
        vendor: "Lidl",
        description: "Silvercrest smart wireless door bell button",
        fromZigbee: [fz.battery, fz.tuya_doorbell_button],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.action(["pressed"]), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: tuya.fingerprint("TY0202", ["_TZ1800_fcdjzz3s"]),
        model: "HG06335/HG07310",
        vendor: "Lidl",
        description: "Silvercrest smart motion sensor",
        extend: [
            m.iasZoneAlarm({zoneType: "occupancy", zoneStatusReporting: true, zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
            m.battery(),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TY0203", ["_TZ1800_ejwkn2h2", "_TZ1800_ho6i0zk9"]),
        model: "HG06336",
        vendor: "Lidl",
        description: "Silvercrest smart window and door sensor",
        extend: [m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "tamper"]}), m.battery()],
    },
    {
        fingerprint: tuya.fingerprint("TS1001", ["_TYZB01_bngwdjsr"]),
        model: "FB20-002",
        vendor: "Lidl",
        description: "Livarno Lux switch and dimming light remote control",
        extend: [tuya.clusters.addTuyaGenOnOffCluster()],
        exposes: [
            e.action(["on", "off", "brightness_stop", "brightness_step_up", "brightness_step_down", "brightness_move_up", "brightness_move_down"]),
        ],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fzLocal.FB20002_on],
        toZigbee: [],
    },
    {
        fingerprint: tuya.fingerprint("TS1001", ["_TYZB01_hww2py6b"]),
        model: "FB21-001",
        vendor: "Lidl",
        description: "Livarno Lux switch and dimming light remote control",
        extend: [tuya.clusters.addTuyaGenOnOffCluster()],
        exposes: [
            e.action([
                "on",
                "off",
                "brightness_stop",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "switch_scene",
            ]),
        ],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, tuya.fz.switch_scene],
        toZigbee: [],
    },
    {
        fingerprint: tuya.fingerprint("TS011F", [
            "_TZ3000_wzauvbcs",
            "_TZ3000_oznonj5q",
            "_TZ3000_1obwwnmq",
            "_TZ3000_4uf3d0ax",
            "_TZ3000_vzopcetz",
            "_TZ3000_vmpbygs5",
        ]),
        model: "HG06338",
        vendor: "Lidl",
        description: "Silvercrest 3 gang switch, with 4 USB (EU, FR, CZ, BS)",
        extend: [tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2", "l3"]})],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const ID of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ID), coordinatorEndpoint, ["genOnOff"]);
            }
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_s8gkrkxk"]),
        model: "HG06467",
        vendor: "Lidl",
        description: "Melinera smart LED string lights",
        toZigbee: [tz.on_off, legacy.tz.silvercrest_smart_led_string],
        fromZigbee: [fz.on_off, legacy.fz.silvercrest_smart_led_string],
        exposes: [e.light_brightness_colorhs().setAccess("brightness", ea.STATE_SET).setAccess("color_hs", ea.STATE_SET)],
    },
    {
        fingerprint: tuya.fingerprint("TS0504B", ["_TZ3210_sroezl0s"]),
        model: "14153806L",
        vendor: "Lidl",
        description: "Livarno smart LED ceiling light",
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
        configure: (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue("lightingColorCtrl", {colorCapabilities: 29});
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_htnnfasr"]),
        model: "PSBZS A1",
        vendor: "Lidl",
        description: "Parkside smart watering timer",
        fromZigbee: [fz.ignore_tuya_set_time, fz.ignore_onoff_report],
        extend: [tuya.modernExtend.tuyaBase({dp: true, forceTimeUpdates: true, timeStart: "1970"})],
        onEvent: async (event) => {
            if (event.type === "deviceInterview" && event.data.status === "successful") {
                // dirty hack: reset frost guard & frost alarm to get the initial state
                // wait 10 seconds to ensure configure is done
                await utils.sleep(10000);
                const endpoint = event.data.device.getEndpoint(1);
                try {
                    await tuya.sendDataPointBool(endpoint, 109, false);
                    await tuya.sendDataPointBool(endpoint, 108, false);
                } catch {
                    // ignore, just prevent any crashes
                }
            }
        },
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);

            // set reporting interval of genOnOff to max to "disable" it
            // background: genOnOff reporting does not respect timer or button, that makes the on/off reporting pretty useless
            // the device is reporting it's state change anyway via tuya DPs
            await reporting.onOff(device.getEndpoint(1), {max: 0xffff});
        },
        exposes: [
            e.battery(),
            tuya.exposes.switch(),
            e
                .numeric("timer", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(599)
                .withUnit("min")
                .withDescription("Auto off after specific time for manual watering."),
            e.numeric("time_left", ea.STATE).withUnit("min").withDescription("Remaining time until the watering turns off."),
            e
                .binary("frost_lock", ea.STATE, "ON", "OFF")
                .withDescription(
                    "Indicates if the frost guard is currently active. " +
                        "If the temperature drops below 5° C, device activates frost guard and disables irrigation. " +
                        "You need to reset the frost guard to activate irrigation again. Note: There is no way to enable frost guard manually.",
                ),
            e.enum("reset_frost_lock", ea.SET, ["RESET"]).withDescription("Resets frost lock to make the device workable again."),
            e.enum("schedule_mode", ea.STATE, ["OFF", "WEEKDAY", "PERIODIC"]).withDescription("Scheduling mode that is currently in use."),
            e
                .numeric("schedule_periodic", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(7)
                .withUnit("day")
                .withDescription("Watering by periodic interval: Irrigate every n days"),
            e
                .composite("schedule_weekday", "schedule_weekday", ea.STATE_SET)
                .withDescription("Watering by weekday: Irrigate individually for each day.")
                .withFeature(e.binary("monday", ea.STATE_SET, "ON", "OFF"))
                .withFeature(e.binary("tuesday", ea.STATE_SET, "ON", "OFF"))
                .withFeature(e.binary("wednesday", ea.STATE_SET, "ON", "OFF"))
                .withFeature(e.binary("thursday", ea.STATE_SET, "ON", "OFF"))
                .withFeature(e.binary("friday", ea.STATE_SET, "ON", "OFF"))
                .withFeature(e.binary("saturday", ea.STATE_SET, "ON", "OFF"))
                .withFeature(e.binary("sunday", ea.STATE_SET, "ON", "OFF")),
            ...[1, 2, 3, 4, 5, 6].map((timeSlotNumber) =>
                e
                    .composite(`schedule_slot_${timeSlotNumber}`, `schedule_slot_${timeSlotNumber}`, ea.STATE_SET)
                    .withDescription(`Watering time slot ${timeSlotNumber}`)
                    .withFeature(e.binary("state", ea.STATE_SET, "ON", "OFF").withDescription("On/off state of the time slot"))
                    .withFeature(
                        e.numeric("start_hour", ea.STATE_SET).withUnit("h").withValueMin(0).withValueMax(23).withDescription("Starting time (hour)"),
                    )
                    .withFeature(
                        e
                            .numeric("start_minute", ea.STATE_SET)
                            .withUnit("min")
                            .withValueMin(0)
                            .withValueMax(59)
                            .withDescription("Starting time (minute)"),
                    )
                    .withFeature(
                        e
                            .numeric("timer", ea.STATE_SET)
                            .withUnit("min")
                            .withValueMin(1)
                            .withValueMax(599)
                            .withDescription("Auto off after specific time for scheduled watering."),
                    )
                    .withFeature(
                        e
                            .numeric("pause", ea.STATE_SET)
                            .withUnit("min")
                            .withValueMin(0)
                            .withValueMax(599)
                            .withDescription("Pause after each iteration."),
                    )
                    .withFeature(
                        e
                            .numeric("iterations", ea.STATE_SET)
                            .withValueMin(1)
                            .withValueMax(9)
                            .withDescription("Number of watering iterations. Works only if there is a pause."),
                    ),
            ),
        ],
        meta: {
            tuyaDatapoints: [
                [1, null, valueConverterLocal.wateringState],
                // disable optimistic state reporting (device may not turn on when battery is low)
                [1, "state", tuya.valueConverter.onOff, {optimistic: false}],
                [5, "timer", tuya.valueConverter.raw],
                [6, "time_left", tuya.valueConverter.raw],
                [11, "battery", tuya.valueConverter.raw],
                [108, "frost_lock", tuya.valueConverter.onOff],
                // there is no state reporting for reset
                [109, "reset_frost_lock", tuya.valueConverterBasic.lookup({RESET: tuya.enum(0)}), {optimistic: false}],
                [107, null, valueConverterLocal.wateringScheduleMode],
                [107, "schedule_periodic", valueConverterLocal.wateringSchedulePeriodic],
                [107, "schedule_weekday", valueConverterLocal.wateringScheduleWeekday],
                [101, "schedule_slot_1", valueConverterLocal.wateringScheduleSlot(1)],
                [102, "schedule_slot_2", valueConverterLocal.wateringScheduleSlot(2)],
                [103, "schedule_slot_3", valueConverterLocal.wateringScheduleSlot(3)],
                [104, "schedule_slot_4", valueConverterLocal.wateringScheduleSlot(4)],
                [105, "schedule_slot_5", valueConverterLocal.wateringScheduleSlot(5)],
                [106, "schedule_slot_6", valueConverterLocal.wateringScheduleSlot(6)],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0101", ["_TZ3000_br3laukf"]),
        model: "HG06620",
        vendor: "Lidl",
        description: "Silvercrest garden spike with 2 sockets",
        extend: [tuya.modernExtend.tuyaOnOff()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0101", ["_TZ3000_pnzfdr9y"]),
        model: "HG06619",
        vendor: "Lidl",
        description: "Silvercrest outdoor plug",
        extend: [tuya.modernExtend.tuyaOnOff()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0505B", ["_TZ3000_lxw3zcdk"]),
        model: "HG08633",
        vendor: "Lidl",
        description: "Livarno gardenspot RGB",
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: {modes: ["hs", "xy"]}})],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_chyvmhay", "_TZE200_uiyqstza"]),
        model: "368308_2010",
        vendor: "Lidl",
        description: "Silvercrest radiator valve with thermostat",
        extend: [tuya.modernExtend.tuyaBase({dp: true, forceTimeUpdates: true, bindBasicOnConfigure: true, timeStart: "1970"})],
        exposes: [
            e.battery(),
            e.child_lock(),
            e.comfort_temperature().withValueMin(0).withValueMax(30),
            e.eco_temperature().withValueMin(0).withValueMax(35),
            e.climate()
                .withSetpoint("current_heating_setpoint", 0.5, 29.5, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-12.5, 5.5, 0.1, ea.STATE_SET)
                .withSystemMode(["off", "heat", "auto"], ea.STATE_SET)
                .withPreset(["schedule", "manual", "holiday", "boost"]),
            e.numeric("current_heating_setpoint_auto", ea.STATE_SET)
                .withValueMin(0.5).withValueMax(29.5).withValueStep(0.5)
                .withUnit("°C").withDescription("Temperature setpoint automatic"),
            e.binary("boost_heating", ea.STATE_SET, "ON", "OFF").withDescription("Boost heating mode toggle"),
            e.numeric("boost_time", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(900)
                .withDescription("Boost duration in seconds"),
            e.numeric("detectwindow_temperature", ea.STATE_SET)
                .withUnit("°C").withValueMin(-10).withValueMax(35).withDescription("Open window detection temperature"),
            e.numeric("detectwindow_timeminute", ea.STATE_SET)
                .withUnit("min").withValueMin(0).withValueMax(1000).withDescription("Open window time in minute"),
            e.binary("away_mode", ea.STATE, "ON", "OFF").withDescription("Away mode"),
            e.composite("away_setting", "away_setting", ea.STATE_SET)
                .withFeature(e.numeric("away_preset_days", ea.STATE_SET).withValueMin(0).withValueMax(9999)
                    .withDescription("Away duration in days"))
                .withFeature(e.numeric("away_preset_temperature", ea.STATE_SET)
                    .withValueMin(0.5).withValueMax(29.5).withUnit("°C").withDescription("Away temperature"))
                .withFeature(e.numeric("away_preset_year", ea.STATE_SET).withDescription("Start year (20xx)"))
                .withFeature(e.numeric("away_preset_month", ea.STATE_SET).withValueMin(1).withValueMax(12)
                    .withDescription("Start month"))
                .withFeature(e.numeric("away_preset_day", ea.STATE_SET).withValueMin(1).withValueMax(31)
                    .withDescription("Start day"))
                .withFeature(e.numeric("away_preset_hour", ea.STATE_SET).withValueMin(0).withValueMax(23)
                    .withDescription("Start hour"))
                .withFeature(e.numeric("away_preset_minute", ea.STATE_SET).withValueMin(0).withValueMax(59)
                    .withDescription("Start minute")),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET,
                "06:00/21.0 08:30/17.0 16:00/21.0 22:00/17.0 24:00/17.0 24:00/17.0 24:00/17.0 24:00/17.0"),
        ],
        meta: {
            tuyaDatapoints: [
                [2, null, {
                    from: (v: number) => (
                        {0: {system_mode: "heat", away_mode: "OFF", preset: "manual"},
                         1: {system_mode: "auto", away_mode: "OFF", preset: "schedule"},
                         2: {system_mode: "auto", away_mode: "ON", preset: "holiday"},
                         3: {system_mode: "heat", away_mode: "OFF", preset: "boost"}}[v] ||
                        {system_mode: "heat", away_mode: "OFF", preset: "manual"}
                    ),
                }],
                [2, "preset", tuya.valueConverterBasic.lookup({
                    manual: tuya.enum(0), schedule: tuya.enum(1), holiday: tuya.enum(2), boost: tuya.enum(3),
                })],
                [2, "system_mode", tuya.valueConverterBasic.lookup({
                    off: tuya.enum(0), heat: tuya.enum(0), auto: tuya.enum(1),
                })],
                [16, "current_heating_setpoint", {from: (v: number) => v / 2, to: (v: number) => Math.round(v * 2)}],
                [24, "local_temperature", tuya.valueConverter.divideBy10],
                [35, "battery", {from: (v: number) => Math.min(v, 100), to: (v: number) => v}],
                [40, "child_lock", tuya.valueConverter.lockUnlock],
                [44, "local_temperature_calibration", {
                    from: (v: number) => { let n = v; if (n > 0x7fffffff) n -= 0x100000000; return n / 10; },
                    to: (v: number) => { let n = Math.round(v * 10); if (n < 0) n += 0x100000000; return n; },
                }],
                [100, "boost_time", tuya.valueConverter.raw],
                [101, "comfort_temperature", {from: (v: number) => v / 2, to: (v: number) => Math.round(v * 2)}],
                [102, "eco_temperature", {from: (v: number) => v / 2, to: (v: number) => Math.round(v * 2)}],
                [103, null, {
                    from: (v: number[]) => ({
                        away_preset_year: v[0], away_preset_month: v[1], away_preset_day: v[2],
                        away_preset_hour: v[3], away_preset_minute: v[4],
                        away_preset_temperature: v[5] / 2, away_preset_days: (v[6] << 8) + v[7],
                    }),
                }],
                [103, "away_setting", {
                    to: (v: KeyValue, meta: {state: KeyValue}) => {
                        const s = meta.state || {};
                        const num = (a: unknown, b: unknown, def: number) => Number(a ?? b ?? def);
                        let year = num(v?.away_preset_year, s.away_preset_year, 26);
                        if (year < 17 || year > 99) year = 26;
                        let month = num(v?.away_preset_month, s.away_preset_month, 1);
                        if (month < 1 || month > 12) month = 1;
                        const dim = new Date(2000 + year, month, 0).getDate();
                        let day = num(v?.away_preset_day, s.away_preset_day, 1);
                        if (day < 1 || day > dim) day = 1;
                        let hour = num(v?.away_preset_hour, s.away_preset_hour, 0);
                        if (hour < 0 || hour > 23) hour = 0;
                        let min = num(v?.away_preset_minute, s.away_preset_minute, 0);
                        if (min < 0 || min > 59) min = 0;
                        let temp = num(v?.away_preset_temperature, s.away_preset_temperature, 17);
                        if (temp < 0.5 || temp > 29.5) temp = 17;
                        let days = num(v?.away_preset_days, s.away_preset_days, 1);
                        if (days < 1 || days > 9999) days = 1;
                        return [Math.round(year), Math.round(month), Math.round(day),
                                Math.round(hour), Math.round(min), Math.round(temp * 2),
                                (days >> 8) & 0xff, days & 0xff];
                    },
                }],
                [104, "detectwindow_temperature", {from: (v: number) => v / 2, to: (v: number) => Math.round(v * 2)}],
                [105, "detectwindow_timeminute", tuya.valueConverter.raw],
                [106, "boost_heating", tuya.valueConverter.onOff],
                [108, "current_heating_setpoint_auto", {from: (v: number) => v / 2, to: (v: number) => Math.round(v * 2)}],
                [109, "schedule_monday", silvercrestSchedule(1)],
                [110, "schedule_tuesday", silvercrestSchedule(2)],
                [111, "schedule_wednesday", silvercrestSchedule(3)],
                [112, "schedule_thursday", silvercrestSchedule(4)],
                [113, "schedule_friday", silvercrestSchedule(5)],
                [114, "schedule_saturday", silvercrestSchedule(6)],
                [115, "schedule_sunday", silvercrestSchedule(7)],
            ],
        },
    },
];
