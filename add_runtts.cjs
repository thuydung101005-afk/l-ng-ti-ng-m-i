const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const startDubbing = async \(\) => \{/;
const replacement = `const runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }) => {\n    const normalizedText = text.replace(/\\s+/g, ' ').replace(/[\\.,\\?!]/g, '').trim().toLowerCase();\n    const cacheKey = \`\${normalizedText}::\${currentSpeed}::\${voiceId}::\${ttsProvider}\`;\n    if (ttsCache.current.has(cacheKey)) {\n      addLog(\`  💾 Dùng lại audio đã cache cho câu \${index + 1}, không tốn credit.\`, 'info');\n      return ttsCache.current.get(cacheKey)!.slice(0); // Return a copy of ArrayBuffer\n    }\n    const result = await _runTTS(text, currentSpeed, index, projectExportIdRef);\n    ttsCache.current.set(cacheKey, result);\n    return result.slice(0);\n  };\n\n  const startDubbing = async () => {`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Added runTTS wrapper.");
} else {
    console.log("Regex failed");
}
