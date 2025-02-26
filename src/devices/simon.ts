import {deviceEndpoints, light} from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SM0502"],
        model: "SM0502",
        vendor: "SIMON",
        description: "i7 2-gang smart dimming switch",
        extend: [deviceEndpoints({endpoints: {left: 1, right: 2}}), light({endpointNames: ["left", "right"]})],
    },
    {
        zigbeeModel: ['S2100-E838'],
        model: 'S2100-E838',
        vendor: 'Simon',
        description: '1 gang switch',
        extend: [m.deviceEndpoints({endpoints: {l1: 1}}), m.onOff({endpointNames: ["l1"]})],
        meta: { multiEndpoint: true },
        configure: async (device, coordinatorEndpoint, logger) => {
          await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, [
            'genOnOff'
          ])
        }
      },
      {
        zigbeeModel: ['S2100-E839'],
        model: 'S2100-E839',
        vendor: 'Simon',
        description: '2 gang switch',
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
        meta: { multiEndpoint: true },
        configure: async (device, coordinatorEndpoint, logger) => {
          await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, [
            'genOnOff'
          ])
          await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, [
            'genOnOff'
          ])
        }
      },
      {
        zigbeeModel: ['S2100-E840'],
        model: 'S2100-E840',
        vendor: 'Simon',
        description: '3 gang switch',
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), m.onOff({endpointNames: ["l1", "l2", "l3"]})],
        meta: { multiEndpoint: true },
        configure: async (device, coordinatorEndpoint, logger) => {
          await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, [
            'genOnOff'
          ])
          await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, [
            'genOnOff'
          ])
          await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, [
            'genOnOff'
          ])
        }
      },
      {
        zigbeeModel: ['S2100-E841'],
        model: 'S2100-E841',
        vendor: 'Simon',
        description: '4 gang switch',
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}), m.onOff({endpointNames: ["l1", "l2", "l3", "l4"]})],
        meta: { multiEndpoint: true },
        configure: async (device, coordinatorEndpoint, logger) => {
          await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, [
            'genOnOff'
          ])
          await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, [
            'genOnOff'
          ])
          await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, [
            'genOnOff'
          ])
          await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, [
            'genOnOff'
          ])
        }
      }
];