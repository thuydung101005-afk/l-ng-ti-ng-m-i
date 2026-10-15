import codecs

audio_path = "src/lib/audio.ts"
use_engine_path = "src/hooks/useDubbingEngine.ts"

# 1. Update src/lib/audio.ts
with codecs.open(audio_path, "r", "utf-8") as f:
    audio_content = f.read()

trim_silence_code = """
export function trimSilence(buffer: AudioBuffer): AudioBuffer {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  
  let startOffset = 0;
  const thresh = 0.005; // 0.5% threshold for silence
  const cData = buffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i++) {
      if (Math.abs(cData[i]) > thresh) {
          startOffset = Math.max(0, i - Math.floor(buffer.sampleRate * 0.05)); // Keep 50ms of padding to avoid abrupt start
          break;
      }
  }
  
  let endOffset = buffer.length;
  for (let i = buffer.length - 1; i >= 0; i--) {
      if (Math.abs(cData[i]) > thresh) {
          endOffset = Math.min(buffer.length, i + Math.floor(buffer.sampleRate * 0.05)); // Keep 50ms of padding
          break;
      }
  }
  
  if (startOffset === 0 && endOffset === buffer.length) return buffer;
  
  const finalLength = endOffset - startOffset;
  if (finalLength <= 0) return buffer;

  const finalBuffer = audioCtx.createBuffer(buffer.numberOfChannels, finalLength, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = finalBuffer.getChannelData(c);
      dst.set(src.subarray(startOffset, endOffset));
  }
  
  return finalBuffer;
}
"""

if "export function trimSilence" not in audio_content:
    audio_content += "\n" + trim_silence_code + "\n"
    with codecs.open(audio_path, "w", "utf-8") as f:
        f.write(audio_content)
    print("Added trimSilence to audio.ts")
else:
    print("trimSilence already exists in audio.ts")


# 2. Update src/hooks/useDubbingEngine.ts
with codecs.open(use_engine_path, "r", "utf-8") as f:
    engine_content = f.read()

# Fix imports
old_import = "import { mergeAudioClips, audioBufferToWav, timeStretchBuffer, timeStretchBufferRubberband, timeStretchBufferPitchPreserving } from '../lib/audio';"
new_import = "import { mergeAudioClips, audioBufferToWav, timeStretchBuffer, timeStretchBufferRubberband, timeStretchBufferPitchPreserving, trimSilence } from '../lib/audio';"

if old_import in engine_content:
    engine_content = engine_content.replace(old_import, new_import)

# Patch runTTS
old_runTTS = """    const result = await _runTTS(text, currentSpeed, index, projectExportIdRef, provider, vId);
    ttsCache.current.set(cacheKey, result);
    return result.slice(0);"""

new_runTTS = """    const resultBuffer = await _runTTS(text, currentSpeed, index, projectExportIdRef, provider, vId);
    
    // Xử lý cắt bỏ khoảng lặng (padding) 1 giây ở đầu/cuối từ TTS Engine
    const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new audioContextClass();
    const decoded = await audioCtx.decodeAudioData(resultBuffer.slice(0));
    const trimmed = trimSilence(decoded);
    const resultWavBlob = audioBufferToWav(trimmed);
    const result = await resultWavBlob.arrayBuffer();
    
    ttsCache.current.set(cacheKey, result);
    return result.slice(0);"""

if old_runTTS in engine_content:
    engine_content = engine_content.replace(old_runTTS, new_runTTS)
    print("Patched runTTS in useDubbingEngine.ts")
else:
    print("Could not find old_runTTS in useDubbingEngine.ts")

with codecs.open(use_engine_path, "w", "utf-8") as f:
    f.write(engine_content)
