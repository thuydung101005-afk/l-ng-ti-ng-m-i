import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    engine_content = f.read()

# 1. Fix punctuation logic
old_punct = """            const lastChar = cleanText.slice(-1);
            const isPunct = [',', '.', '!', '?', ';', ':'].includes(lastChar);
            let ttsCleanText = cleanText.replace(/[,.;:!\\?]/g, ' ');
            ttsCleanText = ttsCleanText.replace(/\\s+/g, ' ').trim();
            if (isPunct) ttsCleanText = ttsCleanText + lastChar;
            
            if (!ttsCleanText.replace(/[,.;:!\\?]/g, '').trim()) {"""

new_punct = """            let ttsCleanText = cleanText; // V4: Keep punctuation for OmniVoice to pause naturally
            
            if (!ttsCleanText.replace(/[,.;:!\\?]/g, '').trim()) {"""
engine_content = engine_content.replace(old_punct, new_punct)

# 2. Update handleApprove signature
old_export = "handleApprove: (index: number, newText: string, action?: 'mergeWithNext') => { if (handleApproveRef.current) handleApproveRef.current(index, newText, action); },"
new_export = "handleApprove: (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => { if (handleApproveRef.current) handleApproveRef.current(index, newText, options); },"
engine_content = engine_content.replace(old_export, new_export)

old_ref = "  const handleApproveRef = useRef<((index: number, newText: string, action?: 'mergeWithNext') => void) | null>(null);"
new_ref = "  const handleApproveRef = useRef<((index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => void) | null>(null);"
if old_ref in engine_content:
    engine_content = engine_content.replace(old_ref, new_ref)
else:
    # fallback if ref was simpler
    old_ref_2 = "  const handleApproveRef = useRef<((index: number, newText: string) => void) | null>(null);"
    engine_content = engine_content.replace(old_ref_2, new_ref)

# 3. Update handleApprove logic
# Replace from `handleApproveRef.current = ...` to `    const processNext = async () => {`
start_idx = engine_content.find("handleApproveRef.current = (index: number, newText: string")
end_idx = engine_content.find("    const processNext = async () => {")

new_handle = """handleApproveRef.current = (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => {
        let finalStartIndex = index;
        let finalEndIndex = index;
        
        let prevIndex = index - 1;
        while (prevIndex >= 0 && !processedSubs[prevIndex].text.trim()) prevIndex--;
        
        let nextIndex = index + 1;
        while (nextIndex < processedSubs.length && !processedSubs[nextIndex].text.trim()) nextIndex++;

        if (options?.mergePrev && prevIndex >= 0) {
            finalStartIndex = prevIndex;
        }
        if (options?.mergeNext && nextIndex < processedSubs.length) {
            finalEndIndex = nextIndex;
        }
        
        if (finalEndIndex >= processedSubs.length) finalEndIndex = index;
        if (finalStartIndex < 0) finalStartIndex = index;
        
        // Clear all absorbed subs
        for (let idx = finalStartIndex + 1; idx <= finalEndIndex; idx++) {
            processedSubs[idx].text = "";
            processedSubs[idx].start = 0;
            processedSubs[idx].end = 0;
            audioClips[idx] = null;
            processedIndices.add(idx);
            
            // Re-assign renderQueue without these items
            let newQueue = [];
            for (let i=0; i<renderQueueRef.current.length; i++) {
                if (renderQueueRef.current[i] !== idx) newQueue.push(renderQueueRef.current[i]);
            }
            renderQueueRef.current = newQueue;
        }
        
        // Ensure finalStartIndex inherits the end time
        processedSubs[finalStartIndex].text = newText;
        if (processedSubs[finalEndIndex]) {
            processedSubs[finalStartIndex].end = processedSubs[finalEndIndex].end;
        }
        audioClips[finalStartIndex] = null;
        processedIndices.add(finalStartIndex); 
        
        setReviewQueueItems(prev => prev.filter(item => item.index < finalStartIndex + 1 || item.index > finalEndIndex));
        setReviewQueueItems(prev => prev.filter(item => item.index !== index));
        
        if (!renderQueueRef.current.includes(finalStartIndex)) {
            renderQueueRef.current.push(finalStartIndex);
        }
        
        addLog(`  ✅ Đã duyệt câu ${index + 1}: "${newText.substring(0, 20)}...". Đang render lại...`, 'success');
        processNext();
    };

"""
engine_content = engine_content[:start_idx] + new_handle + engine_content[end_idx:]

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("useDubbingEngine.ts patched for V4")

# 4. Patch ReviewPanel.tsx
panel_file = 'src/components/ReviewPanel.tsx'
with open(panel_file, 'r', encoding='utf-8') as f:
    panel_content = f.read()

old_panel_props = "onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void;"
new_panel_props = "onApprove: (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => void;"
panel_content = panel_content.replace(old_panel_props, new_panel_props)

old_card_sig = "onApprove: (index: number, newText: string, action?: 'mergeWithNext') => void"
new_card_sig = "onApprove: (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => void"
panel_content = panel_content.replace(old_card_sig, new_card_sig)

old_state = "const [isRewriting, setIsRewriting] = useState(false);"
new_state = """const [isRewriting, setIsRewriting] = useState(false);
  const [mergedPrev, setMergedPrev] = useState(false);
  const [mergedNext, setMergedNext] = useState(false);
  
  const handleMergePrev = () => {
    if (!item.prevText) return;
    const t1 = item.prevText.trim();
    const t2 = text.trim();
    const hasPunct = [',', '.', '!', '?', ';', ':'].includes(t1.slice(-1));
    setText(t1 + (hasPunct ? ' ' : ', ') + t2);
    setMergedPrev(true);
  };

  const handleMergeNext = () => {
    if (!item.nextText) return;
    const t1 = text.trim();
    const t2 = item.nextText.trim();
    const hasPunct = [',', '.', '!', '?', ';', ':'].includes(t1.slice(-1));
    setText(t1 + (hasPunct ? ' ' : ', ') + t2);
    setMergedNext(true);
  };"""
panel_content = panel_content.replace(old_state, new_state)

old_ui = """      <div>
        <div className="text-xs text-blue-400 mb-1 flex items-center gap-1">AI Đề xuất (Có thể chỉnh sửa):</div>
        <textarea"""

new_ui = """      <div>
        <div className="flex justify-between items-end mb-1">
          <div className="text-xs text-blue-400 flex items-center gap-1">Bản sửa (Chốt cuối):</div>
          <div className="flex gap-2">
            <button onClick={handleMergePrev} disabled={mergedPrev || !item.prevText} className="text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 px-2 py-0.5 rounded transition-colors">+ Câu trước</button>
            <button onClick={handleMergeNext} disabled={mergedNext || !item.nextText} className="text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 px-2 py-0.5 rounded transition-colors">+ Câu sau</button>
          </div>
        </div>
        <textarea"""
panel_content = panel_content.replace(old_ui, new_ui)

old_buttons = """        {!isLast && (
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
        >"""

new_buttons = """        <button
          onClick={() => onApprove(item.index, text, { mergePrev: mergedPrev, mergeNext: mergedNext })}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors"
        >"""
panel_content = panel_content.replace(old_buttons, new_buttons)

with open(panel_file, 'w', encoding='utf-8') as f:
    f.write(panel_content)

print("ReviewPanel.tsx patched for V4")
