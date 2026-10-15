import re

# 1. Update useDubbingEngine.ts
engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    engine_content = f.read()

# Add handleRewriteRef
insert_ref = "  const handleApproveRef = useRef<((index: number, newText: string) => void) | null>(null);"
new_ref = insert_ref + "\n  const handleRewriteRef = useRef<((index: number, originalText: string, neededSpeed: number) => Promise<string>) | null>(null);"
engine_content = engine_content.replace(insert_ref, new_ref)

# Define handleRewriteRef.current inside omnivoice block
insert_approve_func = "    // Trình xử lý duyệt từ UI"
rewrite_func = """    // Trình xử lý duyệt từ UI
    handleRewriteRef.current = async (index: number, originalText: string, neededSpeed: number) => {
        if (!hasGeminiKey) throw new Error("Chưa nhập API Key Gemini");
        const targetChars = Math.max(10, Math.floor(originalText.length * (maxAutoFitSpeed / neededSpeed) * 0.9));
        const res = await fetch('/api/gemini/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: originalText,
                targetChars: targetChars,
                previousText: "", // Bỏ context theo yêu cầu V3
                nextText: "",
                clientGeminiKeysStr: geminiApiKeysStr,
                attempt: 1
            })
        });
        if (!res.ok) throw new Error("Lỗi gọi Gemini");
        const data = await res.json();
        return data.result || originalText;
    };
"""
engine_content = engine_content.replace(insert_approve_func, rewrite_func)

# Export handleRewrite
old_export = "handleApprove: (index: number, newText: string, action?: 'mergeWithNext') => { if (handleApproveRef.current) handleApproveRef.current(index, newText, action); },"
new_export = old_export + "\n      handleRewrite: (index: number, originalText: string, neededSpeed: number) => { return handleRewriteRef.current ? handleRewriteRef.current(index, originalText, neededSpeed) : Promise.resolve(originalText); },"
engine_content = engine_content.replace(old_export, new_export)

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)


# 2. Update ReviewPanel.tsx
panel_file = 'src/components/ReviewPanel.tsx'
with open(panel_file, 'r', encoding='utf-8') as f:
    panel_content = f.read()

old_props = """interface ReviewPanelProps {
  items: ReviewQueueItem[];
  onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void;
  totalSubs: number;
  maxSpeed: number;
}"""

new_props = """interface ReviewPanelProps {
  items: ReviewQueueItem[];
  onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void;
  onRewrite?: (index: number, originalText: string, neededSpeed: number) => Promise<string>;
  totalSubs: number;
  maxSpeed: number;
}"""
panel_content = panel_content.replace(old_props, new_props)

old_comp_sig = "export default function ReviewPanel({ items, onApprove, maxSpeed, totalSubs }: ReviewPanelProps) {"
new_comp_sig = "export default function ReviewPanel({ items, onApprove, onRewrite, maxSpeed, totalSubs }: ReviewPanelProps) {"
panel_content = panel_content.replace(old_comp_sig, new_comp_sig)

old_render = "          <ReviewItemCard key={item.index} item={item} onApprove={onApprove} maxSpeed={maxSpeed} isLast={item.index >= totalSubs - 1} />"
new_render = "          <ReviewItemCard key={item.index} item={item} onApprove={onApprove} onRewrite={onRewrite} maxSpeed={maxSpeed} isLast={item.index >= totalSubs - 1} />"
panel_content = panel_content.replace(old_render, new_render)

old_card_sig = "function ReviewItemCard({ item, onApprove, maxSpeed, isLast }: { item: ReviewQueueItem, onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void, maxSpeed: number, isLast: boolean }) {"
new_card_sig = "function ReviewItemCard({ item, onApprove, onRewrite, maxSpeed, isLast }: { item: ReviewQueueItem, onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void, onRewrite?: (index: number, originalText: string, neededSpeed: number) => Promise<string>, maxSpeed: number, isLast: boolean }) {"
panel_content = panel_content.replace(old_card_sig, new_card_sig)

import_lucide = "import { CheckCircle, AlertTriangle, Play, FastForward, Link"
if "Wand2" not in panel_content:
    panel_content = panel_content.replace(import_lucide, import_lucide + ", Wand2, Loader2")
elif "Loader2" not in panel_content:
    panel_content = panel_content.replace(import_lucide, import_lucide + ", Loader2")

old_card_state = "const [text, setText] = useState(item.shortened || item.original);"
new_card_state = """const [text, setText] = useState(item.shortened || item.original);
  const [isRewriting, setIsRewriting] = useState(false);
  
  const handleRewriteClick = async () => {
    if (!onRewrite) return;
    setIsRewriting(true);
    try {
        const newText = await onRewrite(item.index, item.original, item.neededSpeed);
        setText(newText);
    } catch (e) {
        console.error(e);
        alert("Lỗi khi gọi AI rút gọn!");
    }
    setIsRewriting(false);
  };
"""
panel_content = panel_content.replace(old_card_state, new_card_state)

old_buttons = """      <div className="mt-3 flex justify-end gap-2">
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
      </div>"""

new_buttons = """      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={handleRewriteClick}
          disabled={isRewriting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-sm font-medium rounded-md transition-colors mr-auto"
        >
          {isRewriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Nhờ AI Rút gọn
        </button>
        {!isLast && (
          <button
            onClick={() => onApprove(item.index, text, 'mergeWithNext')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-md transition-colors"
            title="Gộp nội dung này với câu kế tiếp (câu kế tiếp sẽ bị xóa hoàn toàn)"
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
      </div>"""
panel_content = panel_content.replace(old_buttons, new_buttons)

with open(panel_file, 'w', encoding='utf-8') as f:
    f.write(panel_content)

print("Done part 2")
