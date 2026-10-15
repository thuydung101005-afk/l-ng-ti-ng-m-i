import re

audio_file = 'src/lib/audio.ts'
with open(audio_file, 'r', encoding='utf-8') as f:
    audio_content = f.read()

old_stretch = """export async function timeStretchBufferPitchPreserving(
    decoded: AudioBuffer,
    speedRatio: number
  ): Promise<ArrayBuffer> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    const soundTouch = new SoundTouch(decoded.sampleRate);
    soundTouch.tempo = speedRatio;
    soundTouch.pitch = 1.0;
  
    const source = new WebAudioBufferSource(decoded);
    const filter = new SimpleFilter(source, soundTouch);
    
    // SoundTouchJS defaults to stereo output (2 channels) regardless of input.
    const numChannels = 2;
    const outFrames = Math.ceil(decoded.length / speedRatio);
    const outBuffer = audioCtx.createBuffer(numChannels, outFrames, decoded.sampleRate);
    
    const BUFFER_SIZE = 4096;
    const frames = new Float32Array(BUFFER_SIZE * numChannels);
    
    let framesExtracted = 0;
    while (framesExtracted < outFrames) {
      const toExtract = Math.min(BUFFER_SIZE, outFrames - framesExtracted);
      const extracted = filter.extract(frames, toExtract);
      if (extracted === 0) break;
      
      // De-interleave and write to outBuffer
      for (let c = 0; c < numChannels; c++) {
        const channelData = outBuffer.getChannelData(c);
        for (let i = 0; i < extracted; i++) {
          channelData[framesExtracted + i] = frames[i * numChannels + c];
        }
      }
      framesExtracted += extracted;
    }
    
    const blob = audioBufferToWav(outBuffer);
    return await blob.arrayBuffer();
  }"""

new_stretch = """export async function timeStretchBufferPitchPreserving(
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
            startOffset = max(0, i - 100); // Keep 100 samples of padding just in case
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
  
  function max(a: number, b: number) { return a > b ? a : b; }"""

audio_content = audio_content.replace(old_stretch, new_stretch)

with open(audio_file, 'w', encoding='utf-8') as f:
    f.write(audio_content)

print("Audio stretch patched")
