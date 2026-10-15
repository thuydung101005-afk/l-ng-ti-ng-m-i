import re

audio_file = 'src/lib/audio.ts'
with open(audio_file, 'r', encoding='utf-8') as f:
    audio_content = f.read()

# 1. Fix timeline maxDuration calculation
old_max_dur_1 = """      if (clip.maxDuration && clip.maxDuration < decoded.duration) {
        end = clip.startTime + clip.maxDuration;
      }
      if (end > maxDuration) { maxDuration = end; }"""

new_max_dur_1 = """      if (end > maxDuration) { maxDuration = end; }"""
audio_content = audio_content.replace(old_max_dur_1, new_max_dur_1)

# 2. Fix durationSamples truncation
old_max_dur_2 = """    let durationSamples = clipBuffer.length;
    if (clip.maxDuration) {
       const maxSamples = Math.floor(clip.maxDuration * sampleRate);
       if (maxSamples < durationSamples) durationSamples = maxSamples;
    }
    const fadeOutSamples = Math.floor(0.05 * sampleRate);"""

new_max_dur_2 = """    let durationSamples = clipBuffer.length;
    const fadeOutSamples = Math.floor(0.05 * sampleRate);"""
audio_content = audio_content.replace(old_max_dur_2, new_max_dur_2)

# 3. Fix fading logic
old_max_dur_3 = """          if (clip.maxDuration && i >= fadeStart) {
              const fadeMultiplier = 1.0 - ((i - fadeStart) / fadeOutSamples);
              sL *= fadeMultiplier;
              sR *= fadeMultiplier;
          }"""

new_max_dur_3 = """          // Removed maxDuration fade-out to preserve audio integrity"""
audio_content = audio_content.replace(old_max_dur_3, new_max_dur_3)


with open(audio_file, 'w', encoding='utf-8') as f:
    f.write(audio_content)

print("Removed maxDuration cutoff logic")
