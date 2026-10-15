const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /let testBuffer = await runTTS\(rewritten, RENDER_SPEED, item\.index, item\.exportIdRef\);\s*let testDecoded = await audioCtx\.decodeAudioData\(testBuffer\.slice\(0\)\);\s*const rewriteStretchRatio = item\.targetSpeedForRewrite \/ RENDER_SPEED;/m;

const replacement = `let testBuffer = await runTTS(rewritten, 1.65, item.index, item.exportIdRef);
                            let testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                            const rewriteStretchRatio = item.targetSpeedForRewrite / 1.65;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced rewrite speed to 1.65!");
} else {
    console.log("Regex failed to match rewrite speed.");
}
