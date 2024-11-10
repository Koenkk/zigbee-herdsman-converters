import * as modernExtend from './modernExtend';

const luxScale: modernExtend.ScaleFunction = (value: number, type: 'from' | 'to') => {
    if (type === 'from') {
        return Math.round(Math.pow(10, (value - 1) / 10000));
    } else {
        return Math.round((10000 * Math.log10(value)) + 1)
    }
};

export const schneiderOccupancyConfiguration = () => {
    const extend = modernExtend.enumLookup({
        name: 'occupancy_sensitivity',
        lookup: {
          'Low': 50,
          'Medium': 75,
          'High': 100,
        },
        cluster: 'msOccupancySensing',
        attribute: 'schneiderOccupancySensitivity',
        description: 'Sensitivity of the occupancy sensor',
        entityCategory: 'config',
    });

    const luxThresholdExtend = modernExtend.numeric({
        name: 'ambience_light_threshold',
        cluster: 'manuSpecificSchneiderOccupancyConfiguration',
        attribute: 'AmbienceLightThreshold',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 5},
        description: 'Threshold above which occupancy will not trigger the light switch.',
        unit: 'lx',
        scale: luxScale,
        entityCategory: 'config',
    });

    extend.fromZigbee.push(
      ...luxThresholdExtend.fromZigbee,
    );
    extend.toZigbee.push(
      ...luxThresholdExtend.toZigbee,
    );
    extend.exposes.push(
      ...luxThresholdExtend.exposes,
    );

    return extend;
}

export const schneiderDimmingMode = () => {
    return modernExtend.enumLookup({
        name: 'schneider_dimmer_mode',
        lookup: {
          'Auto': 0,
          'RL-LED': 3,
        },
        cluster: 'lightingBallastCfg',
        attribute: 'wiserControlMode',
        description: 'Controls the dimmer mode.',
        entityCategory: 'config',
    });
}
