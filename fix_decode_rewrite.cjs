const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /let testBuffer = await runTTS\(bestRewrite, targetSpeedForRewrite, i, exportIdRef\);\n\s*rewriteSuccess = true;/g;

const replacement = `let testBuffer = await runTTS(bestRewrite, targetSpeedForRewrite, i, exportIdRef);
                       // Verify before accepting to avoid silent clip
                       const testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                       rewriteSuccess = true;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated rewrite queue try block.");
} else {
    console.log("Regex failed");
}
