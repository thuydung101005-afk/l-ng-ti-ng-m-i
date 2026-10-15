const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// I will just read lines 1030 to 1150 and see what exactly is there.
const lines = content.split('\n');
for (let i = 1010; i < 1120; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
