const fs = require('fs');

for (const file of fs.readdirSync('./src/devices').sort()) {
    if (file.endsWith('.js')) {
        const f = `./src/devices/${file}`;
        const newContent = [];
        let lines = fs.readFileSync(f, 'utf-8').trim().split('\n');
        lines = [`import {Definition, Fz, Tz} from '../lib/types';`, ...lines];
        lines[lines.length - 1] = `];\n\nmodule.exports = definitions;\n`;
        for (let line of lines) {
            const importMatch = line.match(/const (.+) = require\((.+)\);/);
            if (line === `const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};`) {
                line = `import fz from '../converters/fromZigbee';\nimport * as legacy from '../lib/legacy';`;
            } else if (importMatch) {
                if (['exposes', 'tuya', 'ota', 'constants', 'reporting', 'globalStore', 'utils'].includes(importMatch[1])) {
                    line = `import * as ${importMatch[1]} from ${importMatch[2]};`;
                } else {
                    line = `import ${importMatch[1]} from ${importMatch[2]};`;
                }
            } else if (line === 'module.exports = [') {
                line = 'const definitions: Definition[] = [';
            }
            newContent.push(line);
        }

        console.log(file);

        let c = newContent.join('\n');
        c = c.replaceAll('fz.legacy', 'legacy.fz');
        c = c.replaceAll('tz.legacy', 'legacy.tz');
        c = c.replaceAll('exposes.enum(', 'e.enum(');
        c = c.replaceAll('exposes.numeric(', 'e.numeric(');
        c = c.replaceAll('exposes.binary(', 'e.binary(');
        c = c.replaceAll('exposes.text(', 'e.text(');
        c = c.replaceAll('exposes.climate(', 'e.climate(');

        fs.writeFileSync(`./src/devices/${file.split('.')[0]}.ts`, c);
        const del = true;
        if (del) {
            fs.rmSync(f);
        }
    }
}
