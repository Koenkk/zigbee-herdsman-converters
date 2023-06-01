const fs = require('fs');

let cnt = 0;
for (const file of fs.readdirSync('./src/devices').sort()) {
    if (file.endsWith('.js')) {
        const f = `./src/devices/${file}`;
        const newContent = [];
        const lines = fs.readFileSync(f, 'utf-8').trim().split('\n');
        lines[lines.length - 1] = `] as Definition[];\n`;
        for (let line of lines) {
            const importMatch = line.match(/const (.+) = require\((.+)\);/);
            if (line === `const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};`) {
                line = `import fz from '../converters/fromZigbee';\nimport * as legacy from '../lib/legacy';`;
            } else if (importMatch) {
                if (importMatch[1] === 'exposes') {
                    line = `import * as ${importMatch[1]} from ${importMatch[2]};`;
                } else {
                    line = `import ${importMatch[1]} from ${importMatch[2]};`;
                }
            }
            newContent.push(line);
        }

        console.log(file);
        fs.writeFileSync(`./src/devices/${file.split('.')[0]}.ts`, newContent.join('\n'));
        const del = true;
        if (del) {
            fs.rmSync(f);
        }

        cnt++;

        if (cnt == 5) {
            break;
        }
    }
}
