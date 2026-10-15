import re

audio_file = 'src/lib/audio.ts'
with open(audio_file, 'r', encoding='utf-8') as f:
    audio_content = f.read()

start_marker = "export async function timeStretchBufferPitchPreserving(\n    decoded: AudioBuffer,\n    speedRatio: number\n  ): Promise<ArrayBuffer> {"
end_marker = "export async function timeStretchBufferRubberband(buffer: AudioBuffer, playbackRate: number): Promise<ArrayBuffer> {"

if start_marker in audio_content and end_marker in audio_content:
    start_idx = audio_content.find(start_marker)
    end_idx = audio_content.find(end_marker)
    
    new_func = """export async function timeStretchBufferPitchPreserving(
    decoded: AudioBuffer,
    speedRatio: number
  ): Promise<ArrayBuffer> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    // 1. Pad input with 0.5s silence to flush SoundTouch buffers
    const padSamples = Math.floor(decoded.sampleRate * 0.5);
    const paddedBuffer = audioCtx.createBuffer(decoded.numberOfChannels, decoded.length + padSamples, decoded.sampleRate);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
        paddedBuffer.getChannelData(c).set(decoded.getChannelData(c), 0);
    }
    
    const soundTouch = new SoundTouch(paddedBuffer.sampleRate);
    soundTouch.tempo = speedRatio;
    soundTouch.pitch = 1.0;
  
    const source = new WebAudioBufferSource(paddedBuffer);
    const filter = new SimpleFilter(source, soundTouch);
    
    const numChannels = 2;
    const BUFFER_SIZE = 4096;
    const frames = new Float32Array(BUFFER_SIZE * numChannels);
    
    // 2. Extract all available frames (including flushed delay)
    const chunks: Float32Array[] = [];
    let totalExtracted = 0;
    while (true) {
      const extracted = filter.extract(frames, BUFFER_SIZE);
      if (extracted === 0) break;
      
      const chunk = new Float32Array(extracted * numChannels);
      chunk.set(frames.subarray(0, extracted * numChannels));
      chunks.push(chunk);
      totalExtracted += extracted;
    }
    
    const tempBuffer = audioCtx.createBuffer(numChannels, totalExtracted, paddedBuffer.sampleRate);
    let offset = 0;
    for (const chunk of chunks) {
      for (let c = 0; c < numChannels; c++) {
        const channelData = tempBuffer.getChannelData(c);
        for (let i = 0; i < (chunk.length / numChannels); i++) {
          channelData[offset + i] = chunk[i * numChannels + c];
        }
      }
      offset += (chunk.length / numChannels);
    }
    
    // 3. Trim leading silence (latency introduced by SoundTouch)
    let startOffset = 0;
    const thresh = 0.005;
    const cData = tempBuffer.getChannelData(0);
    for (let i = 0; i < tempBuffer.length; i++) {
        if (Math.abs(cData[i]) > thresh) {
            startOffset = Math.max(0, i - 100); // Keep 100 samples of padding just in case
            break;
        }
    }
    
    const finalLength = tempBuffer.length - startOffset;
    const finalBuffer = audioCtx.createBuffer(numChannels, finalLength, tempBuffer.sampleRate);
    for (let c = 0; c < numChannels; c++) {
        const src = tempBuffer.getChannelData(c);
        const dst = finalBuffer.getChannelData(c);
        dst.set(src.subarray(startOffset));
    }
    
    const blob = audioBufferToWav(finalBuffer);
    return await blob.arrayBuffer();
  }
  
  """
    
    audio_content = audio_content[:start_idx] + new_func + audio_content[end_idx:]
    with open(audio_file, 'w', encoding='utf-8') as f:
        f.write(audio_content)
    print("Replaced timeStretchBufferPitchPreserving successfully")
else:
    print("Could not find markers")
