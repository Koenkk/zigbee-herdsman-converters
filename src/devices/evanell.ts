import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_dmfguuli", "_TZE200_rxypyjkw"]),
        model: "EZ200",
        vendor: "Evanell",
        description: "Thermostatic radiator valve",
        fromZigbee: [legacy.fz.evanell_thermostat],
        toZigbee: [
            legacy.tz.evanell_thermostat_current_heating_setpoint,
            legacy.tz.evanell_thermostat_system_mode,
            legacy.tz.evanell_thermostat_child_lock,
        ],
        extend: [tuya.modernExtend.tuyaBase({timeStart: "2000", bindBasicOnConfigure: true})],
        exposes: [
            e.child_lock(),
            e.battery(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "heat", "auto"], ea.STATE_SET),
        ],
    },
];
