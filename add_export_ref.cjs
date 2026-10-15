const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex1 = /let sentenceAttempts = 0;\n\s*while \(\!sentenceSuccess\) \{/g;
const replacement1 = `let sentenceAttempts = 0;\n          let exportIdRef: { current: string | null } = { current: null };\n          while (!sentenceSuccess) {`;

code = code.replace(regex1, replacement1);

const regex2 = /let arrayBuffer = await runTTS\(cleanText, speed, i\);/g;
const replacement2 = `let arrayBuffer = await runTTS(cleanText, speed, i, exportIdRef);`;

code = code.replace(regex2, replacement2);


const regex3 = /let targetSpeedForRewrite = Math\.max\(speed, 1\.5\);\n\s*let newArrayBuffer = null;\n\s*let rewriteSuccess = false;/g;
const replacement3 = `let targetSpeedForRewrite = Math.max(speed, 1.5);\n          let newArrayBuffer = null;\n          let rewriteSuccess = false;\n          let exportIdRef: { current: string | null } = { current: null };`;

code = code.replace(regex3, replacement3);

const regex4 = /let testBuffer = await runTTS\(bestRewrite, targetSpeedForRewrite, i\);/g;
const replacement4 = `let testBuffer = await runTTS(bestRewrite, targetSpeedForRewrite, i, exportIdRef);`;

code = code.replace(regex4, replacement4);

fs.writeFileSync('src/App.tsx', code);
console.log("Added exportIdRef.");
