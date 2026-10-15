const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const arrayBuffer = await runTTS\(fullText, speed, 0\);/g;
const replacement = `let exportIdRef: { current: string | null } = { current: null };\n          const arrayBuffer = await runTTS(fullText, speed, 0, exportIdRef);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Added exportIdRef cont.");
} else {
    console.log("Regex failed");
}
