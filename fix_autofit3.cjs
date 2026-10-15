const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(actualDuration > targetDuration \+ 0\.1\) \{[\s\S]*?arrayBuffer = await runTTS\(cleanText, appliedSpeed, i\);\s*\}\s*\}\s*\}/m;

const replacement = `if (actualDuration > targetDuration) {
                  const neededSpeed = speed * (actualDuration / targetDuration);
                  const finalSpeed = Math.min(Number(neededSpeed.toFixed(2)) + 0.01, 3.0);
                  
                  if (finalSpeed > speed) {
                     if (finalSpeed > 1.5 && aiRewrite) {
                       let rewriteAttempts = 0;
                       const maxAttempts = 3; // Giảm xuống 3 lần để tiết kiệm
                       let bestRewrite = cleanText;
                       let currentTextToRewrite = cleanText;
                       
                       let currentChars = currentTextToRewrite.length;
                       let ratio = targetDuration / (actualDuration * (speed / 1.5));
                       let targetChars = Math.floor(currentChars * ratio);
                       let finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * 0.05));
                       
                       let rewriteSuccess = false;
                       let targetSpeedForRewrite = Math.max(speed, 1.5);
                       let newArrayBuffer = null;

                       while (!rewriteSuccess && rewriteAttempts < maxAttempts) {
                         rewriteAttempts++;
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

                             if (rewriteAttempts > 1) {
                               addLog(\`  ⚠️ Lần \${rewriteAttempts}: Test tốc độ 1.5x vẫn tràn thời gian. Gọi AI rút gọn tiếp (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');
                             } else {
                               addLog(\`  ⚠️ Câu \${i + 1}: Tốc độ > 1.5x. Gọi AI rút gọn (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');
                             }

                             const rewriteRes = await fetch('/api/gemini/rewrite', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({
                                 text: currentTextToRewrite,
                                 targetChars: finalTargetChars,
                                 targetDuration: targetDuration,
                                 targetSpeed: speed,
                                 previousText,
                                 nextText,
                                 clientGeminiKeysStr: geminiApiKeysStr,
                               })
                             });

                             if (rewriteRes.ok) {
                               const rewriteData = await rewriteRes.json();
                               if (rewriteData.result) {
                                 const rewriteResult = rewriteData.result;
                                 bestRewrite = rewriteResult;
                                 
                                 // Test TTS ở tốc độ 1.5
                                 let testBuffer = await runTTS(bestRewrite, targetSpeedForRewrite, i);
                                 let testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                                 
                                 if (testDecoded.duration <= targetDuration) {
                                    rewriteSuccess = true;
                                    newArrayBuffer = testBuffer;
                                    addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Test vừa khớp thời gian ở tốc độ \${targetSpeedForRewrite}x)\`, 'success');
                                 } else {
                                    currentTextToRewrite = rewriteResult;
                                    finalTargetChars = Math.floor(finalTargetChars * 0.85); // Ép ngắn hơn nữa
                                    newArrayBuffer = testBuffer; // Giữ lại kết quả tốt nhất hiện tại
                                 }
                               } else {
                                 throw new Error('API không trả về kết quả');
                               }
                             } else {
                                 throw new Error(\`HTTP \${rewriteRes.status}\`);
                             }
                         } catch (rwErr) {
                             addLog(\`  ❌ Câu \${i + 1}: Lỗi gọi AI rút gọn lần \${rewriteAttempts} (\${rwErr.message}).\`, 'warning');
                             await new Promise(r => setTimeout(r, 2000));
                         }
                       }

                       if (!rewriteSuccess && newArrayBuffer) {
                           // Đã hết số lần rút gọn nhưng vẫn dài
                           let finalDecoded = await audioCtx.decodeAudioData(newArrayBuffer.slice(0));
                           let finalActualDuration = finalDecoded.duration;
                           if (finalActualDuration > targetDuration) {
                               addLog(\`  ⚠️ Câu \${i + 1} sau rút gọn vẫn dài (\${finalActualDuration.toFixed(2)}s > \${targetDuration.toFixed(2)}s). Giữ tốc độ \${targetSpeedForRewrite}x vì đã đạt giới hạn\`, 'warning');
                           } else {
                               addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Đọc tốc độ \${targetSpeedForRewrite}x)\`, 'success');
                           }
                       }

                       const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
                       sub.text = prefix + bestRewrite;
                       cleanText = bestRewrite;
                       if (newArrayBuffer) arrayBuffer = newArrayBuffer;

                     } else {
                       const maxSpeed = aiRewrite ? 1.5 : finalSpeed;
                       const appliedSpeed = aiRewrite ? Math.min(finalSpeed, 1.5) : finalSpeed;
                       addLog(\`  ⚠️ Câu \${i + 1} dài (\${actualDuration.toFixed(2)}s > \${targetDuration.toFixed(2)}s). Auto-Fit đang ép tốc độ thành \${appliedSpeed}x...\`, 'warning');
                       arrayBuffer = await runTTS(cleanText, appliedSpeed, i);
                     }
                  }
                }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated AI logic to test TTS properly!");
} else {
    console.log("Could not find regex match!");
}
