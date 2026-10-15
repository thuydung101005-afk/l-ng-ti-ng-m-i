const fs = require('fs');
let code = fs.readFileSync('src/lib/audio.ts', 'utf8');

const soundTouchImport = `import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';\n`;

// Prepend import if not present
if (!code.includes('soundtouchjs')) {
    code = soundTouchImport + code;
}

// Add the timeStretchBufferPitchPreserving function
const newFunc = `
export async function timeStretchBufferPitchPreserving(
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
  
  const numChannels = decoded.numberOfChannels;
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
}
`;

if (!code.includes('timeStretchBufferPitchPreserving')) {
    code += newFunc;
}

fs.writeFileSync('src/lib/audio.ts', code);
console.log('Patched audio.ts');
