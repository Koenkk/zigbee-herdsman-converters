const exposes = require("../lib/exposes");
const tuya = require("../lib/tuya");

const e = exposes.presets;
const ea = exposes.access;

const definition = {
    fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE200_eqpaxqdv"}],
    zigbeeModel: ["TS0601"],
    model: "PIMS3028",
    vendor: "KnockautX",
    description: "Blind Plugin Receiver Multi STAK 3/STAS 3",
    whiteLabel: [tuya.whitelabel("KnockautX", "PIMS3028", "Blind Plugin Receiver Multi STAK 3/STAS 3", ["_TZE200_eqpaxqdv"])],
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    configure: tuya.configureMagicPacket,

    exposes: [
        // DP 1: control; rename 'state' for better compatibility wiht Home Assistant, lock/unlock Child protection (lock/unlock wireless remote)
        e
            .enum("state", ea.STATE_SET, ["open", "stop", "close", "lock", "unlock"])
            .withDescription("Control commands"),
        // DP 2/3: curtain position
        e
            .cover_position()
            .setAccess("position", ea.STATE_SET),
        // DP 4: mode (up, up_delete, remove_up_down); probably used for configuring the motor limits
        e
            .enum("mode", ea.STATE_SET, ["up", "up_delete", "remove_up_down"])
            .withDescription("Set mode"),
        // DP 5: motor runnning direction
        e
            .enum("control_back", ea.STATE_SET, ["forward", "back"])
            .withDescription("Set the motor running direction"),
        // DP 6: Add wireless remote
        e
            .binary("auto_power", ea.STATE_SET, true, false)
            .withDescription("Add wireless remote"),
        // DP 7: Work state (report only)
        e
            .enum("work_state", ea.STATE, ["opening", "closing", "123"])
            .withDescription("Work state"),
        // DP 10: Total Time (report only)
        e
            .numeric("time_total", ea.STATE)
            .withValueMin(0)
            .withValueMax(600)
            .withUnit("s")
            .withDescription("Total travel time"),
        // DP 11: Situation set (report only)
        e
            .enum("situation_set", ea.STATE, ["fully_open", "fully_close"])
            .withDescription("Situation of the blinds"),
        // DP 12: Motor fault (report only)
        e
            .binary("fault", ea.STATE, true, false)
            .withDescription("Motor fault"),
        // DP 16: Border
        e
            .enum("border", ea.STATE_SET, ["down_delete", "remove_top_bottom"])
            .withDescription("Set lower/upper limit"),
        // DP 19: Best position
        e
            .numeric("position_best", ea.STATE_SET)
            .withValueMin(1)
            .withValueMax(100) // error withValueMin(0)?
            .withDescription("Set the best position"),
        // DP 21: Angle control (numeric 0/25/50/75/100)
        e
            .numeric("angle_horizontal", ea.STATE_SET)
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(25)
            .withUnit("°")
            .withDescription("Set the angle"),
        // DP 101: Travel calibration
        e
            .enum("cur_calibration", ea.STATE_SET, ["start", "end"])
            .withDescription("Calibrate the travel limits"),
        // DP 102: Quick calibration
        e
            .numeric("quick_calibration_1", ea.STATE_SET)
            .withValueMin(0)
            .withValueMax(900)
            .withUnit("s")
            .withDescription("Set quick calibration"),
        // DP 103: Best position
        e
            .binary("switch", ea.STATE_SET, true, false)
            .withDescription("Trigger best position"),
        // DP 104: Reset
        e
            .enum("reset", ea.STATE_SET, ["reset"])
            .withDescription("Trigger factory reset"),
    ],

    meta: {
        tuyaDatapoints: [
            // 1: Control (set and report) -> standard 'state' instead of control
            [
                1,
                "state",
                tuya.valueConverterBasic.lookup({
                    open: tuya.enum(0),
                    stop: tuya.enum(1),
                    close: tuya.enum(2),
                    lock: tuya.enum(3),
                    unlock: tuya.enum(4),
                }),
            ],
            // 2: Blind position setting (set) -> standard `position` instead of percent_control
            [2, "position", tuya.valueConverter.coverPosition],
            // 3: Current curtain position (report) -> standard `position` instead of percent_state
            [3, "position", tuya.valueConverter.coverPositionInverted],
            // 4: Mode
            [4, "mode", tuya.valueConverterBasic.lookup({up: tuya.enum(0), up_delete: tuya.enum(1), remove_up_down: tuya.enum(2)})],
            // 5: Motor running direction / control_back
            [5, "control_back", tuya.valueConverterBasic.lookup({forward: tuya.enum(0), back: tuya.enum(1)})],
            // 6: Add wireless remote / auto power
            [6, "auto_power", tuya.valueConverter.raw],
            // 7: Work state (report only)
            [7, "work_state", tuya.valueConverterBasic.lookup({opening: tuya.enum(0), closing: tuya.enum(1), 123: tuya.enum(2)})],
            // 10: Total time
            [10, "time_total", tuya.valueConverter.raw],
            // 11: Situation set
            [11, "situation_set", tuya.valueConverterBasic.lookup({fully_open: tuya.enum(0), fully_close: tuya.enum(1)})],
            // 12: Fault / motor fault
            [12, "fault", tuya.valueConverter.raw],
            // 16: Border / lower limit setting
            [16, "border", tuya.valueConverterBasic.lookup({down_delete: tuya.enum(0), remove_top_bottom: tuya.enum(1)})],
            // 19: Best position
            [19, "position_best", tuya.valueConverter.setLimit],
            // 21: Angle control / horizontal angle (numeric)
            [21, "angle_horizontal", tuya.valueConverter.raw],
            // 101: Travel calibration
            [101, "cur_calibration", tuya.valueConverterBasic.lookup({start: tuya.enum(0), end: tuya.enum(1)})],
            // 102: Quick calibration (seconds)
            [102, "quick_calibration_1", tuya.valueConverter.raw],
            // 103: Best position switch (boolean 0/1)
            [103, "switch", tuya.valueConverter.raw],
            // 104: Reset
            [104, "reset", tuya.valueConverterBasic.lookup({reset: tuya.enum(0)})],
        ],
    },
};

module.exports = definition;
