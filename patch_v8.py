import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    engine_content = f.read()

# 1. Update merge logic in handleApproveRef (Manual Merge)
old_manual_merge = """                const nextSub = processedSubs[nextIndex];
                const combinedText = newText + " " + nextSub.text.trim().replace(/^-/, '').trim();
                processedSubs[index].text = combinedText;"""

new_manual_merge = """                const nextSub = processedSubs[nextIndex];
                let t1 = newText.trim();
                let t2 = nextSub.text.trim().replace(/^-/, '').trim();
                const lastCharT1 = t1.slice(-1);
                const hasPunct = [',', '.', '!', '?', ';', ':'].includes(lastCharT1);
                const combinedText = t1 + (hasPunct ? ' ' : ', ') + t2;
                processedSubs[index].text = combinedText;"""
engine_content = engine_content.replace(old_manual_merge, new_manual_merge)

# 2. Update merge logic in Auto-Merge
old_auto_merge = """                         const nextSub = processedSubs[nextValidIdx];
                         addLog(`  🔄 Auto-Merge: Câu ${i+1} lố tốc độ & có dấu phẩy, tự động gộp với câu ${nextValidIdx+1}!`, 'success');
                         
                         sub.text = sub.text.trim() + " " + nextSub.text.trim();"""

new_auto_merge = """                         const nextSub = processedSubs[nextValidIdx];
                         addLog(`  🔄 Auto-Merge: Câu ${i+1} lố tốc độ & có dấu phẩy, tự động gộp với câu ${nextValidIdx+1}!`, 'success');
                         
                         let t1 = sub.text.trim();
                         let t2 = nextSub.text.trim();
                         const lastCharT1 = t1.slice(-1);
                         const hasPunct = [',', '.', '!', '?', ';', ':'].includes(lastCharT1);
                         sub.text = t1 + (hasPunct ? ' ' : ', ') + t2;"""
engine_content = engine_content.replace(old_auto_merge, new_auto_merge)

# 3. Fix punctuation stripping and 400 Bad Request
old_process = """            const lastChar = cleanText.slice(-1);
            const isPunct = [',', '.', '!', '?', ';', ':'].includes(lastChar);
            let ttsCleanText = cleanText.replace(/[,.;:!\?]/g, ' ');
            if (isPunct) ttsCleanText = ttsCleanText.trim() + lastChar;
            
            let targetDuration = sub.end - sub.start;
              let gap = 0;"""

new_process = """            const lastChar = cleanText.slice(-1);
            const isPunct = [',', '.', '!', '?', ';', ':'].includes(lastChar);
            let ttsCleanText = cleanText.replace(/[,.;:!\?]/g, ' ');
            ttsCleanText = ttsCleanText.replace(/\\s+/g, ' ').trim();
            if (isPunct) ttsCleanText = ttsCleanText + lastChar;
            
            if (!ttsCleanText.replace(/[,.;:!\\?]/g, '').trim()) {
                addLog(`  ⚠️ Bỏ qua câu ${i+1} vì chỉ chứa dấu câu.`, 'warning');
                audioClips[i] = null;
                continue;
            }
            
            let targetDuration = sub.end - sub.start;
              let gap = 0;"""
engine_content = engine_content.replace(old_process, new_process)

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("Merged logic and 400 fix applied")
