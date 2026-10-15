import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    content = f.read()

old_gap_logic = """
              let targetDuration = sub.end - sub.start;
              let gap = 0;
              if (i < totalSubs - 1) {
                  const nextSub = processedSubs[i + 1];
                  gap = Math.max(0, nextSub.start - sub.end);
                  if (sub.start + targetDuration > nextSub.start) {
                      targetDuration = nextSub.start - sub.start;
                      gap = 0;
                  }
              }
              if (targetDuration <= 0) targetDuration = 0.1;
"""

new_gap_logic = """
              let targetDuration = sub.end - sub.start;
              let gap = 0;
              if (i < totalSubs - 1) {
                  let nextValidIdx = i + 1;
                  while (nextValidIdx < totalSubs && !processedSubs[nextValidIdx].text.trim()) {
                      nextValidIdx++;
                  }
                  if (nextValidIdx < totalSubs) {
                      const nextValidSub = processedSubs[nextValidIdx];
                      gap = Math.max(0, nextValidSub.start - sub.end);
                      if (sub.start + targetDuration > nextValidSub.start) {
                          targetDuration = nextValidSub.start - sub.start;
                          gap = 0;
                      }
                  }
              }
              if (targetDuration <= 0) targetDuration = 0.1;
"""

# I need to match the exact old_gap_logic inside processNext.
# Let's use regex to find the block securely.
pattern = r'let targetDuration = sub\.end - sub\.start;\s*let gap = 0;\s*if \(i < totalSubs - 1\) \{\s*const nextSub = processedSubs\[i \+ 1\];\s*gap = Math\.max\(0, nextSub\.start - sub\.end\);\s*if \(sub\.start \+ targetDuration > nextSub\.start\) \{\s*targetDuration = nextSub\.start - sub\.start;\s*gap = 0;\s*\}\s*\}\s*if \(targetDuration <= 0\) targetDuration = 0\.1;'

match = re.search(pattern, content)
if match:
    content = content[:match.start()] + new_gap_logic.strip() + content[match.end():]
    with open(engine_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done")
else:
    print("Could not find the gap logic block!")

