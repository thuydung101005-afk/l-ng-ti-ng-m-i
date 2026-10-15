const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(finalSpeed > 1\.5 && aiRewrite\) \{[\s\S]*?if \(newArrayBuffer\) arrayBuffer = newArrayBuffer;\s*\}/m;

const replacement = `if (finalSpeed > 1.5 && aiRewrite) {
                       let rewriteAttempts = 0;
                       const maxAttempts = 5;
                       let bestRewrite = cleanText;
                       let currentTextToRewrite = cleanText;
                       
                       let targetSpeedForRewrite = Math.max(speed, 1.5);
                       let newArrayBuffer = null;
                       let rewriteSuccess = false;
                       
                       let currentChars = currentTextToRewrite.length;
                       let ratio = targetDuration / (actualDuration * (speed / targetSpeedForRewrite));
                       let targetChars = Math.floor(currentChars * ratio);
                       let finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * 0.05));

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
                               addLog(\`  ⚠️ Lần \${rewriteAttempts}: Test tốc độ \${targetSpeedForRewrite}x vẫn tràn thời gian. Gọi AI rút gọn tiếp (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');
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
                                 targetSpeed: targetSpeedForRewrite,
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
                                 
                                 // Test TTS ở tốc độ 1.5 (hoặc targetSpeedForRewrite)
                                 let testBuffer = await runTTS(bestRewrite, targetSpeedForRewrite, i);
                                 let testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                                 
                                 if (testDecoded.duration <= targetDuration + 0.1) {
                                    rewriteSuccess = true;
                                    newArrayBuffer = testBuffer;
                                    addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Khớp thời gian ở tốc độ \${targetSpeedForRewrite}x)\`, 'success');
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
                             addLog(\`  ❌ Câu \${i + 1}: Lỗi gọi AI rút gọn lần \${rewriteAttempts} (\${rwErr.message}).\`, 'error');
                             await new Promise(r => setTimeout(r, 2000));
                         }
                       }

                       if (!rewriteSuccess && newArrayBuffer) {
                           addLog(\`  ⚠️ Câu \${i + 1} sau \${maxAttempts} lần rút gọn vẫn dài. Giữ nguyên tốc độ tối đa \${targetSpeedForRewrite}x (chấp nhận tràn thời gian)\`, 'warning');
                       } else if (!rewriteSuccess && !newArrayBuffer) {
                           addLog(\`  ⚠️ Câu \${i + 1} rút gọn thất bại. Giữ nguyên câu gốc và tốc độ tối đa \${targetSpeedForRewrite}x (chấp nhận tràn thời gian)\`, 'warning');
                           newArrayBuffer = await runTTS(cleanText, targetSpeedForRewrite, i);
                       }

                       const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
                       sub.text = prefix + bestRewrite;
                       cleanText = bestRewrite;
                       if (newArrayBuffer) arrayBuffer = newArrayBuffer;
                     }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated AI logic to loop max 5 times and strictly not exceed 1.5x speed!");
} else {
    console.log("Could not find regex match!");
}
