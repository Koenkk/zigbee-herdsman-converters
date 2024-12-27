const {light} = require('zigbee-herdsman-converters/lib/modernExtend');

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['050-0131558M'],
        model: '050-0131558M',
        vendor: 'XAL',
        description: 'Just 45 MOVE IT 25 spotlight',
        extend: [light()],
    },
    {
        zigbeeModel: ['050-1212558H'],
        model: '050-1212558H',
        vendor: 'XAL',
        description: 'Just 45 LIGHT opal floodlight',
        extend: [light()],
    },

];

export default definitions;
module.exports = definitions;
