import re

with open('src/hooks/useDubbingEngine.ts.bak', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add reviewResolverRef
content = content.replace(
    "const [aivoicesList, setAivoicesList] = useState<{ voice_id: string; name: string; gender: string; region: string }[]>([]);",
    "const [aivoicesList, setAivoicesList] = useState<{ voice_id: string; name: string; gender: string; region: string }[]>([]);\n  const reviewResolverRef = useRef<((editedItems: any[]) => void) | null>(null);"
)

# 2. Modify saveRewrites
old_save_rewrites = """  const saveRewrites = () => {
    const newRewrites = { ...approvedRewrites };
    reviewItems?.forEach(item => {
      if (item.shortened && item.shortened.trim() !== '') {
        newRewrites[item.original] = item.shortened.trim();
      }
    });
    setApprovedRewrites(newRewrites);
    setReviewItems(null);
    addLog('Đã lưu các câu rút gọn!', 'success');
  };"""

new_save_rewrites = """  const saveRewrites = () => {
    const newRewrites = { ...approvedRewrites };
    reviewItems?.forEach(item => {
      if (item.shortened && item.shortened.trim() !== '') {
        newRewrites[item.original] = item.shortened.trim();
      }
    });
    setApprovedRewrites(newRewrites);
    setReviewItems(null);
    addLog('Đã lưu các câu rút gọn!', 'success');
    if (reviewResolverRef.current) {
        reviewResolverRef.current(reviewItems || []);
        reviewResolverRef.current = null;
    }
  };"""
content = content.replace(old_save_rewrites, new_save_rewrites)

# 3. Remove handleAnalyzeScript completely
# From "const handleAnalyzeScript =" to "const saveRewrites ="
start_idx = content.find("const handleAnalyzeScript = async () => {")
end_idx = content.find("const saveRewrites = () => {")
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# 4. Remove handleAnalyzeScript from exported object
content = content.replace("handleAnalyzeScript,", "")

# 5. Restructure the AI Rewrite logic in API Mode (processRewriteQueue)
old_process_rewrite = """      const processRewriteQueue = async () => {
        let completedInitial = immediateIndices.length + deferredIndices.length;
        let completedRewrite = 0;
        
        while (rewriteQueue.length > 0) {
          const chunk = rewriteQueue.splice(0, concurrencyLimit * 2);
          
          const fetchPromises = chunk.map(async (item) => {
              if (item.rewriteSuccess) return;
              try {
                  item.rewriteAttempts = (item.rewriteAttempts || 0) + 1;
                  
                  let previousText = "";
                  if (item.index > 0) {
                      const isPrevInChunk = chunk.some(x => x.index === item.index - 1);
                      if (!isPrevInChunk) {
                          let prevSubText = processedSubs[item.index-1].text.trim();
                          if (prevSubText.startsWith('-')) prevSubText = prevSubText.substring(1).trim();
                          previousText = prevSubText;
                      }
                  }
                  let nextText = "";
                  if (item.index < totalSubs - 1) {
                      const isNextInChunk = chunk.some(x => x.index === item.index + 1);
                      if (!isNextInChunk) {
                          let nextSubText = processedSubs[item.index+1].text.trim();
                          if (nextSubText.startsWith('-')) nextSubText = nextSubText.substring(1).trim();
                          nextText = nextSubText;
                      }
                  }

                  if (!item.currentTextToRewrite) item.currentTextToRewrite = item.cleanText;

                  const res = await fetch('/api/gemini/rewrite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                          prompt: `Bối cảnh câu trước: "${previousText}"\\nCâu sau: "${nextText}"\\nBản gốc cần rút gọn: "${item.currentTextToRewrite}"\\nHãy rút gọn lại thật ngắn gọn (khoảng ${item.finalTargetChars} ký tự) nhưng giữ nguyên ý chính. Chỉ trả về kết quả, không giải thích.` 
                      })
                  });
                  if (res.ok) {
                      const data = await res.json();
                      if (data.shortened) {
                         item.bestRewrite = data.shortened;
                         item.rewriteSuccess = true;
                         addLog(`  ✨ Đã rút gọn xong [${item.index + 1}]: "${item.bestRewrite}". Đang xử lý bản rút gọn...`, 'success');
                      }
                  }
              } catch (e) {
                 // ignore
              }
          });
          
          await Promise.all(fetchPromises);"""

new_process_rewrite = """      const processRewriteQueue = async () => {
        let completedInitial = immediateIndices.length + deferredIndices.length;
        let completedRewrite = 0;
        
        // 1. Fetch AI results
        const allItems = [...rewriteQueue];
        const aiResults: any[] = [];
        
        while (rewriteQueue.length > 0) {
          const chunk = rewriteQueue.splice(0, concurrencyLimit * 2);
          const fetchPromises = chunk.map(async (item) => {
              if (item.rewriteSuccess) return;
              try {
                  item.rewriteAttempts = (item.rewriteAttempts || 0) + 1;
                  let previousText = "";
                  if (item.index > 0) previousText = processedSubs[item.index-1].text.trim().replace(/^-/, '').trim();
                  let nextText = "";
                  if (item.index < totalSubs - 1) nextText = processedSubs[item.index+1].text.trim().replace(/^-/, '').trim();
                  if (!item.currentTextToRewrite) item.currentTextToRewrite = item.cleanText;
                  const res = await fetch('/api/gemini/rewrite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                          prompt: `Bối cảnh câu trước: "${previousText}"\\nCâu sau: "${nextText}"\\nBản gốc cần rút gọn: "${item.currentTextToRewrite}"\\nHãy rút gọn lại thật ngắn gọn (khoảng ${item.finalTargetChars} ký tự) nhưng giữ nguyên ý chính. Chỉ trả về kết quả, không giải thích.` 
                      })
                  });
                  if (res.ok) {
                      const data = await res.json();
                      if (data.shortened) {
                         item.bestRewrite = data.shortened;
                         item.rewriteSuccess = true;
                         aiResults.push({
                           original: item.currentTextToRewrite,
                           shortened: item.bestRewrite,
                           estimatedSpeed: item.targetSpeedForRewrite
                         });
                         addLog(`  ✨ Đã lấy kết quả AI rút gọn [${item.index + 1}]`, 'success');
                      }
                  }
              } catch (e) { }
          });
          await Promise.all(fetchPromises);
        }

        // 2. Pause and Review if needed
        if (aiResults.length > 0) {
            addLog(`Đang đợi người dùng duyệt ${aiResults.length} câu rút gọn...`, 'warning');
            setReviewItems(aiResults);
            
            // Wait for user to click Save
            const editedItems: any[] = await new Promise(resolve => reviewResolverRef.current = resolve);
            
            // Apply edited results back to allItems
            editedItems.forEach(edited => {
                const matchedItem = allItems.find(i => i.currentTextToRewrite === edited.original);
                if (matchedItem) {
                    matchedItem.bestRewrite = edited.shortened;
                    matchedItem.rewriteSuccess = true;
                }
            });
        }
        
        // Restore chunking logic for TTS rendering of approved rewrites
        rewriteQueue.push(...allItems);
        while (rewriteQueue.length > 0) {
          const chunk = rewriteQueue.splice(0, concurrencyLimit * 2);"""
          
content = content.replace(old_process_rewrite, new_process_rewrite)

# 6. We also need to fix Local Mode (OmniVoice) to have Parallel execution.
# Let's see the OmniVoice loop.
omnivoice_start = content.find("if (activeProvider === 'omnivoice') {")
# Instead of doing AST parsing here, we can replace the OmniVoice logic entirely since it's just a loop.
omnivoice_old_logic_regex = r"if \(activeProvider === 'omnivoice'\) \{.*?\/\/ ===== HẾT LUỒNG RIÊNG OMNIVOICE ====="
omnivoice_new_logic = """if (activeProvider === 'omnivoice') {
    addLog(`Đang chuẩn bị lồng tiếng Local (OmniVoice GPU) với ${totalSubs} câu...`, 'info');
    
    // Triage
    const immediateIndices: number[] = [];
    const rewriteIndices: number[] = [];
    const aiResults: any[] = [];
    
    for (let i = 0; i < totalSubs; i++) {
        const sub = processedSubs[i];
        let cleanText = sub.text.trim().replace(/^-/, '').trim();
        if (approvedRewrites[cleanText]) {
            immediateIndices.push(i);
            continue;
        }
        
        let targetDuration = sub.end - sub.start;
        if (i < totalSubs - 1) {
            const nextSub = processedSubs[i + 1];
            if (sub.start + targetDuration > nextSub.start) targetDuration = nextSub.start - sub.start;
        }
        if (targetDuration <= 0) targetDuration = 0.1;
        
        const wordCount = cleanText.split(/\\s+/).filter(w => w.length > 0).length;
        const estDur = 0.5 + 0.25 * wordCount;
        const neededSpeed = estDur / targetDuration;
        
        if (aiRewrite && hasGeminiKey && neededSpeed > maxAutoFitSpeed && wordCount > 3) {
            rewriteIndices.push(i);
            const targetChars = Math.max(10, Math.floor(cleanText.length * (targetDuration / (estDur / maxAutoFitSpeed)) * 0.9));
            aiResults.push({ original: cleanText, shortened: "", estimatedSpeed: neededSpeed, targetChars });
        } else {
            immediateIndices.push(i);
        }
    }

    addLog(`[Local] Phân loại: ${immediateIndices.length} câu ưu tiên render liền, ${rewriteIndices.length} câu cần AI rút gọn.`, 'info');
    let completedCount = 0;
    
    const renderSentence = async (i: number, forceText?: string, forceSpeed?: number) => {
        const sub = processedSubs[i];
        let cleanText = forceText || sub.text.trim().replace(/^-/, '').trim();
        if (approvedRewrites[cleanText]) cleanText = approvedRewrites[cleanText];
        
        let targetDuration = sub.end - sub.start;
        let gap = 0;
        if (i < totalSubs - 1) {
            const nextSub = processedSubs[i + 1];
            gap = Math.max(0, nextSub.start - sub.end);
            if (sub.start + targetDuration > nextSub.start) {
                targetDuration = nextSub.start - sub.start;
                gap = 0;
            }
        }
        
        let rawBuffer = await safeRunOmnivoiceRaw(cleanText, 1.0, activeVoiceId);
        let decoded1x = await audioCtx.decodeAudioData(rawBuffer.slice(0));
        let actualDuration1x = decoded1x.duration;
        let neededSpeed = forceSpeed || (actualDuration1x / (targetDuration + gap));
        
        let finalBuffer = null;
        if (neededSpeed <= 1.05 && autoFit) {
            finalBuffer = await timeStretchBufferRubberband(decoded1x, 1.0);
        } else if (!autoFit) {
            finalBuffer = await timeStretchBufferRubberband(decoded1x, fixedSpeed);
        } else {
            if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
            finalBuffer = await timeStretchBufferRubberband(decoded1x, neededSpeed);
        }
        
        audioClips[i] = { buffer: finalBuffer, startTime: sub.start };
        completedCount++;
        setProgress(Math.round((completedCount / totalSubs) * 90));
    };

    // Thread 1: Render immediate sentences immediately
    const gpuPromise = (async () => {
        for (const i of immediateIndices) {
            await renderSentence(i);
        }
    })();

    // Thread 2: Fetch AI -> Review -> Render
    const aiPromise = (async () => {
        if (rewriteIndices.length > 0) {
            addLog(`Đang gửi ${rewriteIndices.length} câu cho Gemini rút gọn ngầm...`, 'warning');
            
            await Promise.all(aiResults.map(async (item, idx) => {
                const i = rewriteIndices[idx];
                let previousText = i > 0 ? processedSubs[i-1].text.trim().replace(/^-/, '').trim() : "";
                let nextText = i < totalSubs - 1 ? processedSubs[i+1].text.trim().replace(/^-/, '').trim() : "";
                try {
                    const res = await fetch('/api/gemini/rewrite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: `Bối cảnh câu trước: "${previousText}"\\nCâu sau: "${nextText}"\\nBản gốc: "${item.original}"\\n\\nHãy rút gọn lại thật ngắn gọn (khoảng ${item.targetChars} ký tự) nhưng giữ nguyên ý chính. Chỉ trả về nội dung rút gọn.` })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.shortened) item.shortened = data.shortened;
                    }
                } catch (e) {}
            }));
            
            setReviewItems(aiResults);
            addLog(`Bảng Kiểm Duyệt đã sẵn sàng! Đợi người dùng phản hồi...`, 'warning');
            
            const editedItems: any[] = await new Promise(resolve => reviewResolverRef.current = resolve);
            
            // User saved! Now queue the rewritten sentences!
            for (const edited of editedItems) {
                const idx = rewriteIndices[aiResults.findIndex(r => r.original === edited.original)];
                if (idx !== undefined) {
                    await renderSentence(idx, edited.shortened);
                }
            }
        }
    })();

    await Promise.all([gpuPromise, aiPromise]);
    
    const validAudioClips = audioClips.filter(clip => clip !== null) as { buffer: ArrayBuffer; startTime: number }[];
    addLog('✨ Đang ghép các track vào file tổng hợp...', 'warning');
    const finalBlob = await mergeAudioClips(validAudioClips);
    setResultUrl(URL.createObjectURL(finalBlob));
    setProgress(100);
    const updatedSrtText = generateSrt(processedSubs);
    setResultSrtUrl(URL.createObjectURL(new Blob([updatedSrtText], { type: 'text/plain' })));
    addLog('🎉 Hoàn thành!', 'success');
    setIsProcessing(false);
    return;
  }
  // ===== HẾT LUỒNG RIÊNG OMNIVOICE ====="""

content = re.sub(omnivoice_old_logic_regex, omnivoice_new_logic.replace('\\', '\\\\'), content, flags=re.DOTALL)


with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Engine refactored successfully.")
