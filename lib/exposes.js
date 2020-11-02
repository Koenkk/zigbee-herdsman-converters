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
        this.features = [new Binary('state', 'rw', 'ON', 'OFF').withValueToggle('TOGGLE')];
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
        this.features.push(new Binary('state', 'rw', valueOn, valueOff).withProperty(property));
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
        this.features.push(new Binary('state', 'rw', 'ON', 'OFF').withValueToggle('TOGGLE'));
    }

    withBrightness() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('brightness', 'rw').withValueMin(0).withValueMax(254));
        return this;
    }

    withColorTemp() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('color_temp', 'rw').withUnit('mired').withValueMin(150).withValueMax(500));
        return this;
    }

    withColor(types) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        if (types.includes('xy')) {
            const colorXY = new Composite('color_xy', 'color')
                .withFeature(new Numeric('x', 'rw'))
                .withFeature(new Numeric('y', 'rw'));
            this.features.push(colorXY);
        }

        if (types.includes('hs')) {
            const colorHS = new Composite('color_hs', 'color')
                .withFeature(new Numeric('hue', 'rw'))
                .withFeature(new Numeric('saturation', 'rw'));
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
        this.features.push(new Binary('state', 'rw', 'OPEN', 'CLOSE'));
    }

    withPosition() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('position', 'rw').withValueMin(0).withValueMax(100));
        return this;
    }

    withTilt() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('tilt', 'rw').withValueMin(0).withValueMax(100));
        return this;
    }
}

class Fan extends Base {
    constructor() {
        super();
        this.type = 'fan';
        this.features = [];
        this.features.push(new Binary('state', 'rw', 'ON', 'OFF'));
        this.features.push(new Enum('mode', 'rw', ['off', 'low', 'medium', 'high', 'on', 'auto', 'smart']).withProperty('fan_mode'));
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
        assert(['occupied_heating_setpoint', 'current_heating_setpoint'].includes(property));
        this.features.push(new Numeric(property, 'rw')
            .withValueMin(min).withValueMax(max).withValueStep(step).withUnit('°C'));
        return this;
    }

    withLocalTemperature() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(new Numeric('local_temperature', 'r').withUnit('°C'));
        return this;
    }

    withSystemMode(modes) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        const allowed = ['off', 'heat', 'cool', 'auto'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.features.push(new Enum('system_mode', 'rw', modes));
        return this;
    }

    withRunningState(modes) {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        const allowed = ['idle', 'heat', 'cool'];
        modes.forEach((m) => assert(allowed.includes(m)));
        this.features.push(new Enum('running_state', 'r', modes));
        return this;
    }
}

module.exports = {
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
        action: (values) => new Enum('action', 'r', values),
        aqi: () => new Numeric('aqi', 'r'),
        battery: () => new Numeric('battery', 'r').withUnit('%'),
        battery_low: () => new Binary('battery_low', 'r', true, false),
        carbon_monoxide: () => new Binary('carbon_monoxide', 'r', true, false),
        co2: () => new Numeric('co2', 'r').withUnit('ppm'),
        contact: () => new Binary('contact', 'r', false, true),
        cover_position: () => new Cover().withPosition(),
        cover_position_tilt: () => new Cover().withPosition().withTilt(),
        cpu_temperature: () => new Numeric('cpu_temperature', 'r').withUnit('°C'),
        current: () => new Numeric('current', 'r').withUnit('A'),
        current_phase_b: () => new Numeric('current_phase_b', 'r').withUnit('A'),
        current_phase_c: () => new Numeric('current_phase_c', 'r').withUnit('A'),
        device_temperature: () => new Numeric('device_temperature', 'r').withUnit('°C'),
        eco2: () => new Numeric('eco2', 'r').withUnit('ppm'),
        energy: () => new Numeric('energy', 'r').withUnit('kWh'),
        fan: () => new Fan(),
        gas: () => new Binary('gas', 'r', true, false),
        hcho: () => new Numeric('hcho', 'r').withUnit('µg/m³'),
        humidity: () => new Numeric('humidity', 'r').withUnit('%'),
        illuminance: () => new Numeric('illuminance', 'r'),
        illuminance_lux: () => new Numeric('illuminance_lux', 'r').withUnit('lx'),
        keypad_lockout: () => new Lock().withState('keypad_lockout', '1', '0'),
        light_brightness: () => new Light().withBrightness(),
        light_brightness_colortemp: () => new Light().withBrightness().withColorTemp(),
        light_brightness_colortemp_colorhs: () => new Light().withBrightness().withColorTemp().withColor(['hs']),
        light_brightness_colortemp_colorxy: () => new Light().withBrightness().withColorTemp().withColor(['xy']),
        light_brightness_colortemp_colorxyhs: () => new Light().withBrightness().withColorTemp().withColor(['xy', 'hs']),
        light_brightness_colorxy: () => new Light().withBrightness().withColor((['xy'])),
        light_colorhs: () => new Light().withColor(['hs']),
        linkquality: () => new Numeric('linkquality', 'r').withUnit('lqi'),
        local_temperature: () => new Numeric('local_temperature', 'r').withUnit('°C'),
        lock: () => new Lock().withState('state', 'LOCK', 'UNLOCK'),
        lock_state: () => new Enum('lock_state', 'r', ['not_fully_locked', 'locked', 'unlocked']),
        occupancy: () => new Binary('occupancy', 'r', true, false),
        pm10: () => new Numeric('pm10', 'r').withUnit('µg/m³'),
        pm25: () => new Numeric('pm25', 'r').withUnit('µg/m³'),
        power: () => new Numeric('power', 'r').withUnit('W'),
        presence: () => new Binary('presence', 'r', true, false),
        pressure: () => new Numeric('pressure', 'r').withUnit('hPa'),
        smoke: () => new Binary('smoke', 'r', true, false),
        soil_moisture: () => new Numeric('soil_moisture', 'r').withUnit('%'),
        sos: () => new Binary('sos', 'r', true, false),
        switch: () => new Switch(),
        tamper: () => new Binary('tamper', 'r', true, false),
        temperature: () => new Numeric('temperature', 'r').withUnit('°C'),
        vibration: () => new Binary('vibration', 'r', true, false),
        voc: () => new Numeric('voc', 'r').withUnit('ppb'),
        voltage: () => new Numeric('voltage', 'r').withUnit('V'),
        voltage_phase_b: () => new Numeric('voltage_phase_b', 'r').withUnit('V'),
        voltage_phase_c: () => new Numeric('voltage_phase_c', 'r').withUnit('V'),
        water_leak: () => new Binary('water_leak', 'r', true, false),
    },
};
