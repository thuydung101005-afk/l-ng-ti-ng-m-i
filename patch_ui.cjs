const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add states
const statesToAdd = `
  const [reviewItems, setReviewItems] = useState<{ original: string; shortened: string; estimatedSpeed: number }[] | null>(null);
  const [approvedRewrites, setApprovedRewrites] = useState<Record<string, string>>({});
`;
content = content.replace(/(const \[autoFit, setAutoFit\] = useState\(true\);)/, "$1" + statesToAdd);

// 2. Add handleAnalyzeScript function inside App component
const analyzeFunc = `
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

      if (mode === 'dubbing' && neededSpeed > 1.42 && wordCount > 3) {
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

    addLog(\`Phát hiện \${itemsToReview.length} câu quá dài. Đang gọi AI rút gọn...\`, 'info');
    const prompts = itemsToReview.map(item => \`Bản gốc: "\${item.original}"\\nHãy rút gọn lại thật ngắn gọn nhưng giữ nguyên ý chính (Tốc độ ước tính đang bị lố \${item.estimatedSpeed.toFixed(2)}x).\`);
    
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
`;
content = content.replace(/(const startProcessing = async \(\) => \{)/, analyzeFunc + '\n\n  $1');

// 3. Apply approvedRewrites in dubbing loop
content = content.replace(/(if \(cleanText\.startsWith\('-'\)\) cleanText = cleanText\.substring\(1\)\.trim\(\);\s*if \(\!cleanText\) \{)/, "if (cleanText.startsWith('-')) cleanText = cleanText.substring(1).trim();\n    if (approvedRewrites[cleanText]) {\n      addLog(`  ✓ Áp dụng bản rút gọn: ${approvedRewrites[cleanText]}`, 'success');\n      cleanText = approvedRewrites[cleanText];\n    }\n    if (!cleanText) {");

// 4. Add UI Button next to Start Processing
const analyzeButton = `
            <button
              onClick={handleAnalyzeScript}
              disabled={isProcessing || subs.length === 0}
              className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-orange-600/30"
            >
              {isProcessing && !reviewItems ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
              <span>Phân tích & Rút gọn kịch bản</span>
            </button>
`;
content = content.replace(/(<button\s+onClick=\{startProcessing\}[\s\S]*?<Play className="w-6 h-6" \/>\s*\}?\s*<span>.*?Lồng tiếng.*?<\/span>\s*<\/button>)/, analyzeButton + '\n\n            $1');

// 5. Add Review Modal
const reviewModal = `
      {reviewItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-900">Kiểm duyệt Kịch bản Rút gọn</h3>
                <p className="text-sm text-blue-700 mt-1">Hệ thống phát hiện \${reviewItems.length} câu quá dài. Dưới đây là đề xuất rút gọn của AI.</p>
              </div>
              <button onClick={() => setReviewItems(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4">
                {reviewItems.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Bản gốc (Bị lố \${item.estimatedSpeed.toFixed(2)}x tốc độ)</div>
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
`;
content = content.replace(/(<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*)$/, "\n" + reviewModal + "\n$1");

fs.writeFileSync('src/App.tsx', content);
console.log('App patched with Review UI!');
