import codecs

file_path = "src/lib/audio.ts"

with codecs.open(file_path, "r", "utf-8") as f:
    content = f.read()

old_block = """    const maxEndSample = clip.maxDuration
      ? Math.min(totalSamples, Math.floor(clip.maxDuration * sampleRate))
      : totalSamples;
    const durationSamples = Math.min(clipBuffer.length, maxEndSample - startSample);"""

new_block = """    // Đã bỏ maxDuration cut để audio không bị ngắt đuôi (choppy/khựng). 
    // Peak normalization ở dưới sẽ lo việc chống rè nếu có overlap nhẹ.
    const durationSamples = Math.min(clipBuffer.length, totalSamples - startSample);"""

content = content.replace('\r\n', '\n')
old_block = old_block.replace('\r\n', '\n')

if old_block in content:
    content = content.replace(old_block, new_block)
    with codecs.open(file_path, "w", "utf-8") as f:
        f.write(content)
    print("SUCCESS: removed maxDuration limit in audio.ts")
else:
    print("FAILED TO FIND OLD BLOCK")
