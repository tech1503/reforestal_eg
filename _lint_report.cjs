// Temporal: clasifica mensajes de eslint (borrar tras usar)
const fs = require('fs');
const path = require('path');
const file = path.join(process.env.TEMP || process.env.TMP || '.', 'lint.json');
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
let e = 0, w = 0;
const safe = [], risky = [];
for (const f of r) {
  const rel = f.filePath.split('src' + path.sep).slice(1).join('src' + path.sep);
  for (const m of f.messages) {
    if (m.severity === 2) {
      e++;
      console.log('ERROR', rel, m.line + ':' + m.column, m.message);
    } else {
      w++;
      if (m.ruleId === 'react-hooks/exhaustive-deps') risky.push(rel + ':' + m.line + '  ' + m.message);
      else safe.push(rel + ':' + m.line + ':' + m.column + '  ' + m.ruleId + '  ' + m.message);
    }
  }
}
console.log('--- ERRORES: ' + e + '  WARNINGS: ' + w + '  (hook-deps: ' + risky.length + ' | otros: ' + safe.length + ')');
console.log('=== OTROS WARNINGS (candidatos a limpieza segura) ===');
safe.forEach((x) => console.log(x));
console.log('=== REACT-HOOKS-EXHAUSTIVE-DEPS (NO tocar) ===');
risky.forEach((x) => console.log(x));
