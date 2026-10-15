import codecs

file_path = "src/lib/audio.ts"

with codecs.open(file_path, "r", "utf-8") as f:
    content = f.read()

old_block = """    const durationSamples = Math.min(clipBuffer.length, maxEndSample - startSample);
    // Fade-out 20ms tại điểm cắt để tránh hard-cut tạo click/rè
    const FADE_OUT_MS = 20;
    const fadeOutSamples = Math.min(Math.floor(FADE_OUT_MS * sampleRate / 1000), durationSamples);
    const fadeStartIdx = durationSamples - fadeOutSamples;
    for (let i = 0; i < durationSamples; i++) {
       if (startSample + i < totalSamples) {
          // Tính hệ số fade-out: 1.0 → 0.0 trong 20ms cuối
          const fadeGain = i >= fadeStartIdx
            ? 1.0 - (i - fadeStartIdx) / fadeOutSamples
            : 1.0;
          mixBufferL[startSample + i] += clipDataL[i] * fadeGain;
          mixBufferR[startSample + i] += clipDataR[i] * fadeGain;
       }
    }"""

new_block = """    const durationSamples = Math.min(clipBuffer.length, maxEndSample - startSample);
    // Fade-out CHỈ khi clip bị hard-cut bởi maxDuration — KHÔNG fade khi audio kết thúc tự nhiên
    const isBeingCut = durationSamples < clipBuffer.length;
    const FADE_OUT_SAMPLES = isBeingCut
      ? Math.min(Math.floor(8 * sampleRate / 1000), durationSamples) // 8ms đủ tránh click
      : 0;
    const fadeStartIdx = durationSamples - FADE_OUT_SAMPLES;
    for (let i = 0; i < durationSamples; i++) {
       if (startSample + i < totalSamples) {
          const fadeGain = (FADE_OUT_SAMPLES > 0 && i >= fadeStartIdx)
            ? 1.0 - (i - fadeStartIdx) / FADE_OUT_SAMPLES
            : 1.0;
          mixBufferL[startSample + i] += clipDataL[i] * fadeGain;
          mixBufferR[startSample + i] += clipDataR[i] * fadeGain;
       }
    }"""

content = content.replace('\r\n', '\n')
old_block = old_block.replace('\r\n', '\n')

if old_block in content:
    content = content.replace(old_block, new_block)
    with codecs.open(file_path, "w", "utf-8") as f:
        f.write(content)
    print("SUCCESS: replaced fade-out block")
else:
    print("FAILED TO FIND OLD BLOCK")
