const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('timeStretchBufferPitchPreserving')) {
    code = code.replace(
        "import { generateSrt } from './lib/srt';",
        "import { generateSrt } from './lib/srt';\nimport { timeStretchBufferPitchPreserving } from './lib/audio';"
    );
}

const blockStart = "// ===== LUỒNG RIÊNG CHO OMNIVOICE =====";
const blockEnd = "// ===== HẾT LUỒNG RIÊNG OMNIVOICE =====";

let bStartIdx = code.indexOf(blockStart);
let bEndIdx = code.indexOf(blockEnd, bStartIdx) + blockEnd.length;

const newBlock = `// ===== LUỒNG RIÊNG CHO OMNIVOICE =====
if (activeProvider === 'omnivoice') {
  addLog('🎯 Dùng OmniVoice: luồng xử lý 2-pass (Autofit & AI Rewrite).', 'info');
  const totalSubs = processedSubs.length;
  const audioClips: ({ buffer: ArrayBuffer; startTime: number } | null)[] = new Array(totalSubs).fill(null);
  const hasGeminiKey = geminiApiKeysStr.trim().length > 0;
  
  for (let i = 0; i < totalSubs; i++) {
    const sub = processedSubs[i];
    let cleanText = sub.text.trim();
    if (cleanText.startsWith('-')) cleanText = cleanText.substring(1).trim();
    if (!cleanText) continue;

    let targetDuration = sub.end - sub.start;
    if (i < totalSubs - 1) {
      const nextSub = processedSubs[i + 1];
      if (sub.start + targetDuration > nextSub.start) targetDuration = nextSub.start - sub.start;
    }
    if (targetDuration <= 0) targetDuration = 0.1;

    let finalText = cleanText;
    let finalBuffer: ArrayBuffer | null = null;
    let success = false;
    let attempts = 0;
    
    addLog(\`[\\${i + 1}/\\${totalSubs}] Đang xử lý: "\\${cleanText.length > 40 ? cleanText.substring(0, 40) + '...' : cleanText}"\`, 'info');

    while (!success && attempts < 3) {
      attempts++;
      try {
        addLog(\`  ⏳ (Pass 1) Sinh audio gốc tốc độ 1.0x (để tránh nuốt chữ)...\`, 'info');
        let rawBuffer = await runOmnivoiceRaw(finalText, 1.0, activeVoiceId);
        
        const localAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        let decoded = await localAudioCtx.decodeAudioData(rawBuffer.slice(0));
        let actualDuration1x = decoded.duration;
        let neededSpeed = actualDuration1x / targetDuration;
        
        if (!autoFit) {
           addLog(\`  ⚠️ AutoFit đang TẮT. Chốt bản 1.45x (có thể hụt hoặc tràn thời gian).\`, 'warning');
           finalBuffer = await timeStretchBufferPitchPreserving(decoded, 1.45);
        } else {
           if (neededSpeed <= 1.45) {
              addLog(\`  ✅ Câu thoại ngắn hơn khoảng trống. Giữ nguyên tốc độ 1.45x để đồng bộ (sẽ có dư khoảng lặng ở cuối).\`, 'success');
              finalBuffer = await timeStretchBufferPitchPreserving(decoded, 1.45);
           } else if (neededSpeed <= 1.8) {
              addLog(\`  ⏳ (Pass 2) Cần tốc độ \${neededSpeed.toFixed(2)}x (<= 1.8x). Đang tua nhanh bằng SoundTouchJS để khớp khít SRT (Giữ nguyên cao độ)...\`, 'warning');
              finalBuffer = await timeStretchBufferPitchPreserving(decoded, neededSpeed);
              addLog(\`  ✅ Đã tua nhanh xong với tốc độ \${neededSpeed.toFixed(2)}x.\`, 'success');
           } else {
              if (aiRewrite && hasGeminiKey) {
                 addLog(\`  🔮 Cần tốc độ \${neededSpeed.toFixed(2)}x (> 1.8x). Đang gọi AI rút gọn...\`, 'warning');
                 let targetChars = Math.max(10, Math.floor(finalText.length * (targetDuration / (actualDuration1x / 1.45)) * 0.9));
                 
                 let previousText = "";
                 if (i > 0) previousText = processedSubs[i-1].text.trim().replace(/^-/, '').trim();
                 let nextText = "";
                 if (i < totalSubs - 1) nextText = processedSubs[i+1].text.trim().replace(/^-/, '').trim();
                 
                 const res = await fetch('/api/gemini/rewrite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: finalText,
                      previousText,
                      nextText,
                      targetChars,
                      targetDuration,
                      targetSpeed: 1.45,
                      clientGeminiKeysStr: geminiApiKeysStr,
                    }),
                 });
                 
                 if (res.ok) {
                    const data = await res.json();
                    finalText = data.result || finalText;
                    addLog(\`  💡 Đã rút gọn: "\\${finalText}". Render lại bản rút gọn với 1.0x...\`, 'success');
                    let newRawBuffer = await runOmnivoiceRaw(finalText, 1.0, activeVoiceId);
                    let newDecoded = await localAudioCtx.decodeAudioData(newRawBuffer.slice(0));
                    finalBuffer = await timeStretchBufferPitchPreserving(newDecoded, 1.45);
                 } else {
                    addLog(\`  ❌ AI rút gọn lỗi. Ép ở mức tối đa 1.8x bằng SoundTouchJS.\`, 'error');
                    finalBuffer = await timeStretchBufferPitchPreserving(decoded, 1.8);
                 }
              } else {
                 addLog(\`  ⚠️ Cần tốc độ \${neededSpeed.toFixed(2)}x (> 1.8x) nhưng AI Rút gọn TẮT. Ép tối đa ở mức 1.8x bằng SoundTouchJS (sẽ bị tràn).\`, 'error');
                 finalBuffer = await timeStretchBufferPitchPreserving(decoded, 1.8);
              }
           }
        }
        
        audioClips[i] = { buffer: finalBuffer as ArrayBuffer, startTime: sub.start };
        success = true;
      } catch (err: any) {
        addLog(\`  ⚠️ Lỗi câu \${i + 1} (lần \${attempts}): \${err.message}\`, 'error');
        await sleep(1500);
      }
    }
    setProgress(Math.round(((i + 1) / totalSubs) * 90));
  }

  const validAudioClips = audioClips.filter(clip => clip !== null) as { buffer: ArrayBuffer; startTime: number }[];
  addLog('⚙️ Đang ghép các track vào file tổng hợp...', 'warning');
  const finalBlob = await mergeAudioClips(validAudioClips);
  const objectUrl = URL.createObjectURL(finalBlob);
  setResultUrl(objectUrl);
  setProgress(100);

  const updatedSrtText = generateSrt(processedSubs);
  const srtBlob = new Blob([updatedSrtText], { type: 'text/plain' });
  setResultSrtUrl(URL.createObjectURL(srtBlob));

  addLog('🎉 Hoàn thành!', 'success');
  setIsProcessing(false);
  setProcessingProvider(null);
  return;
}
// ===== HẾT LUỒNG RIÊNG OMNIVOICE =====`;

code = code.substring(0, bStartIdx) + newBlock + code.substring(bEndIdx);
fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx');
