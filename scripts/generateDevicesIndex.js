const path = require('path');
const fs = require('fs');

const devicesPath = path.join(__dirname, '..', 'src', 'devices');
const files = fs.readdirSync(devicesPath).filter((f) => f.endsWith('.ts') && f != 'index.ts').map(((f) => f.replace('.ts', '')));

const imports = files.map((f) => `import ${f} from './${f}';`).join('\n');
const export_ = files.map((f) => `    ...${f},`).join('\n');

const indexPath = path.join(devicesPath, 'index.ts');
fs.writeFileSync(indexPath, `${imports}

export default [
${export_}
];
`);


