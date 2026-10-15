const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/let newArrayBuffer = await runTTS\(bestRewrite, speed, i\);/g, "let newArrayBuffer = await runTTS(bestRewrite, 1.5, i);");

code = code.replace(/addLog\(\`  💡 Câu \$\{i \+ 1\} rút gọn \(hết 5 lần\): "\$\{bestRewrite\}" \(Giữ tốc độ \$\{speed\}x, không ép Auto-Fit\)\`, 'warning'\);/g, "addLog(`  💡 Câu ${i + 1} rút gọn (hết 5 lần): \"${bestRewrite}\" (Giữ tốc độ 1.5x, không ép Auto-Fit)`, 'warning');");

code = code.replace(/addLog\(\`  💡 Câu \$\{i \+ 1\} rút gọn thành công: "\$\{bestRewrite\}" \(Đọc tốc độ \$\{speed\}x\)\`, 'success'\);/g, "addLog(`  💡 Câu ${i + 1} rút gọn thành công: \"${bestRewrite}\" (Đọc tốc độ 1.5x)`, 'success');");

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed speed for AI rewrite result to 1.5x!");
