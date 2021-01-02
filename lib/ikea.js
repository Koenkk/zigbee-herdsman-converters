async function bulbOnEvent(type, data, device) {
    /**
     * IKEA bulbs lose their configured reportings when losing power.
     * A deviceAnnounce indicates they are powered on again.
     * Reconfigure the configured reporting here.
     * NOTE: binds are not lost so rebinding is not needed!
     */
    if (type === 'deviceAnnounce') {
        for (const endpoint of device.endpoints) {
            for (const c of endpoint.configuredReportings) {
                await endpoint.configureReporting(c.cluster.name, [{
                    attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                    maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                }]);
            }
        }
    }
}

async function batteryDeviceOnEvent(type, data, device) {
    /**
     * IKEA battery deivces sometimes lose the bind and
     * reporting configuration after replacing the battery.
     * A deviceAnnounce indicates they are powered on again.
     * Reconfigure the bind and reporting here.
     */
    if (type === 'deviceAnnounce') {
        for (const endpoint of device.endpoints) {
            const b = endpoint.binds.find((b) => b.cluster.name === 'genPowerCfg');
            if (b) {
                await endpoint.bind('genPowerCfg', b.target);
            }

            const c = endpoint.configuredReportings.find(
                (c) => c.cluster.name === 'genPowerCfg' && c.attribute.name === 'batteryPercentageRemaining',
            );
            if (c) {
                await endpoint.configureReporting(c.cluster.name, [{
                    attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                    maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                }]);
            }
        }
    }
}

module.exports = {
    bulbOnEvent,
    batteryDeviceOnEvent,
};
