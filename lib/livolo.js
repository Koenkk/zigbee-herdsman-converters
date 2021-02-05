async function poll(device) {
    try {
        const endpoint = device.getEndpoint(6);
        const options = {transactionSequenceNumber: 0, srcEndpoint: 8, disableResponse: true, disableRecovery: true};
        await endpoint.command('genOnOff', 'toggle', {}, options);
    } catch (error) {
        // device is lost, need to permit join
    }
}

module.exports = {
    poll,
};
