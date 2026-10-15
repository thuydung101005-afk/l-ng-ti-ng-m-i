const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(estimatedDuration <= item\.targetDuration \+ 0\.1 \|\| rewriteAttempts >= maxAttempts\) \{\s*item\.exportIdRef = item\.exportIdRef \|\| \{ current: null \};\s*let testBuffer = await runTTS\(rewritten, item\.targetSpeedForRewrite, item\.index, item\.exportIdRef\);\s*const testDecoded = await audioCtx\.decodeAudioData\(testBuffer\.slice\(0\)\);\s*item\.newArrayBuffer = testBuffer;/m;

const replacement = `if (estimatedDuration <= item.targetDuration + 0.1 || rewriteAttempts >= maxAttempts) {
                            item.exportIdRef = item.exportIdRef || { current: null };
                            let testBuffer = await runTTS(rewritten, RENDER_SPEED, item.index, item.exportIdRef);
                            let testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                            const rewriteStretchRatio = item.targetSpeedForRewrite / RENDER_SPEED;
                            testBuffer = await timeStretchBuffer(testDecoded, rewriteStretchRatio);
                            testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                            
                            item.newArrayBuffer = testBuffer;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed rewrite speed!");
} else {
    console.log("Regex failed to match.");
}
