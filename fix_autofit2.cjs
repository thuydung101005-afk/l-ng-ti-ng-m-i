const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(newFinalSpeed > speed \+ 0\.05\) \{[\s\S]*?addLog\(\`  💡 Câu \$\{i \+ 1\} rút gọn thành công: "\$\{bestRewrite\}" \(Giữ tốc độ \$\{speed\}x\)\`, 'success'\);\s*\}/m;

const replacement = `if (newFinalSpeed > speed + 0.05) {
                               addLog(\`  ⚠️ Câu \${i + 1} sau rút gọn vẫn dài. Auto-Fit đang ép tốc độ thành \${newFinalSpeed}x (Tối đa 1.5x)\`, 'warning');
                               newArrayBuffer = await runTTS(bestRewrite, newFinalSpeed, i);
                           } else if (newActualDuration > targetDuration + 0.1) {
                               addLog(\`  ⚠️ Câu \${i + 1} sau rút gọn vẫn dài (\${newActualDuration.toFixed(2)}s > \${targetDuration.toFixed(2)}s), giữ tốc độ \${speed}x vì đã đạt giới hạn\`, 'warning');
                           } else {
                               addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Giữ tốc độ \${speed}x)\`, 'success');
                           }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed else branch for newFinalSpeed");
} else {
    console.log("Could not find regex match in src/App.tsx");
}
