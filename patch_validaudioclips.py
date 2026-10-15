import re

engine_file = 'src/hooks/useDubbingEngine.ts'
with open(engine_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the first occurrence
content = content.replace(
    'const validAudioClips = audioClips.filter(clip => clip !== null) as { buffer: ArrayBuffer; startTime: number }[];',
    'const validAudioClips = audioClips.filter((clip, idx) => clip !== null && processedSubs[idx] && processedSubs[idx].text.trim() !== "") as { buffer: ArrayBuffer; startTime: number }[];'
)

# Replace the second occurrence
content = content.replace(
    'const validAudioClips = audioClips.filter(clip => clip !== null) as { buffer: ArrayBuffer; startTime: number; maxDuration?: number }[];',
    'const validAudioClips = audioClips.filter((clip, idx) => clip !== null && processedSubs[idx] && processedSubs[idx].text.trim() !== "") as { buffer: ArrayBuffer; startTime: number; maxDuration?: number }[];'
)

with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
