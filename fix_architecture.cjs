const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const audioClips: \{ buffer: ArrayBuffer; startTime: number; maxDuration\?: number \}\[\] = \[\];[\s\S]*?let finalBlob = null;/m;

const replacement = `const audioClips: ({ buffer: ArrayBuffer; startTime: number; maxDuration?: number } | null)[] = new Array(totalSubs).fill(null);
      const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new audioContextClass();
      
      const keys = ttsProvider === 'vclip' ? apiKeysStr.split(/[\\n,]+/).map(k => k.trim()).filter(k => k.length > 0) : aivoicesKeysStr.split(/[\\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
      const concurrencyLimit = concurrency;
      
      let currentIndex = 0;
      
      // Hàng đợi 2: Các câu cần AI rewrite
      const rewriteQueue: { index: number, cleanText: string, actualDuration: number, targetDuration: number, originalBuffer: ArrayBuffer }[] = [];

      const processInitialQueue = async (): Promise<void> => {
        while (currentIndex < totalSubs) {
          const i = currentIndex++;
          const sub = processedSubs[i];
          addLog(\`[\${i + 1}/\${totalSubs}] Đang xử lý: "\${sub.text.length > 40 ? sub.text.substring(0, 40) + '...' : sub.text}"\`, 'info');

          let cleanText = sub.text.trim();
          if (cleanText.startsWith('-')) {
             cleanText = cleanText.substring(1).trim();
          }

          if (!cleanText) {
             addLog(\`  ⚠️ Bỏ qua câu \${i + 1} do nội dung trống.\`, 'info');
             continue;
          }

          let sentenceSuccess = false;
          let sentenceAttempts = 0;

          while (!sentenceSuccess) {
            sentenceAttempts++;
            try {
              let arrayBuffer = await runTTS(cleanText, speed, i);
              
              let targetDuration = sub.end - sub.start;
              if (i < totalSubs - 1) {
                 const nextSub = processedSubs[i+1];
                 if (sub.start + targetDuration > nextSub.start) {
                    targetDuration = nextSub.start - sub.start;
                 }
              }
              if (targetDuration <= 0) targetDuration = 0.1;

              if (autoFit) {
                const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
                const actualDuration = decoded.duration;

                if (actualDuration > targetDuration) {
                  const neededSpeed = speed * (actualDuration / targetDuration);
                  const finalSpeed = Math.min(Number(neededSpeed.toFixed(2)) + 0.01, 3.0);
                  
                  if (finalSpeed > speed) {
                     if (finalSpeed > 1.5 && aiRewrite) {
                       // Đưa vào hàng đợi rewrite, tiếp tục câu khác
                       rewriteQueue.push({ index: i, cleanText, actualDuration, targetDuration, originalBuffer: arrayBuffer });
                       addLog(\`  ⚠️ Câu \${i + 1} cần AI rút gọn (vượt quá tốc độ 1.5x). Đã đưa vào hàng đợi xử lý sau.\`, 'warning');
                       sentenceSuccess = true;
                       continue;
                     } else {
                       const appliedSpeed = aiRewrite ? finalSpeed : finalSpeed;
                       if (aiRewrite && finalSpeed <= 1.5) {
                           addLog(\`  ⚡ Câu \${i + 1} dài hơn khoảng trống. Auto-Fit tăng nhẹ tốc độ thành \${appliedSpeed}x (<= 1.5x)\`, 'info');
                       } else if (!aiRewrite) {
                           addLog(\`  ⚠️ Câu \${i + 1} dài (\${actualDuration.toFixed(2)}s > \${targetDuration.toFixed(2)}s). Auto-Fit ép tốc độ thành \${appliedSpeed}x...\`, 'warning');
                       }
                       arrayBuffer = await runTTS(cleanText, appliedSpeed, i);
                     }
                  }
                }
              }

              audioClips[i] = { buffer: arrayBuffer, startTime: sub.start };
              addLog(\`  ✅ Hoàn tất câu \${i + 1}\`, 'success');
              sentenceSuccess = true;

            } catch (err: any) {
               addLog(\`  ⚠️ Lỗi câu \${i + 1} (lần \${sentenceAttempts}): \${err.message}. Đang thử lại sau 2s...\`, 'error');
               await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      };

      let rewriteIndex = 0;
      const processRewriteQueue = async (): Promise<void> => {
        while (rewriteIndex < rewriteQueue.length) {
          const item = rewriteQueue[rewriteIndex++];
          const { index: i, cleanText: originalCleanText, actualDuration, targetDuration, originalBuffer } = item;
          const sub = processedSubs[i];
          
          let rewriteAttempts = 0;
          const maxAttempts = 5;
          let bestRewrite = originalCleanText;
          let currentTextToRewrite = originalCleanText;
          let cleanText = originalCleanText;
          
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
                  addLog(\`  ⚠️ Hàng đợi AI - Lần \${rewriteAttempts}: Test tốc độ \${targetSpeedForRewrite}x vẫn tràn thời gian. Gọi AI rút gọn tiếp (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');
                } else {
                  addLog(\`  ⚠️ Hàng đợi AI - Câu \${i + 1}: Bắt đầu rút gọn (mục tiêu ~\${finalTargetChars} ký tự)...\`, 'warning');
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
                    
                    // Test TTS
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
            } catch (rwErr: any) {
                addLog(\`  ❌ Câu \${i + 1}: Lỗi gọi AI rút gọn lần \${rewriteAttempts} (\${rwErr.message}).\`, 'error');
                await new Promise(r => setTimeout(r, 2000));
            }
          }

          if (!rewriteSuccess && newArrayBuffer) {
              addLog(\`  ⚠️ Câu \${i + 1} sau \${maxAttempts} lần rút gọn vẫn dài. Giữ nguyên tốc độ tối đa \${targetSpeedForRewrite}x (chấp nhận tràn thời gian)\`, 'warning');
          } else if (!rewriteSuccess && !newArrayBuffer) {
              addLog(\`  ⚠️ Câu \${i + 1} rút gọn thất bại. Giữ nguyên câu gốc và ép tốc độ tối đa 2.0x.\`, 'warning');
              let emergencySpeed = speed * (actualDuration / targetDuration);
              let appliedEmergencySpeed = Math.min(Number(emergencySpeed.toFixed(2)) + 0.01, 2.0);
              newArrayBuffer = await runTTS(cleanText, appliedEmergencySpeed, i);
          }

          const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
          sub.text = prefix + bestRewrite;
          
          audioClips[i] = { buffer: newArrayBuffer as ArrayBuffer, startTime: sub.start };
          addLog(\`  ✅ Hoàn tất câu \${i + 1} (Từ hàng đợi AI)\`, 'success');
        }
      };

      // Chạy 5 tác vụ song song cho initial queue
      addLog(\`⚙️ Bắt đầu xử lý TTS (Giới hạn \${concurrencyLimit} luồng)...\`, 'info');
      const initialWorkers = Array(concurrencyLimit).fill(0).map(() => processInitialQueue());
      await Promise.all(initialWorkers);
      
      // Sau khi xong initial queue, xử lý rewrite queue nếu có
      if (rewriteQueue.length > 0) {
          addLog(\`⚙️ Bắt đầu xử lý \${rewriteQueue.length} câu cần AI rút gọn (Giới hạn \${concurrencyLimit} luồng)...\`, 'info');
          const rewriteWorkers = Array(concurrencyLimit).fill(0).map(() => processRewriteQueue());
          await Promise.all(rewriteWorkers);
      }
      
      const validAudioClips = audioClips.filter(clip => clip !== null) as { buffer: ArrayBuffer; startTime: number; maxDuration?: number }[];

      addLog(\`⚙️ Đang ghép các track vào file tổng hợp (Timeline mốc thời gian)...\`, 'warning');
      let finalBlob = null;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Successfully refactored queues!");
} else {
    console.log("Regex did not match!");
}
