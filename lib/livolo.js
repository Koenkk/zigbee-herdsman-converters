async function poll(device) {
    try {
        const endpoint = device.getEndpoint(6);
        await endpoint.command('genOnOff', 'toggle', {}, {transactionSequenceNumber: 0});
    } catch (error) {
        // device is lost, need to permit join
    }
}

module.exports = {
    poll,
};
