const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(!rewriteSuccess && newArrayBuffer\) \{[\s\S]*?const prefix/m;
const replacement = `if (!rewriteSuccess && newArrayBuffer) {
                           // Đã hết số lần rút gọn nhưng vẫn dài
                           let finalDecoded = await audioCtx.decodeAudioData(newArrayBuffer.slice(0));
                           let finalActualDuration = finalDecoded.duration;
                           if (finalActualDuration > targetDuration) {
                               let emergencySpeed = targetSpeedForRewrite * (finalActualDuration / targetDuration);
                               let appliedEmergencySpeed = Math.min(Number(emergencySpeed.toFixed(2)) + 0.01, 3.0);
                               addLog(\`  ⚠️ Câu \${i + 1} sau 3 lần rút gọn vẫn dài. Bắt buộc ép tốc độ lên \${appliedEmergencySpeed}x để không tràn thời gian!\`, 'warning');
                               newArrayBuffer = await runTTS(bestRewrite, appliedEmergencySpeed, i);
                           }
                       }

                       const prefix`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated emergency autofit!");
} else {
    console.log("Could not find regex match!");
}
