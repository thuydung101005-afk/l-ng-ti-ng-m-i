const fs = require('fs');

const current = fs.readFileSync('current_loop.txt', 'utf8');
const lines = current.split('\n');

const whileIndex = lines.findIndex(line => line.includes('while (!sentenceSuccess) {'));
const endIndex = lines.findLastIndex(line => line.includes('await new Promise(resolve => setTimeout(resolve, 2000));'));

const blockToReplace = lines.slice(whileIndex, endIndex + 2).join('\n');

const newBlock = `          while (!sentenceSuccess) {
            sentenceAttempts++;
            try {
              let targetDuration = sub.end - sub.start;
              if (i < totalSubs - 1) {
                 const nextSub = processedSubs[i+1];
                 if (sub.start + targetDuration > nextSub.start) {
                    targetDuration = nextSub.start - sub.start;
                 }
              }
              if (targetDuration <= 0) targetDuration = 0.1;

              // ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----
              const getMedianRate = () => {
                const samples = speakingRateSamples.current;
                if (samples.length < 5) return null;
                const sorted = [...samples].sort((a, b) => a - b);
                return sorted[Math.floor(sorted.length / 2)];
              };

              const medianRate = getMedianRate();
              if (autoFit && aiRewrite && medianRate) {
                 const estimatedDuration = cleanText.length / medianRate / NORMAL_SPEED; // chia cho NORMAL_SPEED
                 const estimatedSpeedNeeded = NORMAL_SPEED * (estimatedDuration / targetDuration); // nhân NORMAL_SPEED

                 if (estimatedSpeedNeeded > 1.8 * 1.3) {
                     addLog(\`  🔮 Câu \${i + 1} dự đoán quá dài (~\${estimatedSpeedNeeded.toFixed(1)}x). Bỏ qua render thử.\`, 'warning');
                     rewriteQueue.push({ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any });
                     sentenceSuccess = true;
                     updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                     continue;
                 }
              }

              // ---- Render đúng 1 lần ở RENDER_SPEED cố định, không có ngoại lệ ----
              let arrayBuffer = await runTTS(cleanText, RENDER_SPEED, i, exportIdRef, forceRefetch);
              forceRefetch = false;

              // ---- BẮT BUỘC stretch lên NORMAL_SPEED cho MỌI câu, không điều kiện ----
              let decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
              const baseRatio = NORMAL_SPEED / RENDER_SPEED; // luôn cố định ~1.107, áp dụng như nhau cho tất cả
              arrayBuffer = await timeStretchBuffer(decoded, baseRatio);
              decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
              let actualDuration = decoded.duration; // đây là thời lượng SAU khi đã ở mốc NORMAL_SPEED

              // Ghi nhận mẫu tốc độ đọc — đo tại mốc NORMAL_SPEED, đồng nhất cho mọi câu
              speakingRateSamples.current.push(cleanText.length / actualDuration * NORMAL_SPEED);

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
              }

              audioClips[i] = { buffer: arrayBuffer, startTime: sub.start };
              addLog(\`  ✅ Hoàn tất câu \${i + 1}\`, 'success');
              sentenceSuccess = true;
              updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);

            } catch (err: any) {
               forceRefetch = true;
               addLog(\`  ⚠️ Lỗi câu \${i + 1} (lần \${sentenceAttempts}): \${err.message}. Đang thử lại sau 2s...\`, 'error');
               await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }`;

let code = fs.readFileSync('src/App.tsx', 'utf8');
if (code.includes(blockToReplace)) {
    code = code.replace(blockToReplace, newBlock);
    fs.writeFileSync('src/App.tsx', code);
    console.log('Successfully replaced loop');
} else {
    console.log('Could not find exact block to replace');
}
