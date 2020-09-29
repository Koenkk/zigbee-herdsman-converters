module.exports = {
    light_state_brightness: (endpoint=undefined) => {
        const expose = {
            type: 'light',
            features: ['state', 'brightness'],
        };

        if (endpoint !== undefined) expose.endpoint = endpoint;
        return expose;
    },
    light_state_brightness_colortemp: (endpoint=undefined) => {
        const expose = {
            type: 'light',
            features: ['state', 'brightness', 'color_temp'],
        };

        if (endpoint !== undefined) expose.endpoint = endpoint;
        return expose;
    },
    light_state_brightness_colorxy: (endpoint=undefined) => {
        const expose = {
            type: 'light',
            features: ['state', 'brightness', 'color_xy'],
        };

        if (endpoint !== undefined) expose.endpoint = endpoint;
        return expose;
    },
    light_state_brightness_colortemp_colorxy: (endpoint=undefined) => {
        const expose = {
            type: 'light',
            features: ['state', 'brightness', 'color_temp', 'color_xy'],
        };

        if (endpoint !== undefined) expose.endpoint = endpoint;
        return expose;
    },
    light_state_brightness_colortemp_colorhs: (endpoint=undefined) => {
        const expose = {
            type: 'light',
            features: ['state', 'brightness', 'color_temp', 'color_hs'],
        };

        if (endpoint !== undefined) expose.endpoint = endpoint;
        return expose;
    },
};
