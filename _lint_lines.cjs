// Temporal: imprime el código exacto de cada warning no-unused-vars (borrar tras usar)
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const file = path.join(process.env.TEMP || process.env.TMP || '.', 'lint.json');
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const SKIP = ['LandDollarDisplay.jsx']; // requiere autorización del usuario
const out = [];
for (const f of r) {
  const rel = f.filePath.split('src' + path.sep).slice(1).join('/');
  if (SKIP.some((s) => rel.endsWith(s))) continue;
  const lines = fs.readFileSync(f.filePath, 'utf8').split(/\r?\n/);
  for (const m of f.messages) {
    if (m.severity !== 1) continue;
    if (m.ruleId !== 'no-unused-vars') continue;
    const ln = m.line;
    const text = (lines[ln - 1] || '').trimEnd();
    out.push('### ' + rel + ':' + ln + ':' + m.column + '  [' + m.message + ']\n' + text);
  }
}
console.log(out.join('\n\n'));
