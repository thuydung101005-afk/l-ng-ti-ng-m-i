const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldC2b = `                          } else {
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

              } else {`;

const newC2b = `                          } else {
                              // MỚI: vượt 2.0x -> đẩy vào AI rewrite queue thay vì ép cứng
                              const hasGeminiKey = geminiApiKeysStr.trim().length > 0;
                              if (hasGeminiKey) {
                                  rewriteQueue.push({
                                      index: i,
                                      cleanText,
                                      actualDuration: rawDuration * (1.4 / NORMAL_SPEED),
                                      targetDuration: targetDuration + gap,
                                      originalBuffer: null as any
                                  });
                                  addLog(\`  🔮 Câu \${i + 1} vượt 2.0x (cần \${neededSpeedWithGap.toFixed(2)}x). Đưa vào hàng đợi AI rút gọn dù đã tắt AI Rewrite.\`, 'warning');
                                  sentenceSuccess = true;
                                  updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                                  continue; // Skip setting audioClips[i]
                              } else {
                                  // Không có key -> fallback ép 2.0x như cũ
                                  let bufferFallback = await runTTS(cleanText, 1.85, i, exportIdRef, false);
                                  let decodedFallback = await audioCtx.decodeAudioData(bufferFallback.slice(0));
                                  finalBuffer = await timeStretchBuffer(decodedFallback, 2.0 / 1.85);
                                  addLog(\`  ⚠️ Câu \${i + 1} vượt 2.0x nhưng không có key AI. Ép cứng 2.0x.\`, 'warning');
                                  reportListRef.current.push({ index: i+1, overflow: ((rawDuration*1.4)/2.0)-(targetDuration+gap), gap, text: cleanText });
                              }
                          }
                      }
                  }

                  audioClips[i] = { buffer: finalBuffer, startTime: sub.start };
                  sentenceSuccess = true;
                  updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);

              } else {`;

if (content.includes(oldC2b)) {
    content = content.replace(oldC2b, newC2b);
    fs.writeFileSync(path, content);
    console.log("Success");
} else {
    console.log("Old C2b not found");
}
