import extend from '../extend';

const manufacturerCode = 0x115f;

const xiaomi = {
    switchType: extend.enumLookup({
        name: 'switch_type',
        lookup: {'toggle': 1, 'momentary': 2, 'none': 3},
        cluster: 'aqaraOpple',
        attribute: {id: 0x000a, type: 0x20},
        description: 'External switch type',
        zigbeeOptions: {manufacturerCode},
    }),
};

export default xiaomi;

