const path = require('path');
const fs = require('fs');
const process = require('process');
const {execSync} = require('child_process');
const zhc = require('../index');

const changelogFile = path.join(__dirname, '..', 'CHANGELOG.MD');
const changelog = fs.readFileSync(changelogFile, 'utf-8').split('\n');

const releaseRe = /## \[(.+)\]/;
const changes = {features: [], fixes: [], detect: [], add: []};
let context = null;
const changeRe = [
    /^\* (\*\*(.+):\*\*)?(.+)\((\[#\d+\]\(.+\))\) \(\[(.+)\]\(https:.+\)$/,
    /^\* (\*\*(.+):\*\*)?(.+)(https:\/\/github\.com.+) \(\[(.+)\]\(https:.+\)$/,
];

for (const line of changelog) {
    const releaseMatch = line.match(releaseRe);
    const changeMatch = changeRe.map((re) => line.match(re)).find((e) => e);
    if (releaseMatch) {
        if (releaseMatch[1] === process.argv[2]) {
            break;
        }
    } else if (line === '### Features') {
        context = 'features';
    } else if (line === '### Fixes') {
        context = 'fixes';
    } else if (changeMatch) {
        const localContext = changeMatch[2] ?? context;
        if (!changes[localContext]) throw new Error(`Unknown context: ${localContext}`);

        let message = changeMatch[3].trim();
        if (message.endsWith('.')) message = message.substring(0, message.length - 1);
        if (localContext === 'add') {
            const model = zhc.devices.find((d) => d.model === message);
            if (!model) throw new Error(`${line} does not exist`);
            message = `\`${model.model}\` ${model.vendor} ${model.description}`;
        }

        let issue = changeMatch[4];
        if (!issue.startsWith('[#')) issue = `[#${issue.split('/').pop()}](${issue})`;

        let user = execSync(`git log --format='%an' ${changeMatch[5]}^!`).toString().trim();
        if (user === 'Koen Kanters') user = 'koenkk';

        changes[localContext].push(`- ${issue} ${message} (@${user})`);
    } else if (line === '# Changelog' || !line) {
        continue;
    } else {
        throw new Error(`Unmatched line: ${line}`);
    }
}

let result = '';
const names = [['features', 'Improvements'], ['fixes', 'Fixes'], ['add', 'New supported devices'], ['detect', 'Fixed device detections']];
for (const name of names) {
    result += `# ${name[1]}\n`;
    if (name[0] === 'add') {
        result += `This release adds support for ${changes['add'].length} devices: \n`;
    }
    changes[name[0]].forEach((e) => result += `${e}\n`);
    result += '\n';
}

console.log(result.trim());
