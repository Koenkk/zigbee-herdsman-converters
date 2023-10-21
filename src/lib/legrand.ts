import {Fz, OnEvent, Tz} from '../lib/types';
import * as utils from '../lib/utils';

export const readInitialBatteryState: OnEvent = async (type, data, device, options) => {
    if (['deviceAnnounce'].includes(type)) {
        const endpoint = device.getEndpoint(1);
        const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
        await endpoint.read('genPowerCfg', ['batteryVoltage'], options);
    }
};

export const tzLegrand = {
    auto_mode: {
        key: ['auto_mode'],
        convertSet: async (entity, key, value, meta) => {
            const mode = utils.getFromLookup(value, {'off': 0x00, 'auto': 0x02, 'on_override': 0x03});
            const payload = {data: Buffer.from([mode])};
            await entity.command('manuSpecificLegrandDevices3', 'command0', payload);
            return {state: {'auto_mode': value}};
        },
    } as Tz.Converter,
};

export const fzLegrand = {
    legrand_600087l: {
        cluster: 'greenPower',
        type: ['commandNotification'],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            const lookup: {[s: number]: string} = {0x34: 'stop', 0x35: 'up', 0x36: 'down'};
            if (commandID === 224) return;
            if (!lookup.hasOwnProperty(commandID)) {
                meta.logger.error(`GreenPower_3 error: missing command '${commandID}'`);
            } else {
                return {action: lookup[commandID]};
            }
        },
    } as Fz.Converter,
};
