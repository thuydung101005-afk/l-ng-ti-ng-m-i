const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
for (let i = 1110; i < 1140; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
