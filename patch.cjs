const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = `              if (targetDuration <= 0) targetDuration = 0.1;
              // ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----`;
const endMarker = `              updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
            } catch (err: any) {`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.log('Markers not found', { startIndex, endIndex });
    process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex + endMarker.length);

const newLogic = `              if (targetDuration <= 0) targetDuration = 0.1;

              if (!aiRewrite) {
                  // --- EXACT NEW LOGIC FOR AI OFF ---
                  // Bước 1: Render thử mặc định 1.4x
                  let renderSpeed1 = 1.4;
                  let buffer1 = await runTTS(cleanText, renderSpeed1, i, exportIdRef, forceRefetch);
                  forceRefetch = false;
                  let decoded1 = await audioCtx.decodeAudioData(buffer1.slice(0));
                  let rawDuration = decoded1.duration;
                  
                  // DÙNG HÀM TĂNG TỐC lần 1
                  let stretched1 = await timeStretchBuffer(decoded1, 1.55 / 1.4);

                  // Bước 2: Tính tốc độ cần thiết
                  let neededSpeed = (rawDuration * 1.4) / targetDuration;
                  let finalBuffer: ArrayBuffer;

                  // Bước 3: Phân nhánh
                  if (neededSpeed <= 1.55) {
                      // Nhánh A
                      finalBuffer = stretched1;
                      addLog(\`  ✅ Câu \${i + 1} (Nhánh A): Cần \${neededSpeed.toFixed(2)}x <= 1.55x. Dùng bản 1.4x->1.55x.\`, 'success');
                  } else if (neededSpeed <= 1.8) {
                      // Nhánh B
                      let renderSpeed2 = neededSpeed - 0.15;
                      let buffer2 = await runTTS(cleanText, renderSpeed2, i, exportIdRef, false);
                      let decoded2 = await audioCtx.decodeAudioData(buffer2.slice(0));
                      finalBuffer = await timeStretchBuffer(decoded2, neededSpeed / renderSpeed2);
                      addLog(\`  ✅ Câu \${i + 1} (Nhánh B): Cần \${neededSpeed.toFixed(2)}x. Render lại \${renderSpeed2.toFixed(2)}x -> ép \${neededSpeed.toFixed(2)}x.\`, 'success');
                  } else {
                      // Nhánh C
                      let gap = 2.0;
                      if (i < totalSubs - 1) {
                          gap = processedSubs[i+1].start - (sub.start + targetDuration);
                          if (gap < 0) gap = 0;
                      }
                      
                      let actualDurationAt1_8 = (rawDuration * 1.4) / 1.8;
                      let overflow = actualDurationAt1_8 - targetDuration;

                      if (overflow <= gap) {
                          // Nhánh C1
                          let bufferC1 = await runTTS(cleanText, 1.65, i, exportIdRef, false);
                          let decodedC1 = await audioCtx.decodeAudioData(bufferC1.slice(0));
                          finalBuffer = await timeStretchBuffer(decodedC1, 1.8 / 1.65);
                          addLog(\`  ✅ Câu \${i + 1} (Nhánh C1): Vượt 1.8x, đủ gap chứa. Render 1.65x -> ép 1.8x.\`, 'success');
                      } else {
                          // Nhánh C2
                          let neededSpeedWithGap = (rawDuration * 1.4) / (targetDuration + gap);
                          if (neededSpeedWithGap <= 2.0) {
                              // Nhánh C2a
                              let renderSpeedC2a = neededSpeedWithGap - 0.15;
                              let bufferC2a = await runTTS(cleanText, renderSpeedC2a, i, exportIdRef, false);
                              let decodedC2a = await audioCtx.decodeAudioData(bufferC2a.slice(0));
                              finalBuffer = await timeStretchBuffer(decodedC2a, neededSpeedWithGap / renderSpeedC2a);
                              addLog(\`  ✅ Câu \${i + 1} (Nhánh C2a): Mượn gap, cần \${neededSpeedWithGap.toFixed(2)}x. Render \${renderSpeedC2a.toFixed(2)}x -> ép \${neededSpeedWithGap.toFixed(2)}x.\`, 'success');
                          } else {
                              // Nhánh C2b
                              let bufferC2b = await runTTS(cleanText, 1.85, i, exportIdRef, false);
                              let decodedC2b = await audioCtx.decodeAudioData(bufferC2b.slice(0));
                              finalBuffer = await timeStretchBuffer(decodedC2b, 2.0 / 1.85);
                              addLog(\`  ⚠️ Câu \${i + 1} (Nhánh C2b): Chạm trần 2.0x! Cần \${neededSpeedWithGap.toFixed(2)}x, ép cứng 2.0x.\`, 'warning');
                              
                              reportListRef.current.push({
                                  index: i + 1,
                                  overflow: ((rawDuration * 1.4) / 2.0) - (targetDuration + gap),
                                  gap: gap,
                                  text: cleanText
                              });
                          }
                      }
                  }

                  audioClips[i] = { buffer: finalBuffer, startTime: sub.start };
                  sentenceSuccess = true;
                  updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);

              } else {
                  // ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----
${content.substring(startIndex + startMarker.length, endIndex)}                  updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
              }
            } catch (err: any) {`;

fs.writeFileSync(path, before + newLogic + after);
console.log('Success');
