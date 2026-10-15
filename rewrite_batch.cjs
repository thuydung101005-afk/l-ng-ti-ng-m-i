const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /let rewriteIndex = 0;\n\s*const processRewriteQueue = async \(\): Promise<void> => \{([\s\S]*?)updateProgress\(completedInitial, \+\+completedRewrite, rewriteQueue\.length\);\n\s*\}\n\s*\};/m;

const replacement = `const processRewriteQueue = async (): Promise<void> => {
        let currentBatchQueue = [...rewriteQueue];
        let rewriteAttempts = 0;
        const maxAttempts = 3;
        
        while (currentBatchQueue.length > 0 && rewriteAttempts < maxAttempts) {
           rewriteAttempts++;
           const nextBatchQueue = [];
           
           // Group into chunks of 10
           const chunks = [];
           for(let i=0; i<currentBatchQueue.length; i+=10) {
              chunks.push(currentBatchQueue.slice(i, i+10));
           }
           
           for (const chunk of chunks) {
               addLog(\`  ⚠️ Hàng đợi AI - Lần \${rewriteAttempts}: Gửi nhóm \${chunk.length} câu để rút gọn...\`, 'warning');
               
               const itemsPayload = chunk.map(item => {
                  let previousText = "";
                  if (item.index > 0) {
                     let prevSubText = processedSubs[item.index-1].text.trim();
                     if (prevSubText.startsWith('-')) prevSubText = prevSubText.substring(1).trim();
                     previousText = prevSubText;
                  }
                  let nextText = "";
                  if (item.index < totalSubs - 1) {
                     let nextSubText = processedSubs[item.index+1].text.trim();
                     if (nextSubText.startsWith('-')) nextSubText = nextSubText.substring(1).trim();
                     nextText = nextSubText;
                  }
                  
                  if (!item.currentTextToRewrite) item.currentTextToRewrite = item.cleanText;
                  
                  let currentChars = item.currentTextToRewrite.length;
                  let targetSpeedForRewrite = Math.max(speed, 1.5);
                  let ratio = item.targetDuration / (item.actualDuration * (speed / targetSpeedForRewrite));
                  let targetChars = Math.floor(currentChars * ratio);
                  
                  if (!item.finalTargetChars) {
                     item.finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * 0.05));
                  }
                  item.targetSpeedForRewrite = targetSpeedForRewrite;
                  
                  return {
                      id: item.index,
                      text: item.currentTextToRewrite,
                      targetChars: item.finalTargetChars,
                      targetDuration: item.targetDuration,
                      targetSpeed: targetSpeedForRewrite,
                      previousText,
                      nextText
                  };
               });
               
               try {
                   const res = await fetch('/api/gemini/rewrite-batch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ items: itemsPayload, clientGeminiKeysStr: geminiApiKeysStr })
                   });
                   
                   if (res.ok) {
                      const data = await res.json();
                      const results = data.result;
                      
                      for (let k = 0; k < chunk.length; k++) {
                         const item = chunk[k];
                         const rewritten = results[k]?.result || item.currentTextToRewrite;
                         item.bestRewrite = rewritten;
                         
                         const charsPerSecond = item.cleanText.length / item.actualDuration;
                         const estimatedDuration = rewritten.length / charsPerSecond / item.targetSpeedForRewrite;
                         
                         if (estimatedDuration <= item.targetDuration + 0.1 || rewriteAttempts >= maxAttempts) {
                            item.exportIdRef = item.exportIdRef || { current: null };
                            let testBuffer = await runTTS(rewritten, item.targetSpeedForRewrite, item.index, item.exportIdRef);
                            const testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                            
                            item.newArrayBuffer = testBuffer;
                            item.rewriteSuccess = true;
                            addLog(\`  💡 Câu \${item.index + 1} rút gọn thành công: "\${rewritten}" (Tốc độ \${item.targetSpeedForRewrite}x)\`, 'success');
                         } else {
                            item.currentTextToRewrite = rewritten;
                            item.finalTargetChars = Math.floor(item.finalTargetChars * 0.85);
                            nextBatchQueue.push(item);
                         }
                      }
                   } else {
                      throw new Error("HTTP " + res.status);
                   }
               } catch (err) {
                  addLog(\`  ❌ Lỗi gọi AI rút gọn nhóm: \${err.message}. Sẽ thử lại...\`, 'error');
                  chunk.forEach(item => nextBatchQueue.push(item));
               }
           }
           
           currentBatchQueue = nextBatchQueue;
        }
        
        for (const item of rewriteQueue) {
           const sub = processedSubs[item.index];
           if (!item.rewriteSuccess) {
               addLog(\`  ⚠️ Câu \${item.index + 1} rút gọn thất bại hoặc tràn thời gian. Dùng time-stretch khẩn cấp.\`, 'warning');
               const decoded = await audioCtx.decodeAudioData(item.originalBuffer.slice(0));
               const emergencyRatio = item.actualDuration / item.targetDuration;
               item.newArrayBuffer = await timeStretchBuffer(decoded, emergencyRatio);
           }
           
           const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
           sub.text = prefix + (item.bestRewrite || item.cleanText);
           
           audioClips[item.index] = { buffer: item.newArrayBuffer as ArrayBuffer, startTime: sub.start };
           addLog(\`  ✅ Hoàn tất câu \${item.index + 1} (Từ hàng đợi AI)\`, 'success');
           updateProgress(completedInitial, ++completedRewrite, rewriteQueue.length);
        }
      };`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated processRewriteQueue.");
} else {
    console.log("Regex failed");
}
