import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    engine_content = f.read()

# 1. Replace the time stretching block
old_stretch_logic = """                let finalBuffer = null;
                if (!autoFit) {
                    finalBuffer = await timeStretchBufferPitchPreserving(decoded1x, fixedSpeed);
                } else {
                    if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
                    if (neededSpeed < minAutoFitSpeed) neededSpeed = minAutoFitSpeed;
                    
                    if (Math.abs(neededSpeed - 1.0) < 0.01) {
                        finalBuffer = rawBuffer.slice(0);
                        addLog(`  ✅ Câu ${i + 1} được giữ nguyên tốc độ gốc 1.0x (Bỏ qua Time-Stretch)`, 'info');
                    } else {
                        finalBuffer = await timeStretchBufferPitchPreserving(decoded1x, neededSpeed);
                        addLog(`  ✅ Câu ${i + 1} được ép tốc độ: ${neededSpeed.toFixed(2)}x (Min: ${minAutoFitSpeed}x, Max: ${maxAutoFitSpeed}x)`, 'info');
                    }
                }"""

new_stretch_logic = """                let finalBuffer = null;
                if (!autoFit) {
                    if (Math.abs(fixedSpeed - 1.0) < 0.01) {
                        finalBuffer = rawBuffer.slice(0);
                    } else {
                        addLog(`  🚀 Yêu cầu OmniVoice đọc lại câu ${i + 1} nhanh hơn với tốc độ tự nhiên ${fixedSpeed.toFixed(2)}x...`, 'info');
                        finalBuffer = await safeRunOmnivoiceRaw(ttsCleanText, fixedSpeed, activeVoiceId);
                    }
                } else {
                    if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
                    if (neededSpeed < minAutoFitSpeed) neededSpeed = minAutoFitSpeed;
                    
                    if (Math.abs(neededSpeed - 1.0) < 0.01) {
                        finalBuffer = rawBuffer.slice(0);
                        addLog(`  ✅ Câu ${i + 1} được giữ nguyên tốc độ gốc 1.0x`, 'info');
                    } else {
                        addLog(`  🚀 Yêu cầu OmniVoice đọc lại câu ${i + 1} nhanh hơn với tốc độ tự nhiên ${neededSpeed.toFixed(2)}x...`, 'info');
                        finalBuffer = await safeRunOmnivoiceRaw(ttsCleanText, neededSpeed, activeVoiceId);
                    }
                }"""
engine_content = engine_content.replace(old_stretch_logic, new_stretch_logic)

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("Swapped frontend DSP stretch for Native OmniVoice API speed")
