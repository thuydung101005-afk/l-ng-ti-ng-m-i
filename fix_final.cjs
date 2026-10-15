const fs = require('fs');

// 1. Fix server.ts prompt
let serverCode = fs.readFileSync('server.ts', 'utf8');
const serverRegex = /const prompt = \`Hãy viết lại và rút gọn[\s\S]*?Câu gốc cần rút gọn:\n"\$\{text\}"\`;/m;
const serverReplacement = `const prompt = \`Hãy viết lại và rút gọn câu dưới đây sao cho thật súc tích, mạch lạc và tự nhiên.
Yêu cầu BẮT BUỘC:\${durationStr}
- Giữ nguyên ý nghĩa cốt lõi của câu gốc, đảm bảo câu văn mạch lạc, đúng nghĩa cũ và trôi chảy.
- Không thêm nội dung, không giải thích, không tự ý bình luận.
- CHỈ ĐƯỢC trả về nội dung câu đã rút gọn, KHÔNG giải thích, KHÔNG thêm ngoặc kép.
\${contextStr}
Câu gốc cần rút gọn:
"\${text}"\`;`;
serverCode = serverCode.replace(serverRegex, serverReplacement);
fs.writeFileSync('server.ts', serverCode);
console.log("Updated server.ts prompt!");

// 2. Fix App.tsx autofit logic
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
const appRegex = /if \(testDecoded\.duration <= targetDuration\) \{[\s\S]*?\} else \{[\s\S]*?throw new Error/m;
const appReplacement = `if (testDecoded.duration <= targetDuration + 0.2) {
                                  newArrayBuffer = testBuffer;
                                  addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Khớp thời gian ở tốc độ \${targetSpeedForRewrite}x)\`, 'success');
                               } else {
                                  // Tràn một chút, chấp nhận tăng nhẹ tốc độ (tối đa 1.8x)
                                  let finalActualDuration = testDecoded.duration;
                                  let emergencySpeed = targetSpeedForRewrite * (finalActualDuration / targetDuration);
                                  let appliedEmergencySpeed = Math.min(Number(emergencySpeed.toFixed(2)) + 0.01, 1.8);
                                  
                                  if (appliedEmergencySpeed > targetSpeedForRewrite) {
                                      addLog(\`  ⚠️ Câu \${i + 1} rút gọn xong vẫn dài. Tăng nhẹ tốc độ lên \${appliedEmergencySpeed}x (chấp nhận tràn một ít nếu vẫn thiếu)\`, 'warning');
                                      newArrayBuffer = await runTTS(bestRewrite, appliedEmergencySpeed, i);
                                  } else {
                                      newArrayBuffer = testBuffer;
                                      addLog(\`  ⚠️ Câu \${i + 1} rút gọn xong vẫn dài, giữ nguyên tốc độ \${targetSpeedForRewrite}x (chấp nhận tràn thời gian một chút)\`, 'warning');
                                  }
                               }
                             } else {
                               throw new Error`;
appCode = appCode.replace(appRegex, appReplacement);

const appCatchRegex = /} catch \(rwErr\) {[\s\S]*?newArrayBuffer = await runTTS\(cleanText, appliedEmergencySpeed, i\);\s*}/m;
const appCatchReplacement = `} catch (rwErr) {
                           addLog(\`  ❌ Câu \${i + 1}: Lỗi gọi AI rút gọn (\${rwErr.message}). Sẽ dùng nguyên bản và ép tốc độ tối đa 2.0x.\`, 'error');
                           let emergencySpeed = speed * (actualDuration / targetDuration);
                           let appliedEmergencySpeed = Math.min(Number(emergencySpeed.toFixed(2)) + 0.01, 2.0);
                           newArrayBuffer = await runTTS(cleanText, appliedEmergencySpeed, i);
                       }`;
appCode = appCode.replace(appCatchRegex, appCatchReplacement);

fs.writeFileSync('src/App.tsx', appCode);
console.log("Updated App.tsx autofit logic!");
