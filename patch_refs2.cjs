const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /arrayBuffer = await runTTS\(cleanText, renderSpeedToUse, i, exportIdRef, forceRefetch\);\n(\s*)decoded = await audioCtx.decodeAudioData/,
    `let exportIdRefNew: { current: string | null } = { current: null };
                      arrayBuffer = await runTTS(cleanText, renderSpeedToUse, i, exportIdRefNew, forceRefetch);
$1decoded = await audioCtx.decodeAudioData`
);

fs.writeFileSync(path, content);
console.log('Success');
