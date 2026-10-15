const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(finalSpeed > speed\) \{\s*if \(finalSpeed > 1\.5 && aiRewrite\) \{[\s\S]*?arrayBuffer = await runTTS\(cleanText, appliedSpeed, i\);\s*\}/m;

const replacement = `if (finalSpeed > speed) {
                     if (finalSpeed > 1.5 && aiRewrite) {
                       let bestRewrite = cleanText;
                       
                       let currentChars = cleanText.length;
                       let ratio = targetDuration / (actualDuration * (speed / 1.5));
                       let targetChars = Math.floor(currentChars * ratio);
                       let finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * 0.05));
                       
                       let targetSpeedForRewrite = Math.max(speed, 1.5);
                       let newArrayBuffer = null;

                       addLog(\`  ⚠️ Câu \${i + 1}: Tốc độ > 1.5x. Gọi AI rút gọn 1 LẦN DUY NHẤT (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');

                       try {
                           let previousText = "";
                           if (i > 0) {
                              let prevSubText = processedSubs[i-1].text.trim();
                              if (prevSubText.startsWith('-')) prevSubText = prevSubText.substring(1).trim();
                              previousText = prevSubText;
                           }
                           let nextText = "";
                           if (i < totalSubs - 1) {
                              let nextSubText = processedSubs[i+1].text.trim();
                              if (nextSubText.startsWith('-')) nextSubText = nextSubText.substring(1).trim();
                              nextText = nextSubText;
                           }

                           const rewriteRes = await fetch('/api/gemini/rewrite', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({
                               text: cleanText,
                               targetChars: finalTargetChars,
                               targetDuration: targetDuration,
                               targetSpeed: targetSpeedForRewrite,
                               previousText,
                               nextText,
                               clientGeminiKeysStr: geminiApiKeysStr,
                             })
                           });

                           if (rewriteRes.ok) {
                             const rewriteData = await rewriteRes.json();
                             if (rewriteData.result) {
                               bestRewrite = rewriteData.result;
                               
                               // Test TTS ở tốc độ 1.5
                               let testBuffer = await runTTS(bestRewrite, targetSpeedForRewrite, i);
                               let testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                               
                               if (testDecoded.duration <= targetDuration) {
                                  newArrayBuffer = testBuffer;
                                  addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Vừa khớp thời gian ở tốc độ \${targetSpeedForRewrite}x)\`, 'success');
                               } else {
                                  // Tràn một chút, buộc ép tốc độ để khớp tuyệt đối
                                  let finalActualDuration = testDecoded.duration;
                                  let emergencySpeed = targetSpeedForRewrite * (finalActualDuration / targetDuration);
                                  let appliedEmergencySpeed = Math.min(Number(emergencySpeed.toFixed(2)) + 0.01, 3.0);
                                  addLog(\`  ⚠️ Câu \${i + 1} rút gọn xong vẫn hơi dài. Ép tốc độ lên \${appliedEmergencySpeed}x để đảm bảo không tràn thời gian!\`, 'warning');
                                  newArrayBuffer = await runTTS(bestRewrite, appliedEmergencySpeed, i);
                               }
                             } else {
                               throw new Error('API không trả về kết quả');
                             }
                           } else {
                               throw new Error(\`HTTP \${rewriteRes.status}\`);
                           }
                       } catch (rwErr) {
                           addLog(\`  ❌ Câu \${i + 1}: Lỗi gọi AI rút gọn (\${rwErr.message}). Sẽ dùng nguyên bản và ép tốc độ.\`, 'error');
                           let emergencySpeed = speed * (actualDuration / targetDuration);
                           let appliedEmergencySpeed = Math.min(Number(emergencySpeed.toFixed(2)) + 0.01, 3.0);
                           newArrayBuffer = await runTTS(cleanText, appliedEmergencySpeed, i);
                       }

                       const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
                       sub.text = prefix + bestRewrite;
                       cleanText = bestRewrite;
                       if (newArrayBuffer) arrayBuffer = newArrayBuffer;

                     } else {
                       const appliedSpeed = aiRewrite ? finalSpeed : finalSpeed; // Nếu dùng AI rewrite thì chỉ tới 1.5 là gọi AI rồi, nên finalSpeed ở đây <= 1.5
                       if (aiRewrite && finalSpeed <= 1.5) {
                           addLog(\`  ⚡ Câu \${i + 1} dài hơn khoảng trống. Auto-Fit tăng nhẹ tốc độ thành \${appliedSpeed}x (<= 1.5x)\`, 'info');
                       } else if (!aiRewrite) {
                           addLog(\`  ⚠️ Câu \${i + 1} dài (\${actualDuration.toFixed(2)}s > \${targetDuration.toFixed(2)}s). Auto-Fit ép tốc độ thành \${appliedSpeed}x...\`, 'warning');
                       }
                       arrayBuffer = await runTTS(cleanText, appliedSpeed, i);
                     }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated AI logic to call ONCE and strictly fit time!");
} else {
    console.log("Could not find regex match!");
}
