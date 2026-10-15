const { SoundTouch, SimpleFilter, WebAudioBufferSource } = require('soundtouchjs');

const sampleRate = 24000;
const numChannels = 1;
const length = 48000; // 2 seconds

const mockBuffer = {
  sampleRate,
  numberOfChannels: numChannels,
  length,
  getChannelData: (c) => new Float32Array(length).fill(0.1) // dummy audio
};

try {
  const soundTouch = new SoundTouch(sampleRate);
  soundTouch.tempo = 1.45;
  soundTouch.pitch = 1.0;

  const source = new WebAudioBufferSource(mockBuffer);
  const filter = new SimpleFilter(source, soundTouch);
  
  const outFrames = Math.ceil(length / 1.45);
  const BUFFER_SIZE = 4096;
  const frames = new Float32Array(BUFFER_SIZE * numChannels);
  
  let framesExtracted = 0;
  while (framesExtracted < outFrames) {
    const toExtract = Math.min(BUFFER_SIZE, outFrames - framesExtracted);
    const extracted = filter.extract(frames, toExtract);
    if (extracted === 0) break;
    framesExtracted += extracted;
  }
  console.log('Success! Extracted', framesExtracted);
} catch (e) {
  console.error('Error:', e.message);
}
