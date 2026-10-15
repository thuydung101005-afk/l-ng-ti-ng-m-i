import re

with open('src/hooks/useDubbingEngine.ts', 'r', encoding='utf-8') as f:
    engine_content = f.read()

# 1. Add reviewQueueItems state and handleApprove function
engine_content = engine_content.replace(
    "const [reviewItems, setReviewItems] = useState<{ original: string; shortened: string; estimatedSpeed: number }[] | null>(null);",
    "const [reviewItems, setReviewItems] = useState<{ original: string; shortened: string; estimatedSpeed: number }[] | null>(null);\n  const [reviewQueueItems, setReviewQueueItems] = useState<any[]>([]);\n  const renderQueueRef = useRef<number[]>([]);\n  const handleApproveRef = useRef<((index: number, newText: string) => void) | null>(null);"
)

# Export them
engine_content = engine_content.replace(
    "requireReview, setRequireReview,",
    "requireReview, setRequireReview, reviewQueueItems, setReviewQueueItems, handleApprove: (index: number, newText: string) => { if (handleApproveRef.current) handleApproveRef.current(index, newText); },"
)

# Replace OmniVoice Block
omnivoice_old_logic_regex = r"// ===== LUỒNG RIÊNG CHO OMNIVOICE =====.*?// ===== HẾT LUỒNG RIÊNG OMNIVOICE ====="
omnivoice_new_logic = """// ===== LUỒNG RIÊNG CHO OMNIVOICE =====
if (activeProvider === 'omnivoice') {
    addLog(`Đang chuẩn bị lồng tiếng Local (OmniVoice GPU) với ${totalSubs} câu...`, 'info');
    
    // Khởi tạo hàng đợi
    renderQueueRef.current = Array.from({length: totalSubs}, (_, i) => i);
    setReviewQueueItems([]);
    let isWorking = false;
    let completedCount = 0;
    let isFinished = false;

    // Trình xử lý duyệt từ UI
    handleApproveRef.current = (index: number, newText: string) => {
        // Cập nhật text đã duyệt
        const originalText = processedSubs[index].text.trim().replace(/^-/, '').trim();
        approvedRewrites[originalText] = newText;
        setApprovedRewrites({...approvedRewrites});
        
        // Xóa khỏi bảng review
        setReviewQueueItems(prev => prev.filter(item => item.index !== index));
        
        // Đẩy lại vào hàng đợi render
        renderQueueRef.current.push(index);
        addLog(`  ✅ Đã nhận bản duyệt câu ${index + 1}: "${newText}". Đang đưa vào hàng đợi render lại...`, 'success');
        
        // Kích hoạt lại worker nếu đang nghỉ
        processNext();
    };

    const processNext = async () => {
        if (isWorking) return;
        if (renderQueueRef.current.length === 0) {
            checkCompletion();
            return;
        }
        
        isWorking = true;
        
        while (renderQueueRef.current.length > 0) {
            const i = renderQueueRef.current.shift()!;
            
            const sub = processedSubs[i];
            let cleanText = sub.text.trim().replace(/^-/, '').trim();
            const originalClean = cleanText;
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
            if (targetDuration <= 0) targetDuration = 0.1;
            
            addLog(`[${i+1}/${totalSubs}] Đang render...`, 'info');
            
            try {
                let rawBuffer = await safeRunOmnivoiceRaw(cleanText, 1.0, activeVoiceId);
                let decoded1x = await audioCtx.decodeAudioData(rawBuffer.slice(0));
                let actualDuration1x = decoded1x.duration;
                let neededSpeed = actualDuration1x / (targetDuration + gap);
                
                // NẾU TỐC ĐỘ BỊ LỐ -> KHÔNG DỪNG! ĐẨY VÀO AI REVIEW QUEUE
                if (neededSpeed > maxAutoFitSpeed && aiRewrite && hasGeminiKey && !approvedRewrites[originalClean]) {
                    addLog(`  ⚠️ Câu ${i + 1} lố tốc độ (${neededSpeed.toFixed(2)}x > ${maxAutoFitSpeed}x). Đẩy xuống khu vực duyệt!`, 'warning');
                    
                    // Gửi ngầm cho AI (không await chặn luồng)
                    (async () => {
                        try {
                            let previousText = i > 0 ? processedSubs[i-1].text.trim().replace(/^-/, '').trim() : "";
                            let nextText = i < totalSubs - 1 ? processedSubs[i+1].text.trim().replace(/^-/, '').trim() : "";
                            const targetChars = Math.max(10, Math.floor(cleanText.length * (maxAutoFitSpeed / neededSpeed) * 0.9));
                            
                            const res = await fetch('/api/gemini/rewrite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt: `Bối cảnh câu trước: "${previousText}"\\nCâu sau: "${nextText}"\\nBản gốc: "${cleanText}"\\n\\nHãy rút gọn lại thật ngắn gọn (khoảng ${targetChars} ký tự) nhưng giữ nguyên ý chính. Chỉ trả về nội dung rút gọn.` })
                            });
                            
                            let shortened = cleanText;
                            if (res.ok) {
                                const data = await res.json();
                                if (data.shortened) shortened = data.shortened;
                            }
                            
                            // Đẩy kết quả xuống Bảng Duyệt
                            setReviewQueueItems(prev => [...prev, {
                                index: i,
                                original: cleanText,
                                shortened: shortened,
                                neededSpeed: neededSpeed
                            }]);
                            
                        } catch (e) {
                            addLog(`  ❌ Lỗi khi nhờ AI rút gọn câu ${i+1}.`, 'error');
                            setReviewQueueItems(prev => [...prev, {
                                index: i,
                                original: cleanText,
                                shortened: cleanText,
                                neededSpeed: neededSpeed
                            }]);
                        }
                    })();
                    
                    // GPU LẬP TỨC CHẠY TIẾP CÂU KHÁC (Skip rendering audioClips)
                    continue; 
                }
                
                // NẾU AN TOÀN HOẶC ĐÃ ĐƯỢC DUYỆT -> ÉP VÀ LƯU
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
                
            } catch (e: any) {
                addLog(`  ❌ Lỗi render câu ${i+1}: ${e.message}`, 'error');
            }
        }
        
        isWorking = false;
        checkCompletion();
    };

    const checkCompletion = async () => {
        // Để hoàn thành: Hàng đợi rỗng + Không có việc gì đang làm + Bảng duyệt rỗng
        setReviewQueueItems(prev => {
            if (renderQueueRef.current.length === 0 && !isWorking) {
                if (prev.length === 0) {
                    if (!isFinished) {
                        isFinished = true;
                        finishDubbing();
                    }
                } else {
                    addLog(`⏳ Đang đợi người dùng duyệt ${prev.length} câu còn lại...`, 'info');
                }
            }
            return prev;
        });
    };

    const finishDubbing = async () => {
        const validAudioClips = audioClips.filter(clip => clip !== null) as { buffer: ArrayBuffer; startTime: number }[];
        addLog('✨ Đang ghép các track vào file tổng hợp...', 'warning');
        const finalBlob = await mergeAudioClips(validAudioClips);
        setResultUrl(URL.createObjectURL(finalBlob));
        setProgress(100);
        const updatedSrtText = generateSrt(processedSubs);
        setResultSrtUrl(URL.createObjectURL(new Blob([updatedSrtText], { type: 'text/plain' })));
        addLog('🎉 Hoàn thành!', 'success');
        setIsProcessing(false);
    };

    // Bắt đầu nhào vô chạy
    processNext();
    return;
}
// ===== HẾT LUỒNG RIÊNG OMNIVOICE ====="""

engine_content = re.sub(omnivoice_old_logic_regex, omnivoice_new_logic.replace('\\', '\\\\'), engine_content, flags=re.DOTALL)

with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(engine_content)

# 2. Update ConfigSidebar to export the new properties
with open('src/components/ConfigSidebar.tsx', 'r', encoding='utf-8') as f:
    sidebar_content = f.read()
sidebar_content = sidebar_content.replace(
    "requireReview, setRequireReview",
    "requireReview, setRequireReview, reviewQueueItems, setReviewQueueItems, handleApprove"
)
with open('src/components/ConfigSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(sidebar_content)
    
print("Patch ultimate pipeline successfully applied!")
