import re

with open('src/lib/audio.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace mergeAudioClips
pattern = r"export async function mergeAudioClips\(.*?Promise<Blob> \{.*?(?=\nexport function audioBufferToWav)"

new_merge_func = """export async function mergeAudioClips(clips: { buffer: ArrayBuffer; startTime: number; maxDuration?: number }[]): Promise<Blob> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    const decodedClips: { buffer: AudioBuffer; startTime: number; maxDuration?: number }[] = [];
    let maxDuration = 0;
    
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      try {
        const bufferClone = clip.buffer.slice(0);
        const decoded = await audioCtx.decodeAudioData(bufferClone);
        
        let end = clip.startTime + decoded.duration;
        if (clip.maxDuration && clip.maxDuration < decoded.duration) {
          end = clip.startTime + clip.maxDuration;
        }
        if (end > maxDuration) {
          maxDuration = end;
        }
        
        decodedClips.push({
          buffer: decoded,
          startTime: clip.startTime,
          maxDuration: clip.maxDuration
        });
      } catch (e) {
        console.warn(`Bỏ qua audio tại mốc ${clip.startTime}s do lỗi giải mã.`, e);
      }
    }
    
    try { audioCtx.close(); } catch(e) {}
  
    if (maxDuration === 0 || decodedClips.length === 0) {
      throw new Error("Không có dữ liệu audio hợp lệ để ghép.");
    }
  
    // MANUAL MIXING TO AVOID OfflineAudioContext OOM CRASH ON LONG FILES
    const sampleRate = 44100;
    const totalSamples = Math.ceil(sampleRate * maxDuration);
    const mixBuffer = new Float32Array(totalSamples);
    
    for (const clip of decodedClips) {
      const startSample = Math.floor(clip.startTime * sampleRate);
      const clipBuffer = clip.buffer;
      const clipChannels = clipBuffer.numberOfChannels;
      const clipDataL = clipBuffer.getChannelData(0);
      const clipDataR = clipChannels > 1 ? clipBuffer.getChannelData(1) : clipDataL;
      
      let durationSamples = clipBuffer.length;
      if (clip.maxDuration) {
         const maxSamples = Math.floor(clip.maxDuration * sampleRate);
         if (maxSamples < durationSamples) durationSamples = maxSamples;
      }
      
      // Khử crossfade nhẹ nếu bị cắt cụt (50ms)
      const fadeOutSamples = Math.floor(0.05 * sampleRate);
      const fadeStart = durationSamples - fadeOutSamples;
      
      for (let i = 0; i < durationSamples; i++) {
         if (startSample + i < totalSamples) {
            let monoSample = (clipDataL[i] + clipDataR[i]) / 2;
            
            // Fade out
            if (clip.maxDuration && i >= fadeStart) {
                const fadeMultiplier = 1.0 - ((i - fadeStart) / fadeOutSamples);
                monoSample *= fadeMultiplier;
            }
            
            mixBuffer[startSample + i] += monoSample;
         }
      }
    }
    
    // EXPORT TO 1-CHANNEL WAV (TIẾT KIỆM 50% RAM)
    const wavBuffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(wavBuffer);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // 1 channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byteRate
    view.setUint16(32, 2, true); // blockAlign
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, totalSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < totalSamples; i++) {
      let s = Math.max(-1, Math.min(1, mixBuffer[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([wavBuffer], { type: 'audio/wav' });
}
"""

content = re.sub(pattern, new_merge_func, content, flags=re.DOTALL)

with open('src/lib/audio.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("mergeAudioClips patched for OOM prevention!")
