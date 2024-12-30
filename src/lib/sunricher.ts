import {Tz} from './types';

const tz = {
    setModel: {
        key: ['model'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genBasic', {modelId: value});
            return {state: {model: value}};
        },
    } satisfies Tz.Converter,
};

export {tz};
