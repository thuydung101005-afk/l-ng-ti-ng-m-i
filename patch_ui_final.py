import sys
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleAnalyzeScript right before const startDubbing = async
analyze_func = """
  const handleAnalyzeScript = async () => {
    if (subs.length === 0) return;
    setIsProcessing(true);
    addLog('Đang phân tích độ dài kịch bản...', 'info');
    
    const intercept = rateStats ? rateStats.intercept : 0.5;
    const slope = rateStats ? rateStats.slope : 0.25;

    const itemsToReview: { original: string; shortened: string; estimatedSpeed: number }[] = [];
    const processedSubs = mode === 'dubbing' && smartGroup ? groupSubtitles(subs) : subs;
    
    for (let i = 0; i < processedSubs.length; i++) {
      const sub = processedSubs[i];
      let cleanText = sub.text.trim();
      if (cleanText.startsWith('-')) cleanText = cleanText.substring(1).trim();
      if (approvedRewrites[cleanText]) continue;
      
      const words = cleanText.split(/\\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      
      let targetDuration = sub.end - sub.start;
      if (mode === 'dubbing') {
        let gap = 0;
        if (i < processedSubs.length - 1) {
          const nextSub = processedSubs[i + 1];
          gap = Math.max(0, nextSub.start - sub.end);
          if (sub.start + targetDuration > nextSub.start) {
            targetDuration = nextSub.start - sub.start;
            gap = 0;
          }
        } else {
          gap = 2.0;
        }
        targetDuration += gap;
      }

      const estDur = intercept + slope * wordCount;
      const neededSpeed = estDur / targetDuration;

      if (mode === 'dubbing' && neededSpeed > maxAutoFitSpeed && wordCount > 3) {
         itemsToReview.push({
            original: cleanText,
            shortened: '',
            estimatedSpeed: neededSpeed
         });
      }
    }

    if (itemsToReview.length === 0) {
       addLog('Phân tích hoàn tất: Kịch bản đã chuẩn, không có câu nào lố thời gian!', 'success');
       setIsProcessing(false);
       return;
    }

    addLog(`Phát hiện ${itemsToReview.length} câu quá dài. Đang gọi AI rút gọn...`, 'info');
    const prompts = itemsToReview.map(item => `Bản gốc: "${item.original}"\\nHãy rút gọn lại thật ngắn gọn (khoảng ${Math.max(1, Math.floor(item.original.split(' ').length / item.estimatedSpeed))} từ) nhưng giữ nguyên ý chính.`);
    
    try {
      const res = await fetch('/api/gemini/rewrite-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts, systemInstruction: 'Bạn là chuyên gia lồng tiếng. Nhiệm vụ: Rút gọn phụ đề theo đúng số từ yêu cầu mà không làm mất nghĩa.' })
      });
      
      if (!res.ok) throw new Error('Lỗi gọi AI');
      const data = await res.json();
      
      if (data.results) {
         itemsToReview.forEach((item, idx) => {
            let resText = data.results[idx] || item.original;
            resText = resText.replace(/^\\*\\*Câu rút gọn:\\*\\*\\s*/i, '').replace(/^"|"$/g, '').trim();
            item.shortened = resText;
         });
      }
      setReviewItems(itemsToReview);
    } catch (e) {
      addLog('Lỗi AI: ' + e, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveRewrites = () => {
    if (!reviewItems) return;
    const newRewrites = { ...approvedRewrites };
    reviewItems.forEach(item => {
      newRewrites[item.original] = item.shortened;
    });
    setApprovedRewrites(newRewrites);
    setReviewItems(null);
    addLog('Đã lưu các câu rút gọn vào bộ nhớ. Bác có thể bấm Lồng tiếng ngay bây giờ!', 'success');
  };

"""
content = content.replace("  const startDubbing = async (overrideProvider", analyze_func + "  const startDubbing = async (overrideProvider")

# 2. Add the UI button
btn_code = """
              <button
                onClick={handleAnalyzeScript}
                disabled={isProcessing || !srtFile}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all ${
                  isProcessing || !srtFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isProcessing && !reviewItems ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                <span>Phân tích & Tối ưu Kịch bản</span>
              </button>
              
"""
content = content.replace("""<div className="flex flex-col gap-3">
                <button
                  onClick={() => startDubbing()}""", """<div className="flex flex-col gap-3">""" + btn_code + """
                <button
                  onClick={() => startDubbing()}""")

# 3. Add the Review Modal right before the last closing tags
modal_code = """
      {reviewItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-900">Kiểm duyệt Kịch bản Rút gọn</h3>
                <p className="text-sm text-blue-700 mt-1">Hệ thống phát hiện {reviewItems.length} câu quá dài. Dưới đây là đề xuất rút gọn của AI.</p>
              </div>
              <button onClick={() => setReviewItems(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4">
                {reviewItems.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Bản gốc (Bị lố {item.estimatedSpeed.toFixed(2)}x tốc độ)</div>
                        <div className="text-gray-800 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{item.original}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Bản rút gọn (Bác có thể sửa)</div>
                        <textarea
                          value={item.shortened}
                          onChange={(e) => {
                            const newItems = [...reviewItems];
                            newItems[idx].shortened = e.target.value;
                            setReviewItems(newItems);
                          }}
                          className="w-full text-sm text-blue-900 bg-blue-50/30 border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white flex justify-end space-x-3">
              <button onClick={() => setReviewItems(null)} className="px-6 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100">Hủy bỏ</button>
              <button onClick={saveRewrites} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Lưu & Tiếp tục Lồng tiếng</span>
              </button>
            </div>
          </div>
        </div>
      )}
"""
content = content.replace("          </div>\n        </div>\n      </div>\n    </div>\n  );\n}", modal_code + "          </div>\n        </div>\n      </div>\n    </div>\n  );\n}")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
