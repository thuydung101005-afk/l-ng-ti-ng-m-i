import re

with open('src/hooks/useDubbingEngine.ts', 'r', encoding='utf-8') as f:
    engine_content = f.read()

# 1. Add processedIndices Set
old_init = """    let isFinished = false;
    let activeGeminiTasks = 0; // ĐẾM SỐ TÁC VỤ AI ĐANG CHẠY NGẦM

    // Trình xử lý duyệt từ UI"""

new_init = """    let isFinished = false;
    let activeGeminiTasks = 0; // ĐẾM SỐ TÁC VỤ AI ĐANG CHẠY NGẦM
    const processedIndices = new Set<number>(); // Track indices that have been AI processed

    // Trình xử lý duyệt từ UI"""
engine_content = engine_content.replace(old_init, new_init)

# 2. Add to processedIndices in handleApprove
old_approve = """        // Cập nhật trực tiếp vào kịch bản để xuất file SRT chuẩn xác
        processedSubs[index].text = newText;"""

new_approve = """        // Cập nhật trực tiếp vào kịch bản để xuất file SRT chuẩn xác
        processedSubs[index].text = newText;
        processedIndices.add(index);"""
engine_content = engine_content.replace(old_approve, new_approve)

# 3. Update the condition to use processedIndices instead of approvedRewrites
old_cond = """                // NẾU TỐC ĐỘ BỊ LỐ -> KHÔNG DỪNG! ĐẨY VÀO AI REVIEW QUEUE
                if (neededSpeed > maxAutoFitSpeed && aiRewrite && hasGeminiKey && !approvedRewrites[originalClean]) {"""

new_cond = """                // NẾU TỐC ĐỘ BỊ LỐ -> KHÔNG DỪNG! ĐẨY VÀO AI REVIEW QUEUE
                if (neededSpeed > maxAutoFitSpeed && aiRewrite && hasGeminiKey && !processedIndices.has(i) && !approvedRewrites[originalClean]) {"""
engine_content = engine_content.replace(old_cond, new_cond)

# 4. Add to processedIndices in auto-pilot
old_autopilot = """                                // AUTO-PILOT: Tự động duyệt và đưa vào hàng chờ render
                                approvedRewrites[cleanText] = shortened;
                                setApprovedRewrites({...approvedRewrites});
                                processedSubs[i].text = shortened;
                                renderQueueRef.current.push(i);"""

new_autopilot = """                                // AUTO-PILOT: Tự động duyệt và đưa vào hàng chờ render
                                approvedRewrites[cleanText] = shortened;
                                setApprovedRewrites({...approvedRewrites});
                                processedSubs[i].text = shortened;
                                processedIndices.add(i);
                                renderQueueRef.current.push(i);"""
engine_content = engine_content.replace(old_autopilot, new_autopilot)

# 5. Add to processedIndices in fallback
old_fallback = """                                // AUTO-PILOT fallback
                                approvedRewrites[cleanText] = cleanText;
                                setApprovedRewrites({...approvedRewrites});
                                renderQueueRef.current.push(i);"""

new_fallback = """                                // AUTO-PILOT fallback
                                approvedRewrites[cleanText] = cleanText;
                                setApprovedRewrites({...approvedRewrites});
                                processedIndices.add(i);
                                renderQueueRef.current.push(i);"""
engine_content = engine_content.replace(old_fallback, new_fallback)

with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("Infinite review loop fixed successfully!")
