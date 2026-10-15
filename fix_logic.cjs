const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// We want to remove the `if (finalSpeed > speed + 0.05)` check so Auto-Fit works even for small speed bumps, 
// and we want to ensure the logs are clear.

const regex = /if \(finalSpeed > speed \+ 0\.05\) \{\s*if \(finalSpeed > 1\.5 && aiRewrite\) \{/m;
const replacement = `if (finalSpeed > speed) {
                     if (finalSpeed > 1.5 && aiRewrite) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed first condition!");
