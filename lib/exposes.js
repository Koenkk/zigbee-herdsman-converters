class Base {
    withEndpoint(endpointName) {
        this.endpoint = endpointName;
        return this;
    }
}

// class Action extends Base {
//     constructor(values) {
//         super();
//         this.type = 'action';
//         this.values = values;
//     }
// }

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
        this.features = [new Binary('state', 'rw', 'LOCK', 'UNLOCK')];
    }
}

class Binary extends Base {
    constructor(name, access, valueOn, valueOff) {
        super();
        this.type = 'binary';
        this.name = name;
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
}

class Enum extends Base {
    constructor(name, access, values) {
        super();
        this.type = 'enum';
        this.name = name;
        this.access = access;
        this.values = values;
    }
}

class Json extends Base {
    constructor(name, access, schema) {
        super();
        this.type = 'json';
        this.name = name;
        this.access = access;
        this.schema = schema;
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
        this.features.push(new Numeric('brightness', 'rw').withValueMin(0).withValueMax(254));
        return this;
    }

    withColorTemp() {
        this.features.push(new Numeric('color_temp', 'rw'));
        return this;
    }

    withColor(types) {
        const schema = {
            type: 'object',
            properties: {},
        };

        if (types.includes('xy')) {
            schema.properties.x = {type: 'number'};
            schema.properties.y = {type: 'number'};
        }

        if (types.includes('hs')) {
            schema.properties.hue = {type: 'number'};
            schema.properties.saturation = {type: 'number'};
        }

        this.features.push(new Json('color', 'rw', schema));
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
        this.features.push(new Numeric('position', 'rw').withValueMin(0).withValueMax(100));
        return this;
    }

    withTilt() {
        this.features.push(new Numeric('tilt', 'rw').withValueMin(0).withValueMax(100));
        return this;
    }
}

module.exports = {
    binary: (name, access, valueOn, valueOff) => new Binary(name, access, valueOn, valueOff),
    cover: () => new Cover(),
    // action: (values) => new Action(values),
    light: () => new Light(),
    numeric: (name, access) => new Numeric(name, access),
    switch: () => new Switch(),
    json: (name, access, schema) => new Json(name, access, schema),
    enum: (name, access, values) => new Enum(name, access, values),
    presets: {
        aqi: () => new Numeric('aqi', 'r'),
        battery: () => new Numeric('battery', 'r').withUnit('%'),
        battery_low: () => new Binary('battery_low', 'r', true, false),
        carbon_monoxide: () => new Binary('carbon_monoxide', 'r', true, false),
        contact: () => new Binary('contact', 'r', false, true),
        cover_position: () => new Cover().withPosition(),
        cover_position_tilt: () => new Cover().withPosition().withTilt(),
        current: () => new Numeric('current', 'r').withUnit('A'),
        current_phase_b: () => new Numeric('current_phase_b', 'r').withUnit('A'),
        current_phase_c: () => new Numeric('current_phase_c', 'r').withUnit('A'),
        energy: () => new Numeric('energy', 'r').withUnit('kWh'),
        gas: () => new Binary('gas', 'r', true, false),
        hcho: () => new Numeric('hcho', 'r').withUnit('µg/m³'),
        humidity: () => new Numeric('humidity', 'r').withUnit('%'),
        illuminance: () => new Numeric('illuminance', 'r'),
        illuminance_lux: () => new Numeric('illuminance_lux', 'r').withUnit('lx'),
        light_brightness: () => new Light().withBrightness(),
        light_brightness_colortemp: () => new Light().withBrightness().withColorTemp(),
        light_brightness_colortemp_colorhs: () => new Light().withBrightness().withColorTemp().withColor(['hs']),
        light_brightness_colortemp_colorxy: () => new Light().withBrightness().withColorTemp().withColor(['xy']),
        light_brightness_colortemp_colorxyhs: () => new Light().withBrightness().withColorTemp().withColor(['xy', 'hs']),
        light_brightness_colorxy: () => new Light().withBrightness().withColor((['xy'])),
        light_colorhs: () => new Light().withColor(['hs']),
        linkquality: () => new Numeric('linkquality', 'r').withUnit('lqi'),
        lock: () => new Lock(),
        lock_state: () => new Enum('lock_state', 'r', ['not_fully_locked', 'locked', 'unlocked']),
        occupancy: () => new Binary('occupancy', 'r', true, false),
        pm10: () => new Numeric('pm10', 'r').withUnit('µg/m³'),
        pm25: () => new Numeric('pm25', 'r').withUnit('µg/m³'),
        power: () => new Numeric('power', 'r').withUnit('W'),
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
