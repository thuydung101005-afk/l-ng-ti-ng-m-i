const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetIndex = code.indexOf('if (finalSpeed > 1.5 && aiRewrite) {');
if (targetIndex !== -1) {
    const endString = 'arrayBuffer = await runTTS(cleanText, appliedSpeed, i);\n                     }';
    const endIndex = code.indexOf(endString, targetIndex);
    if (endIndex !== -1) {
        const fullEndIndex = endIndex + endString.length;
        const before = code.substring(0, targetIndex);
        const after = code.substring(fullEndIndex);
        
        const newBlock = `if (finalSpeed > 1.5 && aiRewrite) {
                       let rewriteAttempts = 0;
                       const maxAttempts = 5; // Cố gắng tối đa 5 lần
                       let bestRewrite = cleanText;
                       let currentTextToRewrite = cleanText;
                       
                       let currentChars = currentTextToRewrite.length;
                       let ratio = targetDuration / (actualDuration * (speed / 1.5));
                       let targetChars = Math.floor(currentChars * ratio);
                       let finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * 0.05));
                       
                       let rewriteSuccess = false;
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
                               addLog(\`  ⚠️ Lần \${rewriteAttempts}: Cần rút gọn thêm. Gọi AI rút gọn tiếp (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');
                             } else {
                               addLog(\`  ⚠️ Câu \${i + 1}: Tốc độ > 1.5x. Gọi AI rút gọn (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');
                             }

                             const rewriteRes = await fetch('/api/gemini/rewrite', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({
                                 text: currentTextToRewrite,
                                 targetChars: finalTargetChars,
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
                                 
                                 if (rewriteResult.length <= finalTargetChars * 1.1) {
                                    rewriteSuccess = true;
                                 } else {
                                    currentTextToRewrite = rewriteResult;
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

                       let newArrayBuffer = await runTTS(bestRewrite, speed, i);
                       let newDecoded = await audioCtx.decodeAudioData(newArrayBuffer.slice(0));
                       let newActualDuration = newDecoded.duration;
                       
                       if (newActualDuration > targetDuration + 0.1) {
                           let neededNewSpeed = speed * (newActualDuration / targetDuration);
                           let finalAppliedSpeed = Math.min(Number(neededNewSpeed.toFixed(2)), 3.0);
                           newArrayBuffer = await runTTS(bestRewrite, finalAppliedSpeed, i);
                           addLog(\`  💡 Câu \${i + 1} rút gọn: "\${bestRewrite}" (Vẫn dài, ép Auto-Fit thành \${finalAppliedSpeed}x)\`, 'success');
                       } else {
                           addLog(\`  💡 Câu \${i + 1} rút gọn thành công: "\${bestRewrite}" (Đọc tốc độ \${speed}x)\`, 'success');
                       }

                       const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
                       sub.text = prefix + bestRewrite;
                       cleanText = bestRewrite;
                       arrayBuffer = newArrayBuffer;
                     } else {
                       const maxSpeed = aiRewrite ? 1.5 : finalSpeed;
                       const appliedSpeed = aiRewrite ? Math.min(finalSpeed, 1.5) : finalSpeed;
                       addLog(\`  ⚠️ Câu \${i + 1} dài (\${actualDuration.toFixed(2)}s). Auto-Fit đang ép tốc độ thành \${appliedSpeed}x...\`, 'warning');
                       arrayBuffer = await runTTS(cleanText, appliedSpeed, i);
                     }`;
        
        fs.writeFileSync('src/App.tsx', before + newBlock + after);
        console.log("Fixed manually with substring!");
    } else {
        console.log("Could not find endIndex");
    }
} else {
    console.log("Could not find targetIndex");
}
