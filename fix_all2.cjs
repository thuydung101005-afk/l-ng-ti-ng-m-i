const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Phase 2.1: Add rate prediction logic
const processInitialRegex = /let targetDuration = sub\.end \- sub\.start;([\s\S]*?)if \(targetDuration <= 0\) targetDuration = 0\.1;/m;
const processInitialReplacement = `let targetDuration = sub.end - sub.start;$1if (targetDuration <= 0) targetDuration = 0.1;

          const getMedianRate = () => {
            const samples = speakingRateSamples.current;
            if (samples.length < 5) return null;
            const sorted = [...samples].sort((a, b) => a - b);
            return sorted[Math.floor(sorted.length / 2)];
          };

          const medianRate = getMedianRate();
          if (autoFit && aiRewrite && medianRate) {
             const estimatedDuration = cleanText.length / medianRate / speed;
             const estimatedSpeedNeeded = speed * (estimatedDuration / targetDuration);
             
             if (estimatedSpeedNeeded > 1.8 * 1.3) { // biên độ an toàn 1.3
                 addLog(\`  🔮 Câu \${i + 1} dự đoán quá dài (cần ~\${estimatedSpeedNeeded.toFixed(1)}x). Đưa thẳng vào hàng đợi AI...\`, 'warning');
                 rewriteQueue.push({ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any });
                 updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                 continue; // Bỏ qua render thử
             }
          }`;
code = code.replace(processInitialRegex, processInitialReplacement);

// Phase 2.2: Add sample pushing
const decodedRegex = /const decoded = await audioCtx\.decodeAudioData\(arrayBuffer\.slice\(0\)\);\s*const actualDuration = decoded\.duration;/m;
const decodedReplacement = `const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
                const actualDuration = decoded.duration;
                speakingRateSamples.current.push(cleanText.length / actualDuration * speed);`;
code = code.replace(decodedRegex, decodedReplacement);

// Phase 2.3: Final target chars logic
const finalTargetRegex = /if \(\!item\.finalTargetChars\) \{\s*item\.finalTargetChars = Math\.max\(1, targetChars \- Math\.floor\(currentChars \* 0\.05\)\);\s*\}/m;
const finalTargetReplacement = `if (!item.finalTargetChars) {
                     const isPredicted = item.originalBuffer === null;
                     const safetyMargin = isPredicted ? 0.10 : 0.05;
                     item.finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * safetyMargin));
                  }`;
code = code.replace(finalTargetRegex, finalTargetReplacement);

// Phase 2.4: Rewrite fallback removal
const rewriteFallbackRegex = /if \(\!item\.rewriteSuccess\) \{([\s\S]*?)item\.newArrayBuffer = await timeStretchBuffer\(decoded, emergencyRatio\);\s*\}/m;
const rewriteFallbackReplacement = `if (!item.rewriteSuccess) {
               addLog(\`  ⚠️ Câu \${item.index + 1} rút gọn thất bại. Chấp nhận kết quả hiện tại.\`, 'warning');
               if (!item.newArrayBuffer) {
                  if (item.originalBuffer) {
                      item.newArrayBuffer = item.originalBuffer;
                  } else {
                      addLog(\`  ⚠️ Cần render audio gốc cho câu \${item.index + 1} do dự đoán trước đó chưa render.\`, 'info');
                      let exportIdRef: { current: string | null } = { current: null };
                      item.newArrayBuffer = await runTTS(item.cleanText, speed, item.index, exportIdRef, false);
                  }
               }
           }`;
code = code.replace(rewriteFallbackRegex, rewriteFallbackReplacement);

fs.writeFileSync('src/App.tsx', code);
console.log("Phase 2 done");
