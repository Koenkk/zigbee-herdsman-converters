import assert from "node:assert";
import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";

const e = exposes.presets;

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    CCTSwitch_D0001_levelctrl: {
        cluster: "genLevelCtrl",
        type: ["commandMoveToLevel", "commandMoveToLevelWithOnOff", "commandMove", "commandStop"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            if (msg.type === "commandMove") {
                assert("movemode" in msg.data);
                const direction = msg.data.movemode === 1 ? "down" : "up";
                payload.action = `brightness_${direction}_hold`;
                globalStore.putValue(msg.endpoint, "direction", direction);
                globalStore.putValue(msg.endpoint, "start", Date.now());
                payload.rate = msg.data.rate;
                payload.action_rate = msg.data.rate;
            } else if (msg.type === "commandStop") {
                const direction = globalStore.getValue(msg.endpoint, "direction");
                const duration = Date.now() - globalStore.getValue(msg.endpoint, "start");
                payload.action = `brightness_${direction}_release`;
                payload.duration = duration;
                payload.action_duration = duration;
            } else {
                // wrap the messages from button2 and button4 into a single function
                // button2 always sends "commandMoveToLevel"
                // button4 sends two messages, with "commandMoveToLevelWithOnOff" coming first in the sequence
                //         so that's the one we key off of to indicate "button4". we will NOT print it in that case,
                //         instead it will be returned as part of the second sequence with
                //         CCTSwitch_D0001_move_to_colortemp_recall below.

                let clk = "brightness";
                let cmd = null;

                assert("level" in msg.data);
                payload.action_brightness = msg.data.level;
                payload.action_transition = msg.data.transtime / 10.0;
                payload.brightness = msg.data.level;
                payload.transition = msg.data.transtime / 10.0;

                if (msg.type === "commandMoveToLevel") {
                    // pressing the brightness button increments/decrements from 13-254.
                    // when it reaches the end (254) it will start decrementing by a step,
                    // and vice versa.
                    const direction = msg.data.level > globalStore.getValue(msg.endpoint, "last_brightness") ? "up" : "down";
                    cmd = `${clk}_${direction}`;
                    globalStore.putValue(msg.endpoint, "last_brightness", msg.data.level);
                } else if (msg.type === "commandMoveToLevelWithOnOff") {
                    // This is the 'start' of the 4th button sequence.
                    clk = "memory";
                    globalStore.putValue(msg.endpoint, "last_move_level", msg.data.level);
                    globalStore.putValue(msg.endpoint, "last_clk", clk);
                }

                if (clk !== "memory") {
                    globalStore.putValue(msg.endpoint, "last_seq", msg.meta.zclTransactionSequenceNumber);
                    globalStore.putValue(msg.endpoint, "last_clk", clk);
                    payload.action = cmd;
                }
            }

            return payload;
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandMoveToLevel", "commandMoveToLevelWithOnOff", "commandMove", "commandStop"]>,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    CCTSwitch_D0001_lighting: {
        cluster: "lightingColorCtrl",
        type: ["commandMoveToColorTemp", "commandMoveColorTemp"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            if (msg.type === "commandMoveColorTemp") {
                assert("movemode" in msg.data);
                const clk = "colortemp";
                payload.rate = msg.data.rate;
                payload.action_rate = msg.data.rate;

                if (msg.data.movemode === 0) {
                    const direction = globalStore.getValue(msg.endpoint, "direction");
                    const duration = Date.now() - globalStore.getValue(msg.endpoint, "start");
                    payload.action = `${clk}_${direction}_release`;
                    payload.duration = duration;
                    payload.action_duration = duration;
                } else {
                    const direction = msg.data.movemode === 3 ? "down" : "up";
                    payload.action = `${clk}_${direction}_hold`;
                    payload.rate = msg.data.rate;
                    payload.action_rate = msg.data.rate;
                    // store button and start moment
                    globalStore.putValue(msg.endpoint, "direction", direction);
                    globalStore.putValue(msg.endpoint, "start", Date.now());
                }
            } else {
                // both button3 and button4 send the command "commandMoveToColorTemp"
                // in order to distinguish between the buttons, use the sequence number and the previous command
                // to determine if this message was immediately preceded by "commandMoveToLevelWithOnOff"
                // if this command follows a "commandMoveToLevelWithOnOff", then it's actually button4's second message
                // and we can ignore it entirely
                const lastClk = globalStore.getValue(msg.endpoint, "last_clk");
                const lastSeq = globalStore.getValue(msg.endpoint, "last_seq");

                const seq = msg.meta.zclTransactionSequenceNumber;
                let clk = "colortemp";
                assert("colortemp" in msg.data);
                payload.color_temp = msg.data.colortemp;
                payload.transition = msg.data.transtime / 10.0;
                payload.action_color_temp = msg.data.colortemp;
                payload.action_transition = msg.data.transtime / 10.0;

                // because the remote sends two commands for button4, we need to look at the previous command and
                // see if it was the recognized start command for button4 - if so, ignore this second command,
                // because it's not really button3, it's actually button4
                if (lastClk === "memory") {
                    payload.action = "recall";
                    payload.brightness = globalStore.getValue(msg.endpoint, "last_move_level");
                    payload.action_brightness = globalStore.getValue(msg.endpoint, "last_move_level");
                    // ensure the "last" message was really the message prior to this one
                    // accounts for missed messages (gap >1) and for the remote's rollover from 127 to 0
                    if ((seq === 0 && lastSeq === 127) || seq - lastSeq === 1) {
                        clk = null;
                    }
                } else {
                    // pressing the color temp button increments/decrements from 153-370K.
                    // when it reaches the end (370) it will start decrementing by a step,
                    // and vice versa.
                    const direction = msg.data.colortemp > globalStore.getValue(msg.endpoint, "last_color_temp") ? "up" : "down";
                    const cmd = `${clk}_${direction}`;
                    payload.action = cmd;
                    globalStore.putValue(msg.endpoint, "last_color_temp", msg.data.colortemp);
                }

                if (clk != null) {
                    globalStore.putValue(msg.endpoint, "last_seq", msg.meta.zclTransactionSequenceNumber);
                    globalStore.putValue(msg.endpoint, "last_clk", clk);
                }
            }

            return payload;
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, ["commandMoveToColorTemp", "commandMoveColorTemp"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZBT-DIMLight-GLS0800"],
        model: "ZBT-DIMLight-GLS0800",
        vendor: "Leedarson",
        description: "LED E27 warm white",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["ZBT-CCTLight-GLS0904"],
        model: "ZBT-CCTLight-GLS0904",
        vendor: "Leedarson",
        description: "LED E27 tunable white",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["ZBT-CCTLight-Candle0904"],
        model: "ZBT-CCTLight-Candle0904",
        vendor: "Leedarson",
        description: "LED E14 tunable white",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["LED_GU10_OWDT"],
        model: "ZM350STW1TCF",
        vendor: "Leedarson",
        description: "LED PAR16 50 GU10 tunable white",
        extend: [m.light({colorTemp: {range: undefined, startup: false}})],
    },
    {
        zigbeeModel: ["M350ST-W1R-01", "A470S-A7R-04"],
        model: "M350STW1",
        vendor: "Leedarson",
        description: "LED PAR16 50 GU10",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["LED_E27_ORD"],
        model: "A806S-Q1G",
        vendor: "Leedarson",
        description: "LED E27 color",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["ZHA-DimmableLight"],
        model: "A806S-Q1R",
        vendor: "Leedarson",
        description: "LED E27 tunable white",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["LED_E27_OWDT"],
        model: "ZA806SQ1TCF",
        vendor: "Leedarson",
        description: "LED E27 tunable white",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["ZBT-CCTSwitch-D0001"],
        model: "6ARCZABZH",
        vendor: "Leedarson",
        description: "4-Key Remote Controller",
        fromZigbee: [fz.command_on, fz.command_off, fzLocal.CCTSwitch_D0001_levelctrl, fzLocal.CCTSwitch_D0001_lighting, fz.battery],
        exposes: [
            e.battery(),
            e.action([
                "colortemp_up_release",
                "colortemp_down_release",
                "on",
                "off",
                "brightness_up",
                "brightness_down",
                "colortemp_up",
                "colortemp_down",
                "colortemp_up_hold",
                "colortemp_down_hold",
            ]),
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["TWGU10Bulb02UK"],
        model: "6xy-M350ST-W1Z",
        vendor: "Leedarson",
        description: "PAR16 tunable white",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        fingerprint: [{modelID: "ZHA-PIRSensor", manufacturerName: "Leedarson"}],
        model: "5AA-SS-ZA-H0",
        vendor: "Leedarson",
        description: "Motion sensor",
        fromZigbee: [fz.occupancy, fz.ignore_occupancy_report],
        toZigbee: [],
        exposes: [e.occupancy()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["ZB-SMART-PIRTH-V1"],
        model: "7A-SS-ZABC-H0",
        vendor: "Leedarson",
        description: "4-in-1-Sensor",
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1, fz.temperature, fz.humidity, fz.ignore_occupancy_report],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.temperature(), e.humidity()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["ZB-MotionSensor-S0000"],
        model: "8A-SS-BA-H0",
        vendor: "Leedarson",
        description: "Motion Sensor",
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_occupancy_report],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy()],
    },
    {
        zigbeeModel: ["LDHD2AZW"],
        model: "LDHD2AZW",
        vendor: "Leedarson",
        description: "Magnetic door & window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
];
