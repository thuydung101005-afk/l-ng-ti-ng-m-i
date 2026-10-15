import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    content = f.read()

# For OmniVoice branch
old_else_block = """
                  } else {
                      if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
                      if (neededSpeed < minAutoFitSpeed) neededSpeed = minAutoFitSpeed;
                      finalBuffer = await timeStretchBufferRubberband(decoded1x, neededSpeed);
                  }
                  
                  audioClips[i] = { buffer: finalBuffer, startTime: sub.start };
"""

new_else_block = """
                  } else {
                      if (neededSpeed > maxAutoFitSpeed) neededSpeed = maxAutoFitSpeed;
                      if (neededSpeed < minAutoFitSpeed) neededSpeed = minAutoFitSpeed;
                      addLog(`  ✅ Câu ${i + 1} được áp tốc độ cuối cùng: ${neededSpeed.toFixed(2)}x (Min: ${minAutoFitSpeed}x, Max: ${maxAutoFitSpeed}x)`, 'info');
                      finalBuffer = await timeStretchBufferRubberband(decoded1x, neededSpeed);
                  }
                  
                  audioClips[i] = { buffer: finalBuffer, startTime: sub.start };
"""

if old_else_block.strip() in content:
    content = content.replace(old_else_block.strip(), new_else_block.strip())
else:
    print("Could not find OmniVoice else block")
    
with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
