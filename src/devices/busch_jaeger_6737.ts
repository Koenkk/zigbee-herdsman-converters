import type { Definition } from '../lib/types';
import { presets } from '../lib/exposes';
const { action } = presets;

const buschJaeger6737: Definition = {
  zigbeeModel: ['ZLL-RC01'],
  model: '6737/01-84',
  vendor: 'Busch-Jaeger',
  description: 'Zigbee Light Link 4-rocker wall switch (8 buttons, horizontal, left/right)',
  fromZigbee: [
    {
      cluster: 'genOnOff',
      type: ['commandOn', 'commandOff'],
      convert: (
        model: any,
        msg: any,
        publish: (payload: any) => void,
        options: any,
        meta: any
      ) => {
        const side = msg.command === 'commandOn' ? 'right' : 'left';
        return { action: `press_${meta.endpoint_name}_${side}` };
      },
    },
  ],
  toZigbee: [],
  exposes: [
    action([
      'press_wippe1_left', 'press_wippe1_right',
      'press_wippe2_left', 'press_wippe2_right',
      'press_wippe3_left', 'press_wippe3_right',
      'press_wippe4_left', 'press_wippe4_right',
    ]),
  ],
  meta: { multiEndpoint: true },
  endpoint: () => ({
    wippe1: 1,
    wippe2: 2,
    wippe3: 3,
    wippe4: 4,
  }),
  configure: async (
    device: any,
    coordinatorEndpoint: any,
    logger: any
  ): Promise<void> => {
    // kein Reporting nötig
  },
};

export default buschJaeger6737;
