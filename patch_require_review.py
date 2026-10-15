import re

# 1. Update useDubbingEngine.ts
with open('src/hooks/useDubbingEngine.ts', 'r', encoding='utf-8') as f:
    engine_content = f.read()

# Add state
engine_content = engine_content.replace(
    "const [aiRewrite, setAiRewrite] = useState(true);",
    "const [aiRewrite, setAiRewrite] = useState(true);\n  const [requireReview, setRequireReview] = useState(true);"
)

# Export state
engine_content = engine_content.replace(
    "aiRewrite, setAiRewrite,",
    "aiRewrite, setAiRewrite, requireReview, setRequireReview,"
)

# Modify OmniVoice AI Review Block
old_ai_promise = """            setReviewItems(aiResults);
            addLog(`Bảng Kiểm Duyệt đã sẵn sàng! Đợi người dùng phản hồi...`, 'warning');
            
            const editedItems: any[] = await new Promise(resolve => reviewResolverRef.current = resolve);
            
            // User saved! Now queue the rewritten sentences!
            for (const edited of editedItems) {
                const idx = rewriteIndices[aiResults.findIndex(r => r.original === edited.original)];
                if (idx !== undefined) {
                    await renderSentence(idx, edited.shortened);
                }
            }"""

new_ai_promise = """            let editedItems: any[] = [];
            if (requireReview) {
                setReviewItems(aiResults);
                addLog(`Bảng Kiểm Duyệt đã sẵn sàng! Đợi người dùng phản hồi...`, 'warning');
                editedItems = await new Promise(resolve => reviewResolverRef.current = resolve);
            } else {
                addLog(`Bỏ qua bước duyệt (Auto-Pilot). Đang render bản AI tự rút gọn...`, 'warning');
                editedItems = aiResults.map(item => ({ original: item.original, shortened: item.shortened || item.original }));
            }
            
            // User saved! Now queue the rewritten sentences!
            for (const edited of editedItems) {
                const idx = rewriteIndices[aiResults.findIndex(r => r.original === edited.original)];
                if (idx !== undefined) {
                    await renderSentence(idx, edited.shortened);
                }
            }"""
engine_content = engine_content.replace(old_ai_promise, new_ai_promise)


# Modify API Mode AI Review Block
old_api_promise = """        // 2. Pause and Review if needed
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
        }"""

new_api_promise = """        // 2. Pause and Review if needed
        if (aiResults.length > 0) {
            let editedItems: any[] = [];
            if (requireReview) {
                addLog(`Đang đợi người dùng duyệt ${aiResults.length} câu rút gọn...`, 'warning');
                setReviewItems(aiResults);
                editedItems = await new Promise(resolve => reviewResolverRef.current = resolve);
            } else {
                addLog(`Bỏ qua bước duyệt (Auto-Pilot). Đang sử dụng bản AI tự rút gọn...`, 'warning');
                editedItems = aiResults.map(item => ({ original: item.original, shortened: item.shortened || item.original }));
            }
            
            // Apply edited results back to allItems
            editedItems.forEach(edited => {
                const matchedItem = allItems.find(i => i.currentTextToRewrite === edited.original);
                if (matchedItem) {
                    matchedItem.bestRewrite = edited.shortened;
                    matchedItem.rewriteSuccess = true;
                }
            });
        }"""
engine_content = engine_content.replace(old_api_promise, new_api_promise)

with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(engine_content)


# 2. Update ConfigSidebar.tsx
with open('src/components/ConfigSidebar.tsx', 'r', encoding='utf-8') as f:
    sidebar_content = f.read()

sidebar_content = sidebar_content.replace(
    "aiRewrite, setAiRewrite,",
    "aiRewrite, setAiRewrite, requireReview, setRequireReview,"
)

old_checkbox = """                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-blue-900">AI Tự động rút gọn câu (Tốc độ &gt; {maxAutoFitSpeed}x)</span>
                            <span className="text-xs text-blue-700/80 mt-1">Tích hợp AI (Gemini/Grok/DeepSeek): Thay vì ép tốc độ đọc quá nhanh, AI sẽ nhận diện các câu quá dài và tự động viết lại ngắn gọn nhưng vẫn giữ nguyên ý nghĩa, đảm bảo thoại luôn mượt mà.</span>
                          </div>
                        </label>
                      </div>"""

new_checkbox = """                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-blue-900">AI Tự động rút gọn câu (Tốc độ &gt; {maxAutoFitSpeed}x)</span>
                            <span className="text-xs text-blue-700/80 mt-1">Tích hợp AI (Gemini/Grok/DeepSeek): Thay vì ép tốc độ đọc quá nhanh, AI sẽ nhận diện các câu quá dài và tự động viết lại ngắn gọn nhưng vẫn giữ nguyên ý nghĩa, đảm bảo thoại luôn mượt mà.</span>
                          </div>
                        </label>
                      </div>
                      
                      {aiRewrite && (
                        <div className="pl-16 mt-2 mb-2">
                          <label className="flex items-start space-x-2 cursor-pointer hover:opacity-80">
                            <input 
                              type="checkbox" 
                              checked={requireReview}
                              onChange={(e) => setRequireReview(e.target.checked)}
                              className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                              disabled={isProcessing}
                            />
                            <span className="text-xs font-medium text-blue-800">Hiển thị Bảng Kiểm Duyệt để tôi sửa lại văn phong trước khi máy tạo âm thanh. (Tắt đi để máy chạy Auto-Pilot 100%).</span>
                          </label>
                        </div>
                      )}"""

sidebar_content = sidebar_content.replace(old_checkbox, new_checkbox)

with open('src/components/ConfigSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(sidebar_content)

print("Patch applied successfully.")
