class Base {
    withEndpoint(endpointName) {
        this.endpoint = endpointName;
        return this;
    }
}

class Switch extends Base {
    constructor() {
        super();
        this.type = 'switch';
    }
}

class Light extends Base {
    constructor() {
        super();
        this.type = 'light';
        this.features = ['state'];
    }

    withBrightness() {
        this.features.push('brightness');
        return this;
    }

    withColorTemp() {
        this.features.push('color_temp');
        return this;
    }

    withColorXY() {
        this.features.push('color_xy');
        return this;
    }

    withColorHS() {
        this.features.push('color_hs');
        return this;
    }
}

class _Boolean extends Base {
    constructor(property) {
        super();
        this.type = 'boolean';
        this.property = property;
    }
}

class Numeric extends Base {
    constructor(property) {
        super();
        this.type = 'numeric';
        this.property = property;
    }

    withUnit(unit) {
        this.unit = unit;
        return this;
    }
}

module.exports = {
    light: () => new Light(),
    switch: () => new Switch(),
    boolean: (property) => new _Boolean(property),
    numeric: (property) => new Numeric(property),
};
