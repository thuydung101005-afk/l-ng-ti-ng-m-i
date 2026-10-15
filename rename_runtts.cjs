const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const runTTS = async \(text: string, currentSpeed: number, index: number, projectExportIdRef\?: \{ current: string \| null \}\) => \{/;
const replacement = `const _runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }) => {`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Renamed runTTS.");
} else {
    console.log("Regex failed");
}
