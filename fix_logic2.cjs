const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(newFinalSpeed > speed \+ 0\.05\) \{/m;
const replacement = `if (newFinalSpeed > speed) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed second condition!");
