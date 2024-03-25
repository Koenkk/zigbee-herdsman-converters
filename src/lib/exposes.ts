/* eslint max-len: 0 */
/* eslint camelcase: 0 */

import assert from 'assert';
import {Access, Range} from './types';
import {getLabelFromName} from './utils';

export type Feature = Numeric | Binary | Enum | Composite | List | Text;

export class Base {
    name: string;
    label: string;
    access: number;
    type: 'switch' | 'lock' | 'binary' | 'list' | 'numeric' | 'enum' | 'text' | 'composite' | 'light' | 'cover' | 'fan' | 'climate';
    endpoint?: string;
    property?: string;
    description?: string;
    features?: Feature[];
    category?: 'config' | 'diagnostic';

    withEndpoint(endpointName: string) {
        this.endpoint = endpointName;

        if (this.property) {
            this.property = `${this.property}_${this.endpoint}`;
        }

        if (this.features) {
            for (const feature of this.features) {
                if (feature.property) {
                    feature.property = `${feature.property}_${endpointName}`;
                    feature.endpoint = endpointName;
                }
            }
        }

        return this;
    }

    withAccess(a: number) {
        assert(this.access !== undefined, 'Cannot add access if not defined yet');
        this.access = a;
        this.validateCategory();
        return this;
    }

    withProperty(property: string) {
        this.property = property;
        return this;
    }

    withLabel(label: string) {
        this.label = label;
        return this;
    }

    withDescription(description: string) {
        this.description = description;
        return this;
    }

    withCategory(category: 'config' | 'diagnostic') {
        this.category = category;
        this.validateCategory();
        return this;
    }

    validateCategory() {
        switch (this.category) {
        case 'config':
            assert(this.access & a.SET, 'Config expose must be settable');
            break;
        case 'diagnostic':
            assert(!(this.access & a.SET), 'Diagnostic expose must not be settable');
            break;
        }
    }

    addFeature(feature: Feature) {
        assert(this.features, 'Does not have any features');
        if (this.endpoint) feature.withEndpoint(this.endpoint);
        this.features.push(feature);
    }

    removeFeature(feature: string) {
        assert(this.features, 'Does not have any features');
        const f = this.features.find((f) => f.name === feature);
        assert(f, `Does not have feature '${feature}'`);
        this.features.splice(this.features.indexOf(f), 1);
        return this;
    }

    setAccess(feature: string, a: number) {
        assert(this.features, 'Does not have any features');
        const f = this.features.find((f) => f.name === feature);
        assert(f.access !== a, `Access mode not changed for '${f.name}'`);
        f.access = a;
        f.validateCategory();
        return this;
    }
}

export class Switch extends Base {
    constructor() {
        super();
        this.type = 'switch';
        this.features = [];
    }

    withState(property: string, toggle: string | boolean, description: string, access=a.ALL, value_on='ON', value_off='OFF') {
        const feature = new Binary('state', access, value_on, value_off).withProperty(property).withDescription(description);
        if (toggle) {
            feature.withValueToggle('TOGGLE');
        }

        this.addFeature(feature);
        return this;
    }
}

export class Lock extends Base {
    constructor() {
        super();
        this.type = 'lock';
        this.features = [];
    }

    withState(property: string, valueOn: string, valueOff: string, description: string, access=a.ALL) {
        this.addFeature(new Binary('state', access, valueOn, valueOff).withProperty(property).withDescription(description));
        return this;
    }

    withLockState(property: string, description: string) {
        this.addFeature(new Enum('lock_state', access.STATE, ['not_fully_locked', 'locked', 'unlocked']).withProperty(property).withDescription(description));
        return this;
    }
}

export class Binary extends Base {
    value_on: string|boolean;
    value_off: string|boolean;
    value_toggle?: string;

    constructor(name: string, access: number, valueOn: string|boolean, valueOff: string|boolean) {
        super();
        this.type = 'binary';
        this.name = name;
        this.label = getLabelFromName(name);
        this.property = name;
        this.access = access;
        this.value_on = valueOn;
        this.value_off = valueOff;
    }

    withValueToggle(value: string) {
        this.value_toggle = value;
        return this;
    }
}

export class List extends Base {
    item_type: Numeric | Binary | Composite | Text;
    length_min?: number;
    length_max?: number;

    constructor(name: string, access: number, itemType: Numeric | Binary | Composite | Text) {
        super();
        this.type = 'list';
        this.name = name;
        this.label = getLabelFromName(name);
        this.property = name;
        this.access = access;
        this.item_type = itemType;
        delete this.item_type.property;
    }

    withLengthMin(value: number) {
        this.length_min = value;
        return this;
    }

    withLengthMax(value: number) {
        this.length_max = value;
        return this;
    }
}

export class Numeric extends Base {
    unit?: string;
    value_max?: number;
    value_min?: number;
    value_step?: number;
    presets?:{name: string, value: number | string, description: string}[];

    constructor(name: string, access: number) {
        super();
        this.type = 'numeric';
        this.name = name;
        this.label = getLabelFromName(name);
        this.property = name;
        this.access = access;
    }

    withUnit(unit: string) {
        this.unit = unit;
        return this;
    }

    withValueMax(value: number) {
        this.value_max = value;
        return this;
    }

    withValueMin(value: number) {
        this.value_min = value;
        return this;
    }

    withValueStep(value: number) {
        this.value_step = value;
        return this;
    }

    withPreset(name: string, value: number | string, description: string) {
        if (!this.presets) this.presets = [];
        this.presets.push({name, value, description});
        return this;
    }
}

export class Enum extends Base {
    values: (string|number)[];

    constructor(name: string, access: number, values: (string|number)[]) {
        super();
        this.type = 'enum';
        this.name = name;
        this.label = getLabelFromName(name);
        this.property = name;
        this.access = access;
        this.values = values;
    }
}

export class Text extends Base {
    constructor(name: string, access: number) {
        super();
        this.type = 'text';
        this.name = name;
        this.label = getLabelFromName(name);
        this.property = name;
        this.access = access;
    }
}

export class Composite extends Base {
    constructor(name: string, property: string, access: number) {
        super();
        this.type = 'composite';
        this.property = property;
        this.name = name;
        this.label = getLabelFromName(name);
        this.features = [];
        this.access = access;
    }

    withFeature(feature: Feature) {
        this.addFeature(feature);
        return this;
    }
}

export class Light extends Base {
    constructor() {
        super();
        this.type = 'light';
        this.features = [];
        this.addFeature(new Binary('state', access.ALL, 'ON', 'OFF').withValueToggle('TOGGLE').withDescription('On/off state of this light'));
    }

    withBrightness() {
        this.addFeature(new Numeric('brightness', access.ALL).withValueMin(0).withValueMax(254).withDescription('Brightness of this light'));
        return this;
    }

    withMinBrightness() {
        this.addFeature(new Numeric('min_brightness', access.ALL).withValueMin(1).withValueMax(255).withDescription('Minimum light brightness'));
        return this;
    }

    withMaxBrightness() {
        this.addFeature(new Numeric('max_brightness', access.ALL).withValueMin(1).withValueMax(255).withDescription('Maximum light brightness'));
        return this;
    }

    withLevelConfig(disableFeatures: string[] = []) {
        let levelConfig = new Composite('level_config', 'level_config', access.ALL);
        if (!disableFeatures.includes('on_off_transition_time')) {
            levelConfig = levelConfig.withFeature(new Numeric('on_off_transition_time', access.ALL)
                .withLabel('ON/OFF transition time')
                .withDescription('Represents the time taken to move to or from the target level when On of Off commands are received by an On/Off cluster'));
        }
        if (!disableFeatures.includes('on_transition_time')) {
            levelConfig = levelConfig.withFeature(new Numeric('on_transition_time', access.ALL)
                .withLabel('ON transition time')
                .withPreset('disabled', 65535, 'Use on_off_transition_time value')
                .withDescription('Represents the time taken to move the current level from the minimum level to the maximum level when an On command is received'));
        }
        if (!disableFeatures.includes('off_transition_time')) {
            levelConfig = levelConfig.withFeature(new Numeric('off_transition_time', access.ALL)
                .withLabel('OFF transition time')
                .withPreset('disabled', 65535, 'Use on_off_transition_time value')
                .withDescription('Represents the time taken to move the current level from the maximum level to the minimum level when an Off command is received'));
        }
        if (!disableFeatures.includes('execute_if_off')) {
            levelConfig = levelConfig.withFeature(new Binary('execute_if_off', access.ALL, true, false)
                .withDescription('this setting can affect the "on_level", "current_level_startup" or "brightness" setting'));
        }
        if (!disableFeatures.includes('on_level')) {
            levelConfig = levelConfig.withFeature(new Numeric('on_level', access.ALL)
                .withValueMin(1).withValueMax(254)
                .withPreset('previous', 255, 'Use previous value')
                .withDescription('Specifies the level that shall be applied, when an on/toggle command causes the light to turn on.'));
        }
        if (!disableFeatures.includes('current_level_startup')) {
            levelConfig = levelConfig.withFeature(new Numeric('current_level_startup', access.ALL)
                .withValueMin(1).withValueMax(254)
                .withPreset('minimum', 0, 'Use minimum permitted value')
                .withPreset('previous', 255, 'Use previous value')
                .withDescription('Defines the desired startup level for a device when it is supplied with power'));
        }
        levelConfig = levelConfig.withDescription('Configure genLevelCtrl');
        this.addFeature(levelConfig);
        return this;
    }

    withColorTemp(range: Range) {
        const rangeProvided = range !== undefined;
        if (range === undefined) {
            range = [150, 500];
        }

        const feature = new Numeric('color_temp', access.ALL).withUnit('mired').withValueMin(range[0]).withValueMax(range[1])
            .withDescription('Color temperature of this light');

        if (process.env.ZHC_TEST) {
            // @ts-ignore
            feature._colorTempRangeProvided = rangeProvided;
        }

        [
            {name: 'coolest', value: range[0], description: 'Coolest temperature supported'},
            {name: 'cool', value: 250, description: 'Cool temperature (250 mireds / 4000 Kelvin)'},
            {name: 'neutral', value: 370, description: 'Neutral temperature (370 mireds / 2700 Kelvin)'},
            {name: 'warm', value: 454, description: 'Warm temperature (454 mireds / 2200 Kelvin)'},
            {name: 'warmest', value: range[1], description: 'Warmest temperature supported'},
        ].filter((p) => p.value >= range[0] && p.value <= range[1]).forEach((p) => feature.withPreset(p.name, p.value, p.description));

        this.addFeature(feature);
        return this;
    }

    withColorTempStartup(range: Range) {
        if (range === undefined) {
            range = [150, 500];
        }

        const feature = new Numeric('color_temp_startup', access.ALL).withUnit('mired').withValueMin(range[0]).withValueMax(range[1])
            .withDescription('Color temperature after cold power on of this light');

        [
            {name: 'coolest', value: range[0], description: 'Coolest temperature supported'},
            {name: 'cool', value: 250, description: 'Cool temperature (250 mireds / 4000 Kelvin)'},
            {name: 'neutral', value: 370, description: 'Neutral temperature (370 mireds / 2700 Kelvin)'},
            {name: 'warm', value: 454, description: 'Warm temperature (454 mireds / 2200 Kelvin)'},
            {name: 'warmest', value: range[1], description: 'Warmest temperature supported'},
        ].filter((p) => p.value >= range[0] && p.value <= range[1]).forEach((p) => feature.withPreset(p.name, p.value, p.description));
        feature.withPreset('previous', 65535, 'Restore previous color_temp on cold power on');

        this.addFeature(feature);
        return this;
    }

    withColor(types: ('xy' | 'hs')[]) {
        for (const type of types) {
            if (type === 'xy') {
                const colorXY = new Composite('color_xy', 'color', access.ALL)
                    .withLabel('Color (X/Y)')
                    .withFeature(new Numeric('x', access.ALL))
                    .withFeature(new Numeric('y', access.ALL))
                    .withDescription('Color of this light in the CIE 1931 color space (x/y)');
                this.addFeature(colorXY);
            } else if (type === 'hs') {
                const colorHS = new Composite('color_hs', 'color', access.ALL)
                    .withLabel('Color (HS)')
                    .withFeature(new Numeric('hue', access.ALL))
                    .withFeature(new Numeric('saturation', access.ALL))
                    .withDescription('Color of this light expressed as hue/saturation');
                this.addFeature(colorHS);
            } else {
                assert(false, `Unsupported color type ${type}`);
            }
        }

        return this;
    }
}

export class Cover extends Base {
    constructor() {
        super();
        this.type = 'cover';
        this.features = [];
        this.addFeature(new Enum('state', a.STATE_SET, ['OPEN', 'CLOSE', 'STOP']));
    }

    withPosition() {
        this.addFeature(new Numeric('position', access.ALL).withValueMin(0).withValueMax(100).withDescription('Position of this cover').withUnit('%'));
        return this;
    }

    withTilt() {
        this.addFeature(new Numeric('tilt', access.ALL).withValueMin(0).withValueMax(100).withDescription('Tilt of this cover').withUnit('%'));
        return this;
    }
}

export class Fan extends Base {
    constructor() {
        super();
        this.type = 'fan';
        this.features = [];
        this.addFeature(new Binary('state', access.ALL, 'ON', 'OFF').withDescription('On/off state of this fan').withProperty('fan_state'));
    }

    withModes(modes: string[], access=a.ALL) {
        this.addFeature(new Enum('mode', access, modes).withProperty('fan_mode').withDescription('Mode of this fan'));
        return this;
    }
}

export class Climate extends Base {
    constructor() {
        super();
        this.type = 'climate';
        this.features = [];
    }

    withSetpoint(property: string, min: number, max: number, step: number, access=a.ALL) {
        assert(['occupied_heating_setpoint', 'current_heating_setpoint', 'occupied_cooling_setpoint', 'unoccupied_heating_setpoint', 'unoccupied_cooling_setpoint'].includes(property));
        this.addFeature(new Numeric(property, access)
            .withValueMin(min).withValueMax(max).withValueStep(step).withUnit('°C').withDescription('Temperature setpoint'));
        return this;
    }

    withLocalTemperature(access=a.STATE_GET, description='Current temperature measured on the device') {
        this.addFeature(new Numeric('local_temperature', access).withUnit('°C').withDescription(description));
        return this;
    }

    withLocalTemperatureCalibration(min=-12.8, max=12.7, step=0.1, access=a.ALL) {
        // For devices following the ZCL local_temperature_calibration is an int8, so min = -12.8 and max 12.7
        this.addFeature(new Numeric('local_temperature_calibration', access)
            .withValueMin(min).withValueMax(max).withValueStep(step).withUnit('°C').withDescription('Offset to add/subtract to the local temperature'));
        return this;
    }

    withSystemMode(modes: string[], access=a.ALL, description='Mode of this device') {
        const allowed = ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only', 'sleep', 'emergency_heating'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.addFeature(new Enum('system_mode', access, modes).withDescription(description));
        return this;
    }

    withRunningState(modes: string[], access=a.STATE_GET) {
        const allowed = ['idle', 'heat', 'cool', 'fan_only'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.addFeature(new Enum('running_state', access, modes).withDescription('The current running state'));
        return this;
    }

    withRunningMode(modes: string[], access=a.STATE_GET) {
        const allowed = ['off', 'cool', 'heat'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.addFeature(new Enum('running_mode', access, modes).withDescription('The current running mode'));
        return this;
    }

    withFanMode(modes: string[], access=a.ALL) {
        const allowed = ['off', 'low', 'medium', 'high', 'on', 'auto', 'smart'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.addFeature(new Enum('fan_mode', access, modes).withDescription('Mode of the fan'));
        return this;
    }

    withSwingMode(modes: string[], access=a.ALL) {
        this.addFeature(new Enum('swing_mode', access, modes).withDescription('Swing mode'));
        return this;
    }

    withPreset(modes: string[], description='Mode of this device (similar to system_mode)') {
        this.addFeature(new Enum('preset', access.STATE_SET, modes).withDescription(description));
        return this;
    }

    withPiHeatingDemand(access=a.STATE) {
        this.addFeature(new Numeric('pi_heating_demand', access).withLabel('PI heating demand').withValueMin(0).withValueMax(100).withUnit('%').withDescription('Position of the valve (= demanded heat) where 0% is fully closed and 100% is fully open'));
        return this;
    }

    withControlSequenceOfOperation(modes: string[], access=a.STATE) {
        const allowed = ['cooling_only', 'cooling_with_reheat', 'heating_only', 'heating_with_reheat', 'cooling_and_heating_4-pipes', 'cooling_and_heating_4-pipes_with_reheat'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.addFeature(new Enum('control_sequence_of_operation', access, modes).withDescription('Operating environment of the thermostat'));
        return this;
    }

    withAcLouverPosition(positions: string[], access=a.ALL) {
        const allowed = ['fully_open', 'fully_closed', 'half_open', 'quarter_open', 'three_quarters_open'];
        positions.forEach((m) => assert(allowed.includes(m)));
        this.addFeature(new Enum('ac_louver_position', access, positions).withLabel('AC louver position').withDescription('AC louver position of this device'));
        return this;
    }

    withWeeklySchedule(modes: string[], access=a.ALL) {
        const allowed = ['heat', 'cool'];
        modes.forEach((m) => assert(allowed.includes(m)));

        const featureDayOfWeek = new List('dayofweek', a.SET, new Composite('day', 'dayofweek', a.SET).withFeature(new Enum('day', a.SET, [
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
            'saturday', 'sunday', 'away_or_vacation',
        ]))).withLabel('Day of week').withLengthMin(1).withLengthMax(8).withDescription('Days on which the schedule will be active.');

        const featureTransitionTime = new Composite('time', 'transitionTime', a.SET)
            .withFeature(new Numeric('hour', a.SET))
            .withFeature(new Numeric('minute', a.SET))
            .withDescription('Trigger transition X minutes after 00:00.');
        const featureTransitionHeatSetPoint = new Numeric('heatSetpoint', a.SET)
            .withLabel('Heat setpoint')
            .withDescription('Target heat setpoint');
        const featureTransitionCoolSetPoint = new Numeric('coolSetpoint', a.SET)
            .withLabel('Cool setpoint')
            .withDescription('Target cool setpoint');
        let featureTransition = new Composite('transition', 'transition', a.SET).withFeature(featureTransitionTime);
        if (modes.includes('heat')) featureTransition = featureTransition.withFeature(featureTransitionHeatSetPoint);
        if (modes.includes('cool')) featureTransition = featureTransition.withFeature(featureTransitionCoolSetPoint);
        const featureTransitions = new List('transitions', a.SET, featureTransition)
            .withLengthMin(1).withLengthMax(10);

        const schedule = new Composite('schedule', 'weekly_schedule', access)
            .withFeature(featureDayOfWeek)
            .withFeature(featureTransitions);

        this.addFeature(schedule);
        return this;
    }
}
/**
 * The access property is a 3-bit bitmask.
 */
export const access: {
    STATE: Access,
    SET: Access,
    GET: Access,
    STATE_SET: Access,
    STATE_GET: Access,
    ALL: Access,
} = {
    /**
     * Bit 0: The property can be found in the published state of this device
     */
    STATE: 0b001,
    /**
     * Bit 1: The property can be set with a /set command
     */
    SET: 0b010,
    /**
     * Bit 2: The property can be retrieved with a /get command
     */
    GET: 0b100,
    /**
     * Bitwise inclusive OR of STATE and SET : 0b001 | 0b010
     */
    STATE_SET: 0b011,
    /**
     * Bitwise inclusive OR of STATE and GET : 0b001 | 0b100
     */
    STATE_GET: 0b101,
    /**
     * Bitwise inclusive OR of STATE and GET and SET : 0b001 | 0b100 | 0b010
     */
    ALL: 0b111,
};

const a = access;

export const options = {
    calibration: (name: string, type='absolute') => new Numeric(`${name}_calibration`, access.SET).withDescription(`Calibrates the ${name} value (${type} offset), takes into effect on next report of device.`),
    precision: (name: string) => new Numeric(`${name}_precision`, access.SET).withValueMin(0).withValueMax(3).withDescription(`Number of digits after decimal point for ${name}, takes into effect on next report of device. This option can only decrease the precision, not increase it.`),
    invert_cover: () => new Binary(`invert_cover`, access.SET, true, false).withDescription(`Inverts the cover position, false: open=100,close=0, true: open=0,close=100 (default false).`),
    color_sync: () => new Binary(`color_sync`, access.SET, true, false).withDescription(`When enabled colors will be synced, e.g. if the light supports both color x/y and color temperature a conversion from color x/y to color temperature will be done when setting the x/y color (default true).`),
    thermostat_unit: () => new Enum('thermostat_unit', access.SET, ['celsius', 'fahrenheit']).withDescription('Controls the temperature unit of the thermostat (default celsius).'),
    expose_pin: () => new Binary(`expose_pin`, access.SET, true, false).withLabel('Expose PIN').withDescription(`Expose pin of this lock in the published payload (default false).`),
    occupancy_timeout: () => new Numeric(`occupancy_timeout`, access.SET).withValueMin(0).withDescription('Time in seconds after which occupancy is cleared after detecting it (default 90 seconds).'),
    occupancy_timeout_2: () => new Numeric(`occupancy_timeout`, access.SET).withValueMin(0).withValueStep(0.1).withUnit('s').withDescription('Time in seconds after which occupancy is cleared after detecting it (default is "detection_interval" + 2 seconds). The value must be equal to or greater than "detection_interval", and it can also be a fraction.'),
    vibration_timeout: () => new Numeric(`vibration_timeout`, access.SET).withValueMin(0).withDescription('Time in seconds after which vibration is cleared after detecting it (default 90 seconds).'),
    simulated_brightness: (extraNote='') => new Composite('simulated_brightness', 'simulated_brightness', access.SET)
        .withDescription(`Simulate a brightness value. If this device provides a brightness_move_up or brightness_move_down action it is possible to specify the update interval and delta. The action_brightness_delta indicates the delta for each interval. ${extraNote}`)
        .withFeature(new Numeric('delta', access.SET).withValueMin(0).withDescription('Delta per interval, 20 by default'))
        .withFeature(new Numeric('interval', access.SET).withValueMin(0).withUnit('ms').withDescription('Interval duration')),
    no_occupancy_since_true: () => new List(`no_occupancy_since`, access.SET, new Numeric('time', access.STATE_SET)).withDescription('Sends a message the last time occupancy (occupancy: true) was detected. When setting this for example to [10, 60] a `{"no_occupancy_since": 10}` will be send after 10 seconds and a `{"no_occupancy_since": 60}` after 60 seconds.'),
    no_occupancy_since_false: () => new List(`no_occupancy_since`, access.SET, new Numeric('time', access.STATE_SET)).withDescription('Sends a message after the last time no occupancy (occupancy: false) was detected. When setting this for example to [10, 60] a `{"no_occupancy_since": 10}` will be send after 10 seconds and a `{"no_occupancy_since": 60}` after 60 seconds.'),
    presence_timeout: () => new Numeric(`presence_timeout`, access.SET).withValueMin(0).withDescription('Time in seconds after which presence is cleared after detecting it (default 100 seconds).'),
    no_position_support: () => new Binary('no_position_support', access.SET, true, false).withDescription('Set to true when your device only reports position 0, 100 and 50 (in this case your device has an older firmware) (default false).'),
    transition: () => new Numeric(`transition`, access.SET).withValueMin(0).withDescription('Controls the transition time (in seconds) of on/off, brightness, color temperature (if applicable) and color (if applicable) changes. Defaults to `0` (no transition).'),
    legacy: () => new Binary(`legacy`, access.SET, true, false).withDescription(`Set to false to disable the legacy integration (highly recommended), will change structure of the published payload (default true).`),
    measurement_poll_interval: (extraNote='') => new Numeric(`measurement_poll_interval`, access.SET).withValueMin(-1).withDescription(`This device does not support reporting electric measurements so it is polled instead. The default poll interval is 60 seconds, set to -1 to disable.${extraNote}`),
    illuminance_below_threshold_check: () => new Binary(`illuminance_below_threshold_check`, access.SET, true, false).withDescription(`Set to false to also send messages when illuminance is above threshold in night mode (default true).`),
    state_action: () => new Binary(`state_action`, access.SET, true, false).withDescription(`State actions will also be published as 'action' when true (default false).`),
    identify_timeout: () => new Numeric('identify_timeout', access.SET).withDescription('Sets duration of identification procedure in seconds (i.e., how long device would flash). Value ranges from 1 to 30 seconds (default 3).').withValueMin(1).withValueMax(30),
};

export const presets = {
    // Generic
    binary: (name: string, access: number, valueOn: string | boolean, valueOff: string | boolean) => new Binary(name, access, valueOn, valueOff),
    climate: () => new Climate(),
    composite: (name: string, property: string, access: number) => new Composite(name, property, access),
    cover: () => new Cover(),
    enum: (name: string, access: number, values: (string|number)[]) => new Enum(name, access, values),
    light: () => new Light(),
    numeric: (name: string, access: number) => new Numeric(name, access),
    text: (name: string, access: number) => new Text(name, access),
    list: (name: string, access: number, itemType: Feature) => new List(name, access, itemType),
    switch_: () => new Switch(),
    // Specific
    ac_frequency: () => new Numeric('ac_frequency', access.STATE).withLabel('AC frequency').withUnit('Hz').withDescription('Measured electrical AC frequency'),
    action: (values: string[]) => new Enum('action', access.STATE, values).withDescription('Triggered action (e.g. a button click)').withCategory('diagnostic'),
    action_duration: () => new Numeric('action_duration', access.STATE).withUnit('s').withDescription('Triggered action duration in seconds').withCategory('diagnostic'),
    action_group: () => new Numeric('action_group', access.STATE).withDescription('Group where the action was triggered on'),
    angle: (name: string) => new Numeric(name, access.STATE).withValueMin(-360).withValueMax(360).withUnit('°'),
    angle_axis: (name: string) => new Numeric(name, access.STATE).withValueMin(-90).withValueMax(90).withUnit('°'),
    aqi: () => new Numeric('aqi', access.STATE).withDescription('Air quality index'),
    auto_lock: () => new Switch().withLabel('Auto lock').withState('auto_lock', false, 'Enable/disable auto lock', access.STATE_SET, 'AUTO', 'MANUAL'),
    auto_off: (offTime: number) => new Binary('auto_off', access.ALL, true, false).withLabel('Auto OFF').withDescription(`Turn the device automatically off when attached device consumes less than 2W for ${offTime} minutes`).withCategory('config'),
    auto_relock_time: () => new Numeric('auto_relock_time', access.ALL).withValueMin(0).withUnit('s').withDescription('The number of seconds to wait after unlocking a lock before it automatically locks again. 0=disabled'),
    away_mode: () => new Switch().withLabel('Away mode').withState('away_mode', false, 'Enable/disable away mode', access.STATE_SET),
    away_preset_days: () => new Numeric('away_preset_days', access.STATE_SET).withDescription('Away preset days').withValueMin(0).withValueMax(100),
    away_preset_temperature: () => new Numeric('away_preset_temperature', access.STATE_SET).withUnit('°C').withDescription('Away preset temperature').withValueMin(-10).withValueMax(35).withCategory('config'),
    battery: () => new Numeric('battery', access.STATE).withUnit('%').withDescription('Remaining battery in %, can take up to 24 hours before reported').withValueMin(0).withValueMax(100).withCategory('diagnostic'),
    battery_low: () => new Binary('battery_low', access.STATE, true, false).withDescription('Indicates if the battery of this device is almost empty').withCategory('diagnostic'),
    battery_voltage: () => new Numeric('voltage', access.STATE).withUnit('mV').withDescription('Voltage of the battery in millivolts').withCategory('diagnostic'),
    boost_time: () => new Numeric('boost_time', access.STATE_SET).withUnit('s').withDescription('Boost time').withValueMin(0).withValueMax(900),
    button_lock: () => new Binary('button_lock', access.ALL, 'ON', 'OFF').withDescription('Disables the physical switch button').withCategory('config'),
    calibrated: () => new Binary('calibrated', access.STATE, true, false).withDescription('Indicates if this device is calibrated').withCategory('diagnostic'),
    carbon_monoxide: () => new Binary('carbon_monoxide', access.STATE, true, false).withDescription('Indicates if CO (carbon monoxide) is detected'),
    child_lock: () => new Lock().withLabel('Child lock').withState('child_lock', 'LOCK', 'UNLOCK', 'Enables/disables physical input on the device', access.STATE_SET),
    child_lock_bool: () => new Binary('child_lock', access.ALL, true, false).withDescription('Unlocks/locks physical input on the device').withCategory('config'),
    co2: () => new Numeric('co2', access.STATE).withLabel('CO2').withUnit('ppm').withDescription('The measured CO2 (carbon dioxide) value'),
    co: () => new Numeric('co', access.STATE).withLabel('CO').withUnit('ppm').withDescription('The measured CO (carbon monoxide) value'),
    comfort_temperature: () => new Numeric('comfort_temperature', access.STATE_SET).withUnit('°C').withDescription('Comfort temperature').withValueMin(0).withValueMax(30),
    consumer_connected: () => new Binary('consumer_connected', access.STATE, true, false).withDescription('Indicates whether a plug is physically attached. Device does not have to pull power or even be connected electrically (state of this binary switch can be ON even if main power switch is OFF)').withCategory('diagnostic'),
    contact: () => new Binary('contact', access.STATE, false, true).withDescription('Indicates if the contact is closed (= true) or open (= false)'),
    cover_position: () => new Cover().withPosition(),
    cover_position_tilt: () => new Cover().withPosition().withTilt(),
    cover_tilt: () => new Cover().withTilt(),
    cpu_temperature: () => new Numeric('cpu_temperature', access.STATE).withLabel('CPU temperature').withUnit('°C').withDescription('Temperature of the CPU'),
    cube_side: (name: string) => new Numeric(name, access.STATE).withDescription('Side of the cube').withValueMin(0).withValueMax(6).withValueStep(1),
    current: () => new Numeric('current', access.STATE).withUnit('A').withDescription('Instantaneous measured electrical current').withCategory('diagnostic'),
    current_phase_b: () => new Numeric('current_phase_b', access.STATE).withLabel('Current phase B').withUnit('A').withDescription('Instantaneous measured electrical current on phase B'),
    current_phase_c: () => new Numeric('current_phase_c', access.STATE).withLabel('Current phase C').withUnit('A').withDescription('Instantaneous measured electrical current on phase C'),
    deadzone_temperature: () => new Numeric('deadzone_temperature', access.STATE_SET).withUnit('°C').withDescription('The delta between local_temperature and current_heating_setpoint to trigger Heat').withValueMin(0).withValueMax(5).withValueStep(1),
    detection_interval: () => new Numeric('detection_interval', access.ALL).withValueMin(2).withValueMax(65535).withUnit('s').withDescription('Time interval between action detection.').withCategory('config'),
    device_temperature: () => new Numeric('device_temperature', access.STATE).withUnit('°C').withDescription('Temperature of the device').withCategory('diagnostic'),
    eco2: () => new Numeric('eco2', access.STATE).withLabel('eCO2').withLabel('PPM').withUnit('ppm').withDescription('Measured eCO2 value'),
    eco_mode: () => new Binary('eco_mode', access.STATE_SET, 'ON', 'OFF').withDescription('ECO mode (energy saving mode)'),
    eco_temperature: () => new Numeric('eco_temperature', access.STATE_SET).withUnit('°C').withDescription('Eco temperature').withValueMin(0).withValueMax(35),
    effect: () => new Enum('effect', access.SET, ['blink', 'breathe', 'okay', 'channel_change', 'finish_effect', 'stop_effect']).withDescription('Triggers an effect on the light (e.g. make light blink for a few seconds)'),
    energy: () => new Numeric('energy', access.STATE).withUnit('kWh').withDescription('Sum of consumed energy'),
    produced_energy: () => new Numeric('produced_energy', access.STATE).withUnit('kWh').withDescription('Sum of produced energy'),
    energy_produced: () => new Numeric('energy_produced', access.STATE).withUnit('kWh').withDescription('Sum of produced energy'),
    fan: () => new Fan(),
    flip_indicator_light: () => new Binary('flip_indicator_light', access.ALL, 'ON', 'OFF').withDescription('After turn on, the indicator light turns on while switch is off, and vice versa').withCategory('config'),
    force: () => new Enum('force', access.STATE_SET, ['normal', 'open', 'close']).withDescription('Force the valve position'),
    formaldehyd: () => new Numeric('formaldehyd', access.STATE).withDescription('The measured formaldehyd value').withUnit('mg/m³'),
    gas: () => new Binary('gas', access.STATE, true, false).withDescription('Indicates whether the device detected gas'),
    hcho: () => new Numeric('hcho', access.STATE).withLabel('HCHO').withUnit('mg/m³').withDescription('Measured HCHO value'),
    holiday_temperature: () => new Numeric('holiday_temperature', access.STATE_SET).withUnit('°C').withDescription('Holiday temperature').withValueMin(0).withValueMax(30),
    humidity: () => new Numeric('humidity', access.STATE).withUnit('%').withDescription('Measured relative humidity'),
    illuminance: () => new Numeric('illuminance', access.STATE).withDescription('Raw measured illuminance'),
    illuminance_lux: () => new Numeric('illuminance_lux', access.STATE).withLabel('Illuminance (lux)').withUnit('lx').withDescription('Measured illuminance in lux'),
    brightness_state: () => new Enum('brightness_state', access.STATE, ['low', 'middle', 'high', 'strong']).withDescription('Brightness state'),
    keypad_lockout: () => new Enum('keypad_lockout', access.ALL, ['unlock', 'lock1', 'lock2']).withDescription('Enables/disables physical input on the device'),
    led_disabled_night: () => new Binary('led_disabled_night', access.ALL, true, false).withLabel('LED disabled night').withDescription('Enable/disable the LED at night').withCategory('config'),
    light_brightness: () => new Light().withBrightness(),
    light_brightness_color: (preferHueAndSaturation: boolean) => new Light().withBrightness().withColor((preferHueAndSaturation ? ['hs', 'xy'] : ['xy', 'hs'])),
    light_brightness_colorhs: () => new Light().withBrightness().withColor(['hs']),
    light_brightness_colortemp: (colorTempRange: Range) => new Light().withBrightness().withColorTemp(colorTempRange).withColorTempStartup(colorTempRange),
    light_brightness_colortemp_color: (colorTempRange?: Range, preferHueAndSaturation?: boolean) => new Light().withBrightness().withColorTemp(colorTempRange).withColorTempStartup(colorTempRange).withColor(preferHueAndSaturation ? ['hs', 'xy'] : ['xy', 'hs']),
    light_brightness_colortemp_colorhs: (colorTempRange: Range) => new Light().withBrightness().withColorTemp(colorTempRange).withColorTempStartup(colorTempRange).withColor(['hs']),
    light_brightness_colortemp_colorxy: (colorTempRange?: Range) => new Light().withBrightness().withColorTemp(colorTempRange).withColorTempStartup(colorTempRange).withColor(['xy']),
    light_brightness_colorxy: () => new Light().withBrightness().withColor((['xy'])),
    light_colorhs: () => new Light().withColor(['hs']),
    light_color_options: () => new Composite('color_options', 'color_options', access.ALL).withDescription('Advanced color behavior')
        .withFeature(new Binary('execute_if_off', access.SET, true, false).withDescription('Controls whether color and color temperature can be set while light is off'))
        .withCategory('config'),
    linkquality: () => new Numeric('linkquality', access.STATE).withUnit('lqi').withDescription('Link quality (signal strength)').withValueMin(0).withValueMax(255).withCategory('diagnostic'),
    local_temperature: () => new Numeric('local_temperature', access.STATE_GET).withUnit('°C').withDescription('Current temperature measured on the device'),
    lock: () => new Lock().withState('state', 'LOCK', 'UNLOCK', 'State of the lock').withLockState('lock_state', 'Actual state of the lock'),
    lock_action: () => new Enum('action', access.STATE, ['unknown', 'lock', 'unlock', 'lock_failure_invalid_pin_or_id', 'lock_failure_invalid_schedule', 'unlock_failure_invalid_pin_or_id', 'unlock_failure_invalid_schedule', 'one_touch_lock', 'key_lock', 'key_unlock', 'auto_lock', 'schedule_lock', 'schedule_unlock', 'manual_lock', 'manual_unlock', 'non_access_user_operational_event']).withDescription('Triggered action on the lock'),
    lock_action_source_name: () => new Enum('action_source_name', access.STATE, ['keypad', 'rfid', 'manual', 'rf']).withDescription('Source of the triggered action on the lock'),
    lock_action_user: () => new Numeric('action_user', access.STATE).withDescription('ID of user that triggered the action on the lock'),
    max_cool_setpoint_limit: (min: number, max: number, step: number) => new Numeric('max_cool_setpoint_limit', access.ALL).withUnit('°C').withDescription('Maximum Cooling set point limit').withValueMin(min).withValueMax(max).withValueStep(step),
    min_cool_setpoint_limit: (min: number, max: number, step: number) => new Numeric('min_cool_setpoint_limit', access.ALL).withUnit('°C').withDescription('Minimum Cooling point limit').withValueMin(min).withValueMax(max).withValueStep(step),
    max_heat_setpoint_limit: (min: number, max: number, step: number) => new Numeric('max_heat_setpoint_limit', access.ALL).withUnit('°C').withDescription('Maximum Heating set point limit').withValueMin(min).withValueMax(max).withValueStep(step),
    min_heat_setpoint_limit: (min: number, max: number, step: number) => new Numeric('min_heat_setpoint_limit', access.ALL).withUnit('°C').withDescription('Minimum Heating set point limit').withValueMin(min).withValueMax(max).withValueStep(step),
    max_temperature: () => new Numeric('max_temperature', access.STATE_SET).withUnit('°C').withDescription('Maximum temperature').withValueMin(15).withValueMax(35),
    max_temperature_limit: () => new Numeric('max_temperature_limit', access.STATE_SET).withUnit('°C').withDescription('Maximum temperature limit. Cuts the thermostat out regardless of air temperature if the external floor sensor exceeds this temperature. Only used by the thermostat when in AL sensor mode.').withValueMin(0).withValueMax(35),
    min_temperature_limit: () => new Numeric('min_temperature_limit', access.STATE_SET).withUnit('°C').withDescription('Minimum temperature limit for frost protection. Turns the thermostat on regardless of setpoint if the temperature drops below this.').withValueMin(1).withValueMax(5),
    min_temperature: () => new Numeric('min_temperature', access.STATE_SET).withUnit('°C').withDescription('Minimum temperature').withValueMin(1).withValueMax(15),
    mode_switch_select: (mode_switch_names: string[]) => new Enum('mode_switch', access.ALL, mode_switch_names).withDescription('Select mode switch to use').withCategory('config'),
    motion_sensitivity_select: (motion_sensitivity_names: string[]) => new Enum('motion_sensitivity', access.ALL, motion_sensitivity_names).withDescription('Select motion sensitivity to use').withCategory('config'),
    noise: () => new Numeric('noise', access.STATE).withUnit('dBA').withDescription('The measured noise value'),
    noise_detected: () => new Binary('noise_detected', access.STATE, true, false).withDescription('Indicates whether the device detected noise'),
    occupancy: () => new Binary('occupancy', access.STATE, true, false).withDescription('Indicates whether the device detected occupancy'),
    occupancy_level: () => new Numeric('occupancy_level', access.STATE).withDescription('The measured occupancy value'),
    open_window: () => new Binary('open_window', access.STATE_SET, 'ON', 'OFF').withDescription('Enables/disables the status on the device'),
    open_window_temperature: () => new Numeric('open_window_temperature', access.STATE_SET).withUnit('°C').withDescription('Open window temperature').withValueMin(0).withValueMax(35),
    operation_mode_select: (operation_mode_names: string[]) => new Enum('operation_mode', access.ALL, operation_mode_names).withDescription('Select operation mode to use').withCategory('config'),
    overload_protection: (min: number, max: number) => new Numeric('overload_protection', access.ALL).withUnit('W').withValueMin(min).withValueMax(max).withDescription('Maximum allowed load, turns off if exceeded').withCategory('config'),
    pm10: () => new Numeric('pm10', access.STATE).withLabel('PM10').withUnit('µg/m³').withDescription('Measured PM10 (particulate matter) concentration'),
    pm25: () => new Numeric('pm25', access.STATE).withLabel('PM25').withUnit('µg/m³').withDescription('Measured PM2.5 (particulate matter) concentration'),
    position: () => new Numeric('position', access.STATE).withUnit('%').withDescription('Position'),
    power: () => new Numeric('power', access.STATE).withUnit('W').withDescription('Instantaneous measured power').withCategory('diagnostic'),
    power_phase_b: () => new Numeric('power_phase_b', access.STATE).withUnit('W').withDescription('Instantaneous measured power on phase B').withCategory('diagnostic'),
    power_phase_c: () => new Numeric('power_phase_c', access.STATE).withUnit('W').withDescription('Instantaneous measured power on phase C').withCategory('diagnostic'),
    power_factor: () => new Numeric('power_factor', access.STATE).withDescription('Instantaneous measured power factor'),
    power_factor_phase_b: () => new Numeric('power_factor_phase_b', access.STATE).withDescription('Instantaneous measured power factor on phase B'),
    power_factor_phase_c: () => new Numeric('power_factor_phase_c', access.STATE).withDescription('Instantaneous measured power factor on phase C'),
    power_apparent: () => new Numeric('power_apparent', access.STATE).withUnit('VA').withDescription('Instantaneous measured apparent power'),
    power_apparent_phase_b: () => new Numeric('power_apparent_phase_b', access.STATE).withUnit('VA').withDescription('Instantaneous measured apparent power on phase B'),
    power_apparent_phase_c: () => new Numeric('power_apparent_phase_c', access.STATE).withUnit('VA').withDescription('Instantaneous measured apparent power on phase C'),
    power_on_behavior: (values=['off', 'previous', 'on']) => new Enum('power_on_behavior', access.ALL, values).withLabel('Power-on behavior').withDescription('Controls the behavior when the device is powered on after power loss. If you get an `UNSUPPORTED_ATTRIBUTE` error, the device does not support it.').withCategory('config'),
    power_outage_count: (resetsWhenPairing = true) => new Numeric('power_outage_count', access.STATE).withDescription('Number of power outages' + (resetsWhenPairing ? ' (since last pairing)' : '')).withCategory('diagnostic'),
    power_outage_memory: () => new Binary('power_outage_memory', access.ALL, true, false).withDescription('Enable/disable the power outage memory, this recovers the on/off mode after power failure').withCategory('config'),
    power_reactive: () => new Numeric('power_reactive', access.STATE).withUnit('VAR').withDescription('Instantaneous measured reactive power'),
    power_reactive_phase_b: () => new Numeric('power_reactive_phase_b', access.STATE).withUnit('VAR').withDescription('Instantaneous measured reactive power on phase B'),
    power_reactive_phase_c: () => new Numeric('power_reactive_phase_c', access.STATE).withUnit('VAR').withDescription('Instantaneous measured reactive power on phase C'),
    presence: () => new Binary('presence', access.STATE, true, false).withDescription('Indicates whether the device detected presence'),
    pressure: () => new Numeric('pressure', access.STATE).withUnit('hPa').withDescription('The measured atmospheric pressure'),
    programming_operation_mode: (values=['setpoint', 'schedule', 'schedule_with_preheat', 'eco']) => new Enum('programming_operation_mode', access.ALL, ['setpoint', 'schedule', 'schedule_with_preheat', 'eco']).withDescription('Controls how programming affects the thermostat. Possible values: setpoint (only use specified setpoint), schedule (follow programmed setpoint schedule), schedule_with_preheat (follow programmed setpoint schedule with pre-heating). Changing this value does not clear programmed schedules.'),
    setup: () => new Binary('setup', access.STATE, true, false).withDescription('Indicates if the device is in setup mode').withCategory('diagnostic'),
    schedule: () => new Binary('schedule', access.ALL, true, false).withDescription('When enabled, the device will change its state based on your schedule settings').withCategory('config'),
    schedule_settings: () => new Text('schedule_settings', access.ALL).withDescription('Allows schedule configuration').withCategory('config'),
    external_temperature_input: () => new Numeric('external_temperature_input', access.ALL)
        .withUnit('°C')
        .withValueMin(0)
        .withValueMax(55)
        .withDescription('Input for remote temperature sensor')
        .withCategory('config'),
    smoke: () => new Binary('smoke', access.STATE, true, false).withDescription('Indicates whether the device detected smoke'),
    soil_moisture: () => new Numeric('soil_moisture', access.STATE).withUnit('%').withDescription('Measured soil moisture value'),
    sos: () => new Binary('sos', access.STATE, true, false).withLabel('SOS').withDescription('SOS alarm'),
    sound_volume: () => new Enum('sound_volume', access.ALL, ['silent_mode', 'low_volume', 'high_volume']).withDescription('Sound volume of the lock'),
    switch: () => new Switch().withState('state', true, 'On/off state of the switch'),
    switch_type: () => new Enum('switch_type', access.ALL, ['toggle', 'momentary']).withDescription('Wall switch type'),
    door_state: () => new Enum('door_state', access.STATE, ['open', 'closed', 'error_jammed', 'error_forced_open', 'error_unspecified', 'undefined']).withDescription('State of the door'),
    tamper: () => new Binary('tamper', access.STATE, true, false).withDescription('Indicates whether the device is tampered'),
    temperature: () => new Numeric('temperature', access.STATE).withUnit('°C').withDescription('Measured temperature value'),
    temperature_sensor_select: (sensor_names: string[]) => new Enum('sensor', access.STATE_SET, sensor_names).withDescription('Select temperature sensor to use').withCategory('config'),
    test: () => new Binary('test', access.STATE, true, false).withDescription('Indicates whether the device is being tested'),
    trigger_count: (sinceScheduledReport = true) => new Numeric('trigger_count', exports.access.STATE).withDescription('Indicates how many times the sensor was triggered' + (sinceScheduledReport ? ' (since last scheduled report)' : '')).withCategory('diagnostic'),
    trigger_indicator: () => new Binary('trigger_indicator', access.ALL, true, false).withDescription('Enables trigger indication').withCategory('config'),
    valve_alarm: () => new Binary('valve_alarm', access.STATE, true, false).withCategory('diagnostic'),
    valve_position: () => new Numeric('position', access.ALL).withValueMin(0).withValueMax(100).withDescription('Position of the valve'),
    valve_switch: () => new Binary('state', access.ALL, 'OPEN', 'CLOSE').withDescription('Valve state if open or closed'),
    valve_state: () => new Binary('valve_state', access.STATE, 'OPEN', 'CLOSED').withDescription('Valve state if open or closed'),
    valve_detection: () => new Switch().withLabel('Valve detection').withState('valve_detection', true, 'Valve detection').setAccess('state', access.STATE_SET), // left for compatability, do not use
    valve_detection_bool: () => new Binary('valve_detection', access.ALL, true, false).withDescription('Determines if temperature control abnormalities should be detected').withCategory('config'),
    vibration: () => new Binary('vibration', access.STATE, true, false).withDescription('Indicates whether the device detected vibration'),
    voc: () => new Numeric('voc', access.STATE).withLabel('VOC').withUnit('µg/m³').withDescription('Measured VOC value'),
    voc_index: () => new Numeric('voc_index', access.STATE).withLabel('VOC index').withDescription('VOC index'),
    voltage: () => new Numeric('voltage', access.STATE).withUnit('V').withDescription('Measured electrical potential value').withCategory('diagnostic'),
    voltage_phase_b: () => new Numeric('voltage_phase_b', access.STATE).withLabel('Voltage phase B').withUnit('V').withDescription('Measured electrical potential value on phase B'),
    voltage_phase_c: () => new Numeric('voltage_phase_c', access.STATE).withLabel('Voltage phase C').withUnit('V').withDescription('Measured electrical potential value on phase C'),
    water_leak: () => new Binary('water_leak', access.STATE, true, false).withDescription('Indicates whether the device detected a water leak'),
    pilot_wire_mode: (values=['comfort', 'eco', 'frost_protection', 'off', 'comfort_-1', 'comfort_-2']) => new Enum('pilot_wire_mode', access.ALL, ['comfort', 'eco', 'frost_protection', 'off', 'comfort_-1', 'comfort_-2']).withDescription('Controls the target temperature of the heater, with respect to the temperature set on that heater. Possible values: comfort (target temperature = heater set temperature) eco (target temperature = heater set temperature - 3.5°C), frost_protection (target temperature = 7 to 8°C), off (heater stops heating), and the less commonly used comfort_-1 (target temperature = heater set temperature - 1°C), comfort_-2 (target temperature = heater set temperature - 2°C),.'),
    rain: () => new Binary('rain', access.STATE, true, false).withDescription('Indicates whether the device detected rainfall'),
    warning: () => new Composite('warning', 'warning', access.SET)
        .withFeature(new Enum('mode', access.SET, ['stop', 'burglar', 'fire', 'emergency', 'police_panic', 'fire_panic', 'emergency_panic']).withDescription('Mode of the warning (sound effect)'))
        .withFeature(new Enum('level', access.SET, ['low', 'medium', 'high', 'very_high']).withDescription('Sound level'))
        .withFeature(new Enum('strobe_level', access.SET, ['low', 'medium', 'high', 'very_high']).withDescription('Intensity of the strobe'))
        .withFeature(new Binary('strobe', access.SET, true, false).withDescription('Turn on/off the strobe (light) during warning'))
        .withFeature(new Numeric('strobe_duty_cycle', access.SET).withValueMax(10).withValueMin(0).withDescription('Length of the flash cycle'))
        .withFeature(new Numeric('duration', access.SET).withUnit('s').withDescription('Duration in seconds of the alarm')),
    week: () => new Enum('week', access.STATE_SET, ['5+2', '6+1', '7']).withDescription('Week format user for schedule'),
    window_detection: () => new Switch().withLabel('Window detection').withState('window_detection', true, 'Enables/disables window detection on the device', access.STATE_SET), // left for compatability, do not use
    window_detection_bool: () => new Binary('window_detection', access.ALL, true, false).withDescription('Enables/disables window detection on the device').withCategory('config'),
    window_open: () => new Binary('window_open', access.STATE, true, false).withDescription('Indicates if window is open').withCategory('diagnostic'),
    moving: () => new Binary('moving', access.STATE, true, false).withDescription('Indicates if the device is moving'),
    x_axis: () => new Numeric('x_axis', access.STATE).withDescription('Accelerometer X value'),
    y_axis: () => new Numeric('y_axis', access.STATE).withDescription('Accelerometer Y value'),
    z_axis: () => new Numeric('z_axis', access.STATE).withDescription('Accelerometer Z value'),
    pincode: () => new Composite('pin_code', 'pin_code', access.ALL)
        .withFeature(new Numeric('user', access.SET).withDescription('User ID to set or clear the pincode for'))
        .withFeature(new Enum('user_type', access.SET, ['unrestricted', 'year_day_schedule', 'week_day_schedule', 'master', 'non_access']).withDescription('Type of user, unrestricted: owner (default), (year|week)_day_schedule: user has ability to open lock based on specific time period, master: user has ability to both program and operate the door lock, non_access: user is recognized by the lock but does not have the ability to open the lock'))
        .withFeature(new Binary('user_enabled', access.SET, true, false).withDescription('Whether the user is enabled/disabled'))
        .withFeature(new Numeric('pin_code', access.SET).withLabel('PIN code').withDescription('Pincode to set, set pincode to null to clear')),
    squawk: () => new Composite('squawk', 'squawk', access.SET)
        .withFeature(new Enum('state', access.SET, ['system_is_armed', 'system_is_disarmed']).withDescription('Set Squawk state'))
        .withFeature(new Enum('level', access.SET, ['low', 'medium', 'high', 'very_high']).withDescription('Sound level'))
        .withFeature(new Binary('strobe', access.SET, true, false).withDescription('Turn on/off the strobe (light) for Squawk')),
    identify_duration: () => new Numeric('identify', access.SET).withValueMin(0).withValueMax(30).withUnit('seconds').withDescription('Duration of flashing').withCategory('config'),
    identify: () => new Enum('identify', access.SET, ['identify']).withDescription('Ititiate device identification').withCategory('config'),
    min_brightness: () => new Numeric('min_brightness', access.ALL).withValueMin(1).withValueMax(255).withDescription('Minimum light brightness'),
    max_brightness: () => new Numeric('max_brightness', access.ALL).withValueMin(1).withValueMax(255).withDescription('Maximum light brightness'),
};

exports.binary = (name: string, access: number, valueOn: string, valueOff: string) => new Binary(name, access, valueOn, valueOff);
exports.climate = () => new Climate();
exports.composite = (name: string, property: string, access: number) => new Composite(name, property, access);
exports.cover = () => new Cover();
exports.enum = (name: string, access: number, values: string[]) => new Enum(name, access, values);
exports.light = () => new Light();
exports.numeric = (name: string, access: number) => new Numeric(name, access);
exports.switch = () => new Switch();
exports.text = (name: string, access: number) => new Text(name, access);
exports.list = (name: string, access: number, itemType: Feature) => new List(name, access, itemType);
exports.lock = () => new Lock();
