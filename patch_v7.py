import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    engine_content = f.read()

# Replace Rubberband with PitchPreserving
old_stretch_1 = "finalBuffer = await timeStretchBufferRubberband(decoded1x, fixedSpeed);"
new_stretch_1 = "finalBuffer = await timeStretchBufferPitchPreserving(decoded1x, fixedSpeed);"
engine_content = engine_content.replace(old_stretch_1, new_stretch_1)

old_stretch_2 = "finalBuffer = await timeStretchBufferRubberband(decoded1x, neededSpeed);"
new_stretch_2 = "finalBuffer = await timeStretchBufferPitchPreserving(decoded1x, neededSpeed);"
engine_content = engine_content.replace(old_stretch_2, new_stretch_2)

old_log = "addLog(`  ✅ Câu ${i + 1} được giữ nguyên tốc độ gốc 1.0x (Bỏ qua Rubberband)`, 'info');"
new_log = "addLog(`  ✅ Câu ${i + 1} được giữ nguyên tốc độ gốc 1.0x (Bỏ qua Time-Stretch)`, 'info');"
engine_content = engine_content.replace(old_log, new_log)

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("Engine patched to use PitchPreserving")
