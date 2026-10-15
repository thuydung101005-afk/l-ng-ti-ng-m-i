const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
lines.splice(1099, 28); // Remove from line index 1099 (which is line 1100 in output) for 28 lines (down to line 1127 in output)
fs.writeFileSync(path, lines.join('\n'));
console.log('Success removed lines');
