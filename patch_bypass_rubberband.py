import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    content = f.read()

old_else_block = """
                  } else {
                      if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
                      if (neededSpeed < minAutoFitSpeed) neededSpeed = minAutoFitSpeed;
                      finalBuffer = await timeStretchBufferRubberband(decoded1x, neededSpeed);
                  }
"""

new_else_block = """
                  } else {
                      if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
                      if (neededSpeed < minAutoFitSpeed) neededSpeed = minAutoFitSpeed;
                      
                      if (Math.abs(neededSpeed - 1.0) < 0.01) {
                          finalBuffer = rawBuffer.slice(0);
                          addLog(`  ✅ Câu ${i + 1} được giữ nguyên tốc độ gốc 1.0x (Bỏ qua Rubberband)`, 'info');
                      } else {
                          finalBuffer = await timeStretchBufferRubberband(decoded1x, neededSpeed);
                          addLog(`  ✅ Câu ${i + 1} được áp tốc độ: ${neededSpeed.toFixed(2)}x (Min: ${minAutoFitSpeed}x, Max: ${maxAutoFitSpeed}x)`, 'info');
                      }
                  }
"""

if old_else_block.strip() in content:
    content = content.replace(old_else_block.strip(), new_else_block.strip())
else:
    # Maybe it was already patched? Let's check for timeStretchBufferRubberband(decoded1x, neededSpeed)
    match = re.search(r'\} else \{\s*if \(neededSpeed > maxAutoFitSpeed\) neededSpeed = maxAutoFitSpeed;\s*if \(neededSpeed < minAutoFitSpeed\) neededSpeed = minAutoFitSpeed;\s*finalBuffer = await timeStretchBufferRubberband\(decoded1x, neededSpeed\);\s*\}', content)
    if match:
        content = content[:match.start()] + new_else_block.strip() + content[match.end():]
    else:
        print("Could not find OmniVoice else block")

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
