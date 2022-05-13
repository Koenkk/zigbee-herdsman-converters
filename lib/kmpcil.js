const globalStore = require('./store');
const exposes = require('./exposes');
const options={
    presence_timeout_dc: () => {
        return exposes.numeric('presence_timeout_dc').withValueMin(60).withDescription(
            'Time in seconds after which presence is cleared after detecting it (default 60 seconds) while in DC.');
    },
    presence_timeout_battery: () => {
        return exposes.numeric('presence_timeout_battery').withValueMin(120).withDescription(
            'Time in seconds after which presence is cleared after detecting it (default 420 seconds) while in Battery.');
    },
};

function handleKmpcilPresence(model, msg, publish, options, meta) {
    const useOptionsTimeoutBattery = options && options.hasOwnProperty('presence_timeout_battery');
    const timeoutBattery = useOptionsTimeoutBattery ? options.presence_timeout_battery : 420; // 100 seconds by default

    const useOptionsTimeoutDc = options && options.hasOwnProperty('presence_timeout_dc');
    const timeoutDc = useOptionsTimeoutDc ? options.presence_timeout_dc : 60;

    const mode = meta.state? meta.state['power_state'] : false;

    const timeout = mode ? timeoutDc : timeoutBattery;
    // Stop existing timer because motion is detected and set a new one.
    clearTimeout(globalStore.getValue(msg.endpoint, 'timer'));
    const timer = setTimeout(() => publish({presence: false}), timeout * 1000);
    globalStore.putValue(msg.endpoint, 'timer', timer);

    return {presence: true};
}

module.exports = {
    handleKmpcilPresence,
    options,
};
