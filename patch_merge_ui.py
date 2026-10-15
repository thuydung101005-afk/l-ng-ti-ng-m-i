import re
import os

# 1. Update useDubbingEngine.ts
engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    engine_content = f.read()

# Add totalSubsCount state
state_match = re.search(r'const \[isProcessing, setIsProcessing\] = useState\(false\);', engine_content)
if state_match:
    engine_content = engine_content[:state_match.end()] + '\n  const [totalSubsCount, setTotalSubsCount] = useState(0);' + engine_content[state_match.end():]

# Update setTotalSubsCount
start_dub_match = re.search(r'let processedSubs = \[\.\.\.subs\];([\s\S]*?)const totalSubs = processedSubs\.length;', engine_content)
if start_dub_match:
    engine_content = engine_content.replace('const totalSubs = processedSubs.length;', 'const totalSubs = processedSubs.length;\n    setTotalSubsCount(totalSubs);')

# Update handleApprove definition
engine_content = engine_content.replace('handleApproveRef.current = (index: number, newText: string)', 'handleApproveRef.current = (index: number, newText: string, action?: \'mergeWithNext\')')
engine_content = engine_content.replace('handleApprove: \n(index: number, newText: string) => { if (handleApproveRef.current) handleApproveRef.current(index, newText); }', 'handleApprove: \n(index: number, newText: string, action?: \'mergeWithNext\') => { if (handleApproveRef.current) handleApproveRef.current(index, newText, action); }')

# In handleApprove return block: (index: number, newText: string) => { if (handleApproveRef.current) handleApproveRef.current(index, newText); }
engine_content = re.sub(
    r'handleApprove:\s*\(index: number, newText: string\) => \{ if \(handleApproveRef\.current\) handleApproveRef\.current\(index, newText\); \}',
    "handleApprove: (index: number, newText: string, action?: 'mergeWithNext') => { if (handleApproveRef.current) handleApproveRef.current(index, newText, action); }",
    engine_content
)

# Export totalSubsCount
export_match = re.search(r'mode, setMode,', engine_content)
if export_match:
    engine_content = engine_content[:export_match.start()] + 'totalSubsCount,\n      ' + engine_content[export_match.start():]

# Add merge logic
old_approve_logic = """
        // Cập nhật text đã duyệt
        const originalText = processedSubs[index].text.trim().replace(/^-/, '').trim();
        approvedRewrites[originalText] = newText;
        setApprovedRewrites({...approvedRewrites});
        
        // Cập nhật trực tiếp vào kịch bản để xuất file SRT chuẩn xác
        processedSubs[index].text = newText;
        processedIndices.add(index);
"""

new_approve_logic = """
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
            // Cập nhật text đã duyệt
            const originalText = processedSubs[index].text.trim().replace(/^-/, '').trim();
            approvedRewrites[originalText] = newText;
            setApprovedRewrites({...approvedRewrites});
            
            // Cập nhật trực tiếp vào kịch bản để xuất file SRT chuẩn xác
            processedSubs[index].text = newText;
            processedIndices.add(index);
            addLog(`  ✅ Đã nhận bản duyệt câu ${index + 1}: "${newText}". Đang đưa vào hàng đợi render lại...`, 'success');
        }
"""
# Note: I have to replace carefully using regex because of spaces.
# Actually I can just regex match the block and replace.
match = re.search(r'handleApproveRef\.current = \(index: number, newText: string, action\?: \'mergeWithNext\'\) => \{([\s\S]*?)// XA3a kh\?i bng review', engine_content.replace('Xóa khỏi bảng review', 'XA3a kh?i bng review'))
if not match:
    match = re.search(r"handleApproveRef\.current = \(index: number, newText: string(?:, action\?: 'mergeWithNext')?\) => \{([\s\S]*?)// Xóa khỏi bảng review", engine_content)

if match:
    engine_content = engine_content[:match.start(1)] + "\n" + new_approve_logic + "\n        " + engine_content[match.end():]


with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)

# 2. Update App.tsx
app_file = 'src/App.tsx'
with open(app_file, 'r', encoding='utf-8') as f:
    app_content = f.read()

app_content = app_content.replace(
    'maxSpeed={engine.maxAutoFitSpeed}',
    'maxSpeed={engine.maxAutoFitSpeed}\n              totalSubs={engine.totalSubsCount}'
)
with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_content)

# 3. Update ReviewPanel.tsx
review_file = 'src/components/ReviewPanel.tsx'
with open(review_file, 'r', encoding='utf-8') as f:
    review_content = f.read()

review_content = review_content.replace(
    'onApprove: (index: number, newText: string) => void;',
    "onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void;\n  totalSubs: number;"
)
review_content = review_content.replace(
    'function ReviewPanel({ items, onApprove, maxSpeed }: ReviewPanelProps)',
    'function ReviewPanel({ items, onApprove, maxSpeed, totalSubs }: ReviewPanelProps)'
)
review_content = review_content.replace(
    '<ReviewItemCard key={item.index} item={item} onApprove={onApprove} maxSpeed={maxSpeed} />',
    '<ReviewItemCard key={item.index} item={item} onApprove={onApprove} maxSpeed={maxSpeed} isLast={item.index >= totalSubs - 1} />'
)

review_content = review_content.replace(
    'function ReviewItemCard({ item, onApprove, maxSpeed }: { item: ReviewQueueItem, onApprove: (index: number, newText: string) => void, maxSpeed: number }) {',
    "function ReviewItemCard({ item, onApprove, maxSpeed, isLast }: { item: ReviewQueueItem, onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void, maxSpeed: number, isLast: boolean }) {"
)

import_match = re.search(r"import \{ CheckCircle, AlertTriangle, Play, FastForward \} from 'lucide-react';", review_content)
if import_match:
    review_content = review_content.replace(import_match.group(0), "import { CheckCircle, AlertTriangle, Play, FastForward, Link } from 'lucide-react';")

new_buttons = """
      <div className="mt-3 flex justify-end gap-2">
        {!isLast && (
          <button
            onClick={() => onApprove(item.index, text, 'mergeWithNext')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-md transition-colors"
            title="Gộp nội dung này với câu kế tiếp (câu kế tiếp sẽ bị bỏ qua)"
          >
            <Link className="w-4 h-4" />
            Gộp câu sau
          </button>
        )}
        <button
          onClick={() => onApprove(item.index, text)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Duyệt & Đưa vào hàng chờ
        </button>
      </div>
"""

old_buttons = """
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onApprove(item.index, text)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Duyệt & Đưa vào hàng chờ
        </button>
      </div>
"""

# Need to replace exactly
match_buttons = re.search(r'<div className="mt-3 flex justify-end">[\s\S]*?</button>\s*</div>', review_content)
if match_buttons:
    review_content = review_content[:match_buttons.start()] + new_buttons.strip() + "\n" + review_content[match_buttons.end():]
else:
    print("Could not find buttons in ReviewPanel.tsx")


with open(review_file, 'w', encoding='utf-8') as f:
    f.write(review_content)

print("Done")
