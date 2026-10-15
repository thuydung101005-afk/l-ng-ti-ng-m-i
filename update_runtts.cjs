const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const runTTS = async \(text: string, currentSpeed: number, index: number, projectExportIdRef\?: \{ current: string \| null \}\) => \{([\s\S]*?)return result\.slice\(0\);\n\s*\};/;

const replacement = `const runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }, forceRefetch = false) => {
    const normalizedText = text.replace(/\\s+/g, ' ').replace(/[\\.,\\?!]/g, '').trim().toLowerCase();
    const cacheKey = \`\${normalizedText}::\${currentSpeed}::\${voiceId}::\${ttsProvider}\`;
    
    if (forceRefetch) {
       ttsCache.current.delete(cacheKey);
    } else if (ttsCache.current.has(cacheKey)) {
      addLog(\`  💾 Dùng lại audio đã cache cho câu \${index + 1}, không tốn credit.\`, 'info');
      return ttsCache.current.get(cacheKey)!.slice(0); // Return a copy of ArrayBuffer
    }
    
    const result = await _runTTS(text, currentSpeed, index, projectExportIdRef);
    ttsCache.current.set(cacheKey, result);
    return result.slice(0);
  };`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated runTTS wrapper.");
} else {
    console.log("Regex failed");
}
