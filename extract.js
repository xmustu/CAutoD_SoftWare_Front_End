import fs from 'fs';
const data = fs.readFileSync('eslint-json.json', 'utf8');
const r = JSON.parse(data).filter(x => x.errorCount > 0);
console.log('RuleID: ' + r[0].messages[0].ruleId + ', Message: ' + r[0].messages[0].message);
