const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /arrayBuffer = await runTTS\(cleanText, appliedSpeed, i\);/g;
const replacement = `const speedRatio = actualDuration / targetDuration;\n                       arrayBuffer = await timeStretchBuffer(decoded, speedRatio);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced auto-fit TTS with time stretch.");
} else {
    console.log("Regex failed");
}
