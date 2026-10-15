const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /let newArrayBuffer = await runTTS\(bestRewrite, speed, i\);[\s\S]*?arrayBuffer = newArrayBuffer;/m;

const replacement = `let newArrayBuffer = await runTTS(bestRewrite, speed, i);
                       let newDecoded = await audioCtx.decodeAudioData(newArrayBuffer.slice(0));
                       let newActualDuration = newDecoded.duration;
                       
                       if (newActualDuration > targetDuration + 0.1) {
                           // Người dùng yêu cầu KHÔNG ép Auto-Fit lên đúng thời gian, dù vẫn dài
                           addLog(\`  💡 Câu \${i + 1} rút gọn (hết 5 lần): "\${bestRewrite}" (Giữ tốc độ \${speed}x, không ép Auto-Fit)\`, 'warning');
                       } else {
                           addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Đọc tốc độ \${speed}x)\`, 'success');
                       }

                       const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
                       sub.text = prefix + bestRewrite;
                       cleanText = bestRewrite;
                       arrayBuffer = newArrayBuffer;`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Removed secondary auto-fit successfully!");
