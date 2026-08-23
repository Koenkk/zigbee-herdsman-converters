import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["URC4470BC0-X-R"],
        model: "XHS1-UE",
        vendor: "Universal Electronics Inc",
        description: "Wireless digital pet resistant PIR detector",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ["URC4460BC0-X-R"],
        model: "XHS2-UE",
        vendor: "Universal Electronics Inc",
        description: "Magnetic door & window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 2800}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            // longPollInterval ships at 8 qs (2 s); the ZHA driver writes 24 qs (6 s).
            // At 2 s: 43,200 MAC polls/day vs 14,400/day at 6 s — 3× drain difference.
            // longPollInterval is read-only; must be set via setLongPollInterval command (0x02).
            try {
                await endpoint.command("genPollCtrl", "setLongPollInterval", {newLongPollInterval: 24});
                await endpoint.write("genPollCtrl", {checkinInterval: 13200});
            } catch {
                // Sleepy device may not ack before going to sleep; not fatal.
            }
        },
        onEvent: async (event) => {
            // Battery replacement resets longPollInterval to factory default (8 qs / 2 s).
            // Reapply on deviceAnnounce to restore the correct value after every battery swap.
            if (event.type === "deviceAnnounce") {
                const endpoint = event.data?.device?.getEndpoint(1);
                if (!endpoint) return;
                try {
                    await endpoint.command("genPollCtrl", "setLongPollInterval", {newLongPollInterval: 24});
                    await endpoint.write("genPollCtrl", {checkinInterval: 13200});
                } catch {
                    // Will retry on next announce.
                }
            }
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ["URC4450BC0-X-R"],
        model: "XHK1-UE",
        vendor: "Universal Electronics Inc",
        description: "Xfinity security keypad",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [
            fz.command_arm_with_transaction,
            fz.temperature,
            fz.battery,
            fz.ias_occupancy_alarm_1,
            fz.identify,
            fz.ias_contact_alarm_1,
            fz.ias_ace_occupancy_with_timeout,
        ],
        toZigbee: [tz.arm_mode],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.occupancy(),
            e.battery_low(),
            e.tamper(),
            e.presence(),
            e.contact(),
            e.temperature(),
            e.numeric("action_code", ea.STATE).withDescription("Pin code introduced."),
            e.numeric("action_transaction", ea.STATE).withDescription("Last action transaction number."),
            e.text("action_zone", ea.STATE).withDescription("Alarm zone. Default value 0"),
            e.action(["disarm", "arm_day_zones", "identify", "arm_night_zones", "arm_all_zones", "exit_delay", "emergency"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ["msTemperatureMeasurement", "genPowerCfg", "ssIasZone", "ssIasAce", "genBasic", "genIdentify"];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        extend: [m.iasGetPanelStatusResponse()],
    },
    {
        zigbeeModel: ["H34450BA00-00007"],
        model: "UEHK2AZ0",
        vendor: "Universal Electronics Inc",
        description: "Xfinity security keypad",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [
            fz.command_arm_with_transaction,
            fz.temperature,
            fz.battery,
            fz.ias_occupancy_alarm_1,
            fz.identify,
            fz.ias_contact_alarm_1,
            fz.ias_ace_occupancy_with_timeout,
        ],
        toZigbee: [tz.arm_mode],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.occupancy(),
            e.battery_low(),
            e.tamper(),
            e.presence(),
            e.contact(),
            e.temperature(),
            e.numeric("action_code", ea.STATE).withDescription("Pin code introduced."),
            e.numeric("action_transaction", ea.STATE).withDescription("Last action transaction number."),
            e.text("action_zone", ea.STATE).withDescription("Alarm zone. Default value 0"),
            e.action(["disarm", "arm_day_zones", "identify", "arm_night_zones", "arm_all_zones", "exit_delay", "emergency"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ["msTemperatureMeasurement", "genPowerCfg", "ssIasZone", "ssIasAce", "genBasic", "genIdentify"];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        extend: [m.iasGetPanelStatusResponse()],
    },
];
