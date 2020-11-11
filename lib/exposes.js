const assert = require('assert');

class Base {
    withEndpoint(endpointName) {
        this.endpoint = endpointName;

        if (this.hasOwnProperty('property')) {
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

    withProperty(property) {
        this.property = property;
        return this;
    }
}

class Switch extends Base {
    constructor() {
        super();
        this.type = 'switch';
        this.features = [];
    }

    withState(property, toggle) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        const feature = new Binary('state', access.ALL, 'ON', 'OFF').withProperty(property);
        if (toggle) {
            feature.withValueToggle('TOGGLE');
        }

        this.features.push(feature);
        return this;
    }
}

class Lock extends Base {
    constructor() {
        super();
        this.type = 'lock';
        this.features = [];
    }

    withState(property, valueOn, valueOff) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Binary('state', access.ALL, valueOn, valueOff).withProperty(property));
        return this;
    }
}

class Binary extends Base {
    constructor(name, access, valueOn, valueOff) {
        super();
        this.type = 'binary';
        this.name = name;
        this.property = name;
        this.access = access;
        this.value_on = valueOn;
        this.value_off = valueOff;
    }

    withValueToggle(value) {
        this.value_toggle = value;
        return this;
    }
}

class Numeric extends Base {
    constructor(name, access) {
        super();
        this.type = 'numeric';
        this.name = name;
        this.property = name;
        this.access = access;
    }

    withUnit(unit) {
        this.unit = unit;
        return this;
    }

    withValueMax(value) {
        this.value_max = value;
        return this;
    }

    withValueMin(value) {
        this.value_min = value;
        return this;
    }

    withValueStep(value) {
        this.value_step = value;
        return this;
    }
}

class Enum extends Base {
    constructor(name, access, values) {
        super();
        this.type = 'enum';
        this.name = name;
        this.property = name;
        this.access = access;
        this.values = values;
    }
}

class Text extends Base {
    constructor(name, access) {
        super();
        this.type = 'text';
        this.name = name;
        this.property = name;
        this.access = access;
    }
}

class Composite extends Base {
    constructor(name, property) {
        super();
        this.type = 'composite';
        this.property = property;
        this.name = name;
        this.features = [];
    }

    withFeature(feature) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(feature);
        return this;
    }
}

class Light extends Base {
    constructor() {
        super();
        this.type = 'light';
        this.features = [];
        this.features.push(new Binary('state', access.ALL, 'ON', 'OFF').withValueToggle('TOGGLE'));
    }

    withBrightness() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('brightness', access.ALL).withValueMin(0).withValueMax(254));
        return this;
    }

    withColorTemp() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('color_temp', access.ALL).withUnit('mired').withValueMin(150).withValueMax(500));
        return this;
    }

    withColor(types) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        if (types.includes('xy')) {
            const colorXY = new Composite('color_xy', 'color')
                .withFeature(new Numeric('x', access.ALL))
                .withFeature(new Numeric('y', access.ALL));
            this.features.push(colorXY);
        }

        if (types.includes('hs')) {
            const colorHS = new Composite('color_hs', 'color')
                .withFeature(new Numeric('hue', access.ALL))
                .withFeature(new Numeric('saturation', access.ALL));
            this.features.push(colorHS);
        }

        return this;
    }
}

class Cover extends Base {
    constructor() {
        super();
        this.type = 'cover';
        this.features = [];
        this.features.push(new Binary('state', access.ALL, 'OPEN', 'CLOSE'));
    }

    withPosition() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('position', access.ALL).withValueMin(0).withValueMax(100));
        return this;
    }

    withTilt() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('tilt', access.ALL).withValueMin(0).withValueMax(100));
        return this;
    }
}

class Fan extends Base {
    constructor() {
        super();
        this.type = 'fan';
        this.features = [];
        this.features.push(new Binary('state', access.ALL, 'ON', 'OFF'));
        this.features.push(new Enum('mode', access.ALL, ['off', 'low', 'medium', 'high', 'on', 'auto', 'smart']).withProperty('fan_mode'));
    }
}

class Climate extends Base {
    constructor() {
        super();
        this.type = 'climate';
        this.features = [];
    }

    withSetpoint(property, min, max, step) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        assert(['occupied_heating_setpoint', 'current_heating_setpoint', 'occupied_cooling_setpoint'].includes(property));
        this.features.push(new Numeric(property, access.ALL)
            .withValueMin(min).withValueMax(max).withValueStep(step).withUnit('°C'));
        return this;
    }

    withLocalTemperature() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('local_temperature', access.STATE_GET).withUnit('°C'));
        return this;
    }

    withSystemMode(modes) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        const allowed = ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.features.push(new Enum('system_mode', access.ALL, modes));
        return this;
    }

    withRunningState(modes) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        const allowed = ['idle', 'heat', 'cool'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.features.push(new Enum('running_state', access.STATE_GET, modes));
        return this;
    }

    withFanMode(modes) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        const allowed = ['off', 'low', 'medium', 'high', 'on', 'auto', 'smart'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.features.push(new Enum('fan_mode', access.ALL, modes));
        return this;
    }

    withPreset(modes) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Enum('preset', access.ALL, modes));
        return this;
    }

    withAwayMode() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Binary('away_mode', access.ALL, 'ON', 'OFF'));
        return this;
    }
}

const access = {
    STATE: 1,
    SET: 2,
    STATE_SET: 3,
    STATE_GET: 5,
    ALL: 7,
};

module.exports = {
    access,
    binary: (name, access, valueOn, valueOff) => new Binary(name, access, valueOn, valueOff),
    climate: () => new Climate(),
    composite: (name, property) => new Composite(name, property),
    cover: () => new Cover(),
    enum: (name, access, values) => new Enum(name, access, values),
    light: () => new Light(),
    numeric: (name, access) => new Numeric(name, access),
    switch: () => new Switch(),
    text: (name, access) => new Text(name, access),
    presets: {
        action: (values) => new Enum('action', access.STATE, values),
        aqi: () => new Numeric('aqi', access.STATE),
        battery: () => new Numeric('battery', access.STATE).withUnit('%'),
        battery_low: () => new Binary('battery_low', access.STATE, true, false),
        carbon_monoxide: () => new Binary('carbon_monoxide', access.STATE, true, false),
        child_lock: () => new Lock().withState('child_lock', 'LOCK', 'UNLOCK'),
        co2: () => new Numeric('co2', access.STATE).withUnit('ppm'),
        contact: () => new Binary('contact', access.STATE, false, true),
        cover_position: () => new Cover().withPosition(),
        cover_position_tilt: () => new Cover().withPosition().withTilt(),
        cpu_temperature: () => new Numeric('cpu_temperature', access.STATE).withUnit('°C'),
        current: () => new Numeric('current', access.STATE_GET).withUnit('A'),
        current_phase_b: () => new Numeric('current_phase_b', access.STATE_GET).withUnit('A'),
        current_phase_c: () => new Numeric('current_phase_c', access.STATE_GET).withUnit('A'),
        device_temperature: () => new Numeric('device_temperature', access.STATE).withUnit('°C'),
        eco2: () => new Numeric('eco2', access.STATE).withUnit('ppm'),
        energy: () => new Numeric('energy', access.STATE_GET).withUnit('kWh'),
        fan: () => new Fan(),
        gas: () => new Binary('gas', access.STATE, true, false),
        hcho: () => new Numeric('hcho', access.STATE).withUnit('µg/m³'),
        humidity: () => new Numeric('humidity', access.STATE).withUnit('%'),
        illuminance: () => new Numeric('illuminance', access.STATE),
        illuminance_lux: () => new Numeric('illuminance_lux', access.STATE).withUnit('lx'),
        keypad_lockout: () => new Lock().withState('keypad_lockout', '1', '0'),
        light_brightness: () => new Light().withBrightness(),
        light_brightness_colortemp: () => new Light().withBrightness().withColorTemp(),
        light_brightness_colortemp_colorhs: () => new Light().withBrightness().withColorTemp().withColor(['hs']),
        light_brightness_colortemp_colorxy: () => new Light().withBrightness().withColorTemp().withColor(['xy']),
        light_brightness_colortemp_colorxyhs: () => new Light().withBrightness().withColorTemp().withColor(['xy', 'hs']),
        light_brightness_colorxy: () => new Light().withBrightness().withColor((['xy'])),
        light_colorhs: () => new Light().withColor(['hs']),
        linkquality: () => new Numeric('linkquality', access.STATE).withUnit('lqi'),
        local_temperature: () => new Numeric('local_temperature', access.STATE_GET).withUnit('°C'),
        lock: () => new Lock().withState('state', 'LOCK', 'UNLOCK'),
        lock_state: () => new Enum('lock_state', access.STATE, ['not_fully_locked', 'locked', 'unlocked']),
        occupancy: () => new Binary('occupancy', access.STATE, true, false),
        pm10: () => new Numeric('pm10', access.STATE).withUnit('µg/m³'),
        pm25: () => new Numeric('pm25', access.STATE).withUnit('µg/m³'),
        power: () => new Numeric('power', access.STATE_GET).withUnit('W'),
        presence: () => new Binary('presence', access.STATE, true, false),
        pressure: () => new Numeric('pressure', access.STATE).withUnit('hPa'),
        smoke: () => new Binary('smoke', access.STATE, true, false),
        soil_moisture: () => new Numeric('soil_moisture', access.STATE).withUnit('%'),
        sos: () => new Binary('sos', access.STATE, true, false),
        switch: () => new Switch().withState('state', true),
        tamper: () => new Binary('tamper', access.STATE, true, false),
        temperature: () => new Numeric('temperature', access.STATE).withUnit('°C'),
        valve_detection: () => new Switch().withState('valve_detection', true),
        vibration: () => new Binary('vibration', access.STATE, true, false),
        voc: () => new Numeric('voc', access.STATE).withUnit('ppb'),
        voltage: () => new Numeric('voltage', access.STATE_GET).withUnit('V'),
        voltage_phase_b: () => new Numeric('voltage_phase_b', access.STATE).withUnit('V'),
        voltage_phase_c: () => new Numeric('voltage_phase_c', access.STATE).withUnit('V'),
        water_leak: () => new Binary('water_leak', access.STATE, true, false),
        window_detection: () => new Switch().withState('window_detection', true),
    },
};
