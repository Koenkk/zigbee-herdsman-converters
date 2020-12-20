const OneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();

const defaultBindGroup = 901;

const repInterval = {
    MAX: 62000,
    HOUR: 3600,
    MINUTES_30: 1800,
    MINUTES_15: 900,
    MINUTES_10: 600,
    MINUTES_5: 300,
    MINUTE: 60,
};

module.exports = {
    OneJanuary2000,
    repInterval,
    defaultBindGroup,
};
