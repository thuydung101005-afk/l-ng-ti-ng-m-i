import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleApproveRef
old_handle_approve = """
        if (action === 'mergeWithNext' && index < processedSubs.length - 1) {
            const nextSub = processedSubs[index + 1];
            const originalText = processedSubs[index].text.trim().replace(/^-/, '').trim();
            const nextOriginalText = nextSub.text.trim().replace(/^-/, '').trim();
            
            const combinedText = newText + " " + nextOriginalText;
            processedSubs[index].text = combinedText;
            processedSubs[index].end = nextSub.end;
            nextSub.text = ""; // clear next sub so it is skipped
            processedIndices.add(index);
            processedIndices.add(index + 1); // Mark as processed
            
            // Remove index + 1 from review queue if it's there
            setReviewQueueItems(prev => prev.filter(item => item.index !== index && item.index !== index + 1));
            
            // Also remove index + 1 from render queue
            renderQueueRef.current = renderQueueRef.current.filter(i => i !== index + 1);
            
            addLog(`  ✅ Đã GỘP câu ${index + 1} và ${index + 2}: "${combinedText}". Đang đưa vào hàng đợi render lại...`, 'success');
        } else {
"""

new_handle_approve = """
        if (action === 'mergeWithNext' && index < processedSubs.length - 1) {
            let nextIndex = index + 1;
            while (nextIndex < processedSubs.length && !processedSubs[nextIndex].text.trim()) nextIndex++;
            
            if (nextIndex < processedSubs.length) {
                const nextSub = processedSubs[nextIndex];
                const combinedText = newText + " " + nextSub.text.trim().replace(/^-/, '').trim();
                processedSubs[index].text = combinedText;
                processedSubs[index].end = nextSub.end;
                
                nextSub.text = ""; 
                nextSub.start = 0;
                nextSub.end = 0;
                audioClips[nextIndex] = null;
                processedIndices.add(index);
                
                setReviewQueueItems(prev => prev.filter(item => item.index !== index && item.index !== nextIndex));
                renderQueueRef.current = renderQueueRef.current.filter(i => i !== nextIndex);
                
                addLog(`  ✅ Đã GỘP câu ${index + 1} và ${nextIndex + 1}. Đang đưa vào hàng đợi render lại...`, 'success');
            }
        } else {
"""
content = content.replace(old_handle_approve.strip(), new_handle_approve.strip())

# 2. Update punctuation stripping and safeRunOmnivoiceRaw
old_process_text = """
            const sub = processedSubs[i];
            let cleanText = sub.text.trim().replace(/^-/, '').trim();
            const originalClean = cleanText;
            if (approvedRewrites[cleanText]) cleanText = approvedRewrites[cleanText];
            
            let targetDuration = sub.end - sub.start;
"""

new_process_text = """
            const sub = processedSubs[i];
            let cleanText = sub.text.trim().replace(/^-/, '').trim();
            const originalClean = cleanText;
            if (approvedRewrites[cleanText]) cleanText = approvedRewrites[cleanText];
            
            const lastChar = cleanText.slice(-1);
            const isPunct = [',', '.', '!', '?', ';', ':'].includes(lastChar);
            let ttsCleanText = cleanText.replace(/[,.;:!\?]/g, ' ');
            if (isPunct) ttsCleanText = ttsCleanText.trim() + lastChar;
            
            let targetDuration = sub.end - sub.start;
"""
content = content.replace(old_process_text.strip(), new_process_text.strip())

content = content.replace("await safeRunOmnivoiceRaw(cleanText, 1.0, activeVoiceId)", "await safeRunOmnivoiceRaw(ttsCleanText, 1.0, activeVoiceId)")


# 3. Update AI Review Queue logic
old_ai_logic = """
                // NẾU TỐC ĐỘ BỊ LỐ -> KHÔNG DỪNG! ĐẨY VÀO AI REVIEW QUEUE
                if (neededSpeed > maxAutoFitSpeed && aiRewrite && hasGeminiKey && !processedIndices.has(i) && !approvedRewrites[originalClean]) {
                    addLog(`  ⚠️ Câu ${i + 1} lố tốc độ (${neededSpeed.toFixed(2)}x > ${maxAutoFitSpeed}x). Đẩy xuống khu vực duyệt!`, 'warning');
                    
                    activeGeminiTasks++; // BÁO HIỆU CÓ TÁC VỤ CHẠY NGẦM
                    
                    // Gửi ngầm cho AI (không await chặn luồng)
                    (async () => {
                        try {
                            let previousText = i > 0 ? processedSubs[i-1].text.trim().replace(/^-/, '').trim() : "";
                            let nextText = i < totalSubs - 1 ? processedSubs[i+1].text.trim().replace(/^-/, '').trim() : "";
                            const targetChars = Math.max(10, Math.floor(cleanText.length * (maxAutoFitSpeed / neededSpeed) * 0.9));
                            
                            const res = await fetch('/api/gemini/rewrite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    text: cleanText,
                                    targetChars: targetChars,
                                    previousText: previousText,
                                    nextText: nextText,
                                    clientGeminiKeysStr: geminiApiKeysStr,
                                    attempt: 1
                                })
                            });
                            
                            let shortened = cleanText;
                            if (res.ok) {
                                const data = await res.json();
                                if (data.result) shortened = data.result;
                            }
                            
                            if (requireReview) {
                                // Đẩy kết quả xuống Bảng Duyệt
                                setReviewQueueItems(prev => [...prev, {
                                    index: i,
                                    original: cleanText,
                                    shortened: shortened,
                                    neededSpeed: neededSpeed
                                }]);
                            } else {
                                // AUTO-PILOT: Tự động duyệt và đưa vào hàng chờ render
                                approvedRewrites[cleanText] = shortened;
                                setApprovedRewrites({...approvedRewrites});
                                processedSubs[i].text = shortened;
                                processedIndices.add(i);
                                renderQueueRef.current.push(i);
                                addLog(`  🤖 Tự động duyệt câu ${i + 1} (Auto-Pilot). Đang đưa vào hàng đợi render lại...`, 'success');
                                processNext();
                            }
                            
                        } catch (e) {
                            addLog(`  ❌ Lỗi khi nhờ AI rút gọn câu ${i+1}.`, 'error');
                            if (requireReview) {
                                setReviewQueueItems(prev => [...prev, {
                                    index: i,
                                    original: cleanText,
                                    shortened: cleanText,
                                    neededSpeed: neededSpeed
                                }]);
                            } else {
                                // AUTO-PILOT fallback
                                approvedRewrites[cleanText] = cleanText;
                                setApprovedRewrites({...approvedRewrites});
                                processedIndices.add(i);
                                renderQueueRef.current.push(i);
                                processNext();
                            }
                        } finally {
                            activeGeminiTasks--; // GIẢM ĐẾM KHI HOÀN THÀNH
                            checkCompletion(); // KIỂM TRA LẠI XEM CÓ THỂ KẾT THÚC CHƯA
                        }
                    })();
                    
                    // GPU LẬP TỨC CHẠY TIẾP CÂU KHÁC (Skip rendering audioClips)
                    continue; 
                }
"""

new_ai_logic = """
                // NẾU TỐC ĐỘ BỊ LỐ -> KHÔNG DỪNG! ĐẨY VÀO AI REVIEW QUEUE
                if (neededSpeed > maxAutoFitSpeed && aiRewrite && hasGeminiKey && !processedIndices.has(i) && !approvedRewrites[originalClean]) {
                    
                    let nextValidIdx = i + 1;
                    while (nextValidIdx < totalSubs && !processedSubs[nextValidIdx].text.trim()) nextValidIdx++;
                    
                    const endsWithComma = cleanText.trim().endsWith(',');
                    const nextSubStart = nextValidIdx < totalSubs ? processedSubs[nextValidIdx].start : Infinity;
                    
                    if (endsWithComma && Math.abs(nextSubStart - sub.end) < 0.2) {
                         const nextSub = processedSubs[nextValidIdx];
                         addLog(`  🔄 Auto-Merge: Câu ${i+1} lố tốc độ & có dấu phẩy, tự động gộp với câu ${nextValidIdx+1}!`, 'success');
                         
                         sub.text = sub.text.trim() + " " + nextSub.text.trim();
                         sub.end = nextSub.end;
                         nextSub.text = "";
                         nextSub.start = 0;
                         nextSub.end = 0;
                         audioClips[nextValidIdx] = null;
                         
                         renderQueueRef.current.unshift(i);
                         continue;
                    }
                    
                    if (requireReview) {
                        let prevText = "";
                        let nextText = "";
                        let prevIdx = i - 1;
                        while (prevIdx >= 0 && !processedSubs[prevIdx].text.trim()) prevIdx--;
                        if (prevIdx >= 0) prevText = processedSubs[prevIdx].text.trim();
                        if (nextValidIdx < totalSubs) nextText = processedSubs[nextValidIdx].text.trim();

                        setReviewQueueItems(prev => [...prev, {
                            index: i,
                            original: cleanText,
                            shortened: cleanText,
                            neededSpeed: neededSpeed,
                            prevText: prevText,
                            nextText: nextText
                        }]);
                        addLog(`  ⚠️ Câu ${i + 1} lố tốc độ (${neededSpeed.toFixed(2)}x). Đẩy xuống khu vực duyệt!`, 'warning');
                        checkCompletion();
                        continue;
                    }
                }
"""

content = content.replace(old_ai_logic.strip(), new_ai_logic.strip())

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
