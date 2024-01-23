import * as modernExtend from './modernExtend';
import {isObject} from './utils';
import {Tz, Fz, KeyValue} from '../lib/types';
import * as utils from '../lib/utils';
import {Zcl} from 'zigbee-herdsman';
import * as ota from '../lib/ota';

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.OSRAM};

export const ledvanceFz = {
    pbc_level_to_action: {
        cluster: 'genLevelCtrl',
        type: ['commandMoveWithOnOff', 'commandStopWithOnOff', 'commandMove', 'commandStop', 'commandMoveToLevelWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const lookup: KeyValue = {
                commandMoveWithOnOff: 'hold', commandMove: 'hold', commandStopWithOnOff: 'release',
                commandStop: 'release', commandMoveToLevelWithOnOff: 'toggle',
            };
            return {[utils.postfixWithEndpointName('action', msg, model, meta)]: lookup[msg.type]};
        },
    } satisfies Fz.Converter,
};

export const ledvanceTz = {
    ledvance_commands: {
        /* deprecated osram_*/
        key: ['set_transition', 'remember_state', 'osram_set_transition', 'osram_remember_state'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'osram_set_transition' || key === 'set_transition') {
                if (value) {
                    utils.assertNumber(value, key);
                    const transition = (value > 1) ? Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 10 : 1;
                    const payload = {0x0012: {value: transition, type: 0x21}, 0x0013: {value: transition, type: 0x21}};
                    await entity.write('genLevelCtrl', payload);
                }
            } else if (key == 'osram_remember_state' || key == 'remember_state') {
                if (value === true) {
                    await entity.command('manuSpecificOsram', 'saveStartupParams', {}, manufacturerOptions);
                } else if (value === false) {
                    await entity.command('manuSpecificOsram', 'resetStartupParams', {}, manufacturerOptions);
                }
            }
        },
    } satisfies Tz.Converter,
};

export function ledvanceOnOff(args?: modernExtend.OnOffArgs) {
    args = {ota: ota.ledvance, ...args};
    return modernExtend.onOff(args);
}

export function ledvanceLight(args?: modernExtend.LightArgs) {
    args = {powerOnBehavior: false, ota: ota.ledvance, ...args};
    if (args.colorTemp) args.colorTemp.startup = false;
    if (args.color) args.color = {modes: ['xy', 'hs'], ...(isObject(args.color) ? args.color : {})};
    const result = modernExtend.light(args);
    result.toZigbee.push(ledvanceTz.ledvance_commands);
    return result;
}
