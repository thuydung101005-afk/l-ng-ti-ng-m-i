const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\/\/ ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----[\s\S]*?\/\/ ---- Nếu vẫn còn tràn thời gian sau khi đã ở NORMAL_SPEED, xử lý thêm ----[\s\S]*?arrayBuffer = await timeStretchBuffer\(decoded, extraRatio\);\s*\}\s*\}\s*\}/;

const replacement = `// ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----
              const WINDOW_SIZE = 15;
              const getRegression = (samples: {words: number, duration: number}[]) => {
                if (samples.length < 5) return null;
                const recent = samples.slice(-WINDOW_SIZE);
                const slopes: number[] = [];
                for (let j = 0; j < recent.length; j++) {
                  for (let k = j + 1; k < recent.length; k++) {
                    const dx = recent[k].words - recent[j].words;
                    const dy = recent[k].duration - recent[j].duration;
                    if (dx !== 0) {
                      slopes.push(dy / dx);
                    }
                  }
                }
                if (slopes.length === 0) return null;
                slopes.sort((a, b) => a - b);
                const slope = slopes[Math.floor(slopes.length / 2)];

                const intercepts = recent.map(p => p.duration - slope * p.words).sort((a, b) => a - b);
                const intercept = intercepts[Math.floor(intercepts.length / 2)];

                const residuals = recent.map(p => Math.abs(p.duration - (intercept + slope * p.words))).sort((a, b) => a - b);
                const mad = residuals[Math.floor(residuals.length / 2)];
                const medianDuration = recent.map(p => p.duration).sort((a, b) => a - b)[Math.floor(recent.length / 2)];

                return { intercept, slope, mad, medianDuration };
              };

              const isGroupedSentence = smartGroup && sub.text.includes(', ');
              const rateSamplesRef = isGroupedSentence ? speakingRateSamplesGrouped : speakingRateSamplesSingle;
              const wordCount = cleanText.trim().split(/\\s+/).length;
              const rateStats = getRegression(rateSamplesRef.current);

              let renderSpeedToUse = RENDER_SPEED;

              if (wordCount <= 4 || targetDuration <= 1.0) {
                 renderSpeedToUse = MID_RENDER_SPEED;
                 addLog(\`  ⚡ Câu \${i + 1} ngắn (<= 4 từ hoặc <= 1s). Render trực tiếp ở \${MID_RENDER_SPEED}x.\`, 'info');
              } else if (autoFit && rateStats) {
                 const { intercept, slope, mad, medianDuration } = rateStats;
                 const estimatedDuration = intercept + slope * wordCount;
                 const estimatedSpeedNeeded = NORMAL_SPEED * (estimatedDuration / targetDuration);

                 addLog(\`  🧪 DEBUG: Câu \${i+1} estimatedSpeedNeeded=\${estimatedSpeedNeeded.toFixed(2)}, intercept=\${intercept.toFixed(2)}, slope=\${slope.toFixed(2)}, samples=\${rateSamplesRef.current.length}\`, 'info');

                 const noiseRatio = medianDuration > 0 ? mad / medianDuration : 0;
                 const margin = 1.15 + Math.min(noiseRatio * 2, 0.3);
                 
                 const upperBoundEstimate = estimatedSpeedNeeded * (1 + Math.min(noiseRatio, 0.25));

                 if (aiRewrite && estimatedSpeedNeeded > MID_CAP_SPEED * margin) {
                     addLog(\`  🔮 Câu \${i + 1} dự đoán quá dài (~\${estimatedSpeedNeeded.toFixed(1)}x, margin \${margin.toFixed(2)}). Bỏ qua render thử.\`, 'warning');
                     rewriteQueue.push({ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any });
                     sentenceSuccess = true;
                     updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                     continue;
                 } else if (upperBoundEstimate > NORMAL_SPEED) {
                     renderSpeedToUse = MID_RENDER_SPEED;
                     addLog(\`  🔮 Câu \${i + 1} dự đoán cần tăng tốc (upper bound ~\${upperBoundEstimate.toFixed(1)}x). Render trực tiếp ở \${MID_RENDER_SPEED}x.\`, 'info');
                 }
              }

              // ---- Render 1 lần ở renderSpeedToUse cố định ----
              let arrayBuffer = await runTTS(cleanText, renderSpeedToUse, i, exportIdRef, forceRefetch);
              forceRefetch = false;

              let decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
              let originalRenderDuration = decoded.duration;
              let normalizedDurationForSample = originalRenderDuration * (renderSpeedToUse / NORMAL_SPEED);

              // Update samples universally
              const existingReg = getRegression(rateSamplesRef.current);
              if (!existingReg) {
                  rateSamplesRef.current.push({ words: wordCount, duration: normalizedDurationForSample });
              } else {
                  const expected = existingReg.intercept + existingReg.slope * wordCount;
                  if (Math.abs(normalizedDurationForSample - expected) / expected < 0.5) {
                      rateSamplesRef.current.push({ words: wordCount, duration: normalizedDurationForSample });
                  }
              }

              if (renderSpeedToUse === MID_RENDER_SPEED) {
                 // ---- NHÓM 3: render sẵn ở 1.65x, ép thẳng lên trần 1.8x cố định ----
                 const capRatio = MID_CAP_SPEED / MID_RENDER_SPEED;
                 arrayBuffer = await timeStretchBuffer(decoded, capRatio);
                 decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
                 let actualDuration = decoded.duration;

                 if (actualDuration <= targetDuration + 0.05) {
                    audioClips[i] = { buffer: arrayBuffer, startTime: sub.start };
                    addLog(\`  ✅ Câu \${i + 1} hoàn tất ở mức cố định \${MID_CAP_SPEED}x (nhóm 3).\`, 'success');
                    sentenceSuccess = true;
                    updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                    continue;
                 } else {
                    if (aiRewrite) {
                       addLog(\`  ⚠️ Câu \${i + 1} vẫn dài dù đã ở \${MID_CAP_SPEED}x. Chuyển sang hàng đợi AI rút gọn.\`, 'warning');
                       rewriteQueue.push({ index: i, cleanText, actualDuration, targetDuration, originalBuffer: arrayBuffer });
                    } else {
                       addLog(\`  ⚠️ Câu \${i + 1} vẫn dài hơn khung dù đã ở \${MID_CAP_SPEED}x (AI rút gọn đang tắt). Chấp nhận audio hiện tại.\`, 'warning');
                       audioClips[i] = { buffer: arrayBuffer, startTime: sub.start };
                    }
                    sentenceSuccess = true;
                    updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                    continue;
                 }
              }

              // ---- NHÓM 1 (mặc định): giữ nguyên logic cũ, render 1.4x -> stretch 1.55x ----
              const baseRatio = NORMAL_SPEED / RENDER_SPEED;
              arrayBuffer = await timeStretchBuffer(decoded, baseRatio);
              decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
              let actualDuration = decoded.duration;

              // ---- Nếu vẫn còn tràn thời gian sau khi đã ở NORMAL_SPEED, xử lý thêm ----
              if (autoFit && actualDuration > targetDuration) {
                const neededSpeed = NORMAL_SPEED * (actualDuration / targetDuration);
                const finalSpeed = Math.min(Number(neededSpeed.toFixed(2)) + 0.01, 3.0);

                if (finalSpeed > NORMAL_SPEED) {
                   if (finalSpeed > 1.8 && aiRewrite) {
                     rewriteQueue.push({ index: i, cleanText, actualDuration, targetDuration, originalBuffer: arrayBuffer });
                     addLog(\`  ⚠️ Câu \${i + 1} cần AI rút gọn (vượt quá tốc độ 1.8x). Đã đưa vào hàng đợi xử lý sau.\`, 'warning');
                     sentenceSuccess = true;
                     updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                     continue;
                   } else {
                     addLog(\`  ⚡ Câu \${i + 1} dài hơn khoảng trống. Tăng thêm tốc độ lên \${finalSpeed}x (<= 1.8x)\`, 'info');
                     const extraRatio = actualDuration / targetDuration;
                     arrayBuffer = await timeStretchBuffer(decoded, extraRatio);
                   }
                }
              }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Successfully fixed the duplicated blocks.");
} else {
    console.log("Regex not found.");
}
