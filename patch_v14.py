import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    engine_content = f.read()

old_stretch_logic = """                let finalBuffer = null;
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

new_stretch_logic = """                let finalBuffer = null;
                if (!autoFit) {
                    if (Math.abs(fixedSpeed - 1.0) < 0.01) {
                        finalBuffer = rawBuffer.slice(0);
                    } else {
                        addLog(`  🚀 Đang ép tốc độ ${fixedSpeed.toFixed(2)}x bằng SoundTouch (giống VSCode)...`, 'info');
                        finalBuffer = await timeStretchBufferPitchPreserving(decoded1x, fixedSpeed);
                    }
                } else {
                    if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
                    if (neededSpeed < minAutoFitSpeed) neededSpeed = minAutoFitSpeed;
                    
                    if (Math.abs(neededSpeed - 1.0) < 0.01) {
                        finalBuffer = rawBuffer.slice(0);
                        addLog(`  ✅ Câu ${i + 1} được giữ nguyên tốc độ gốc 1.0x`, 'info');
                    } else {
                        addLog(`  🚀 Đang ép tốc độ ${neededSpeed.toFixed(2)}x bằng SoundTouch (giống VSCode)...`, 'info');
                        finalBuffer = await timeStretchBufferPitchPreserving(decoded1x, neededSpeed);
                    }
                }"""
engine_content = engine_content.replace(old_stretch_logic, new_stretch_logic)

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("Reverted to SoundTouchJS")
