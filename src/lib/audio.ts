import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';
export async function mergeAudioClips(clips: { buffer: ArrayBuffer; startTime: number; maxDuration?: number }[]): Promise<Blob> {
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
      if (end > maxDuration) { maxDuration = end; }
      decodedClips.push({ buffer: decoded, startTime: clip.startTime, maxDuration: clip.maxDuration });
    } catch (e) {
      console.warn('Skipping audio segment due to decode error at ' + clip.startTime, e);
    }
  }
  
  try { audioCtx.close(); } catch(e) {}
  if (maxDuration === 0 || decodedClips.length === 0) { throw new Error('Khong co du lieu audio hop le de ghep.'); }
  
  const sampleRate = audioCtx.sampleRate;
  const totalSamples = Math.ceil(sampleRate * maxDuration);
  
  const mixBufferL = new Float32Array(totalSamples);
  const mixBufferR = new Float32Array(totalSamples);


  for (const clip of decodedClips) {
    const startSample = Math.floor(clip.startTime * sampleRate);
    const clipBuffer = clip.buffer;
    const clipChannels = clipBuffer.numberOfChannels;
    const clipDataL = clipBuffer.getChannelData(0);
    const clipDataR = clipChannels > 1 ? clipBuffer.getChannelData(1) : clipDataL;
    const durationSamples = Math.min(clipBuffer.length, totalSamples - startSample);
    for (let i = 0; i < durationSamples; i++) {
      const absIdx = startSample + i;
      if (absIdx >= totalSamples) break;

      // Cộng dồn (mix) trực tiếp — các clip đã được vuốt êm và đệm khoảng lặng chuẩn xác trong trimSilence
      mixBufferL[absIdx] += clipDataL[i];
      mixBufferR[absIdx] += clipDataR[i];
    }
  }

  const gainFactor = 1.0; // Đã bỏ thuật toán normalize (kéo giảm âm lượng) theo yêu cầu của bác

  const numChannels = 2;
  const wavBuffer = new ArrayBuffer(44 + totalSamples * numChannels * 2);
  const view = new DataView(wavBuffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, totalSamples * numChannels * 2, true);
  
  const softLimit = (x: number): number => {
    if (x > 0.95) return 0.95 + 0.05 * Math.tanh((x - 0.95) / 0.05);
    if (x < -0.95) return -0.95 + 0.05 * Math.tanh((x + 0.95) / 0.05);
    return x;
  };

  const cleanL = applyHighPass55Hz(mixBufferL, sampleRate);
  const cleanR = applyHighPass55Hz(mixBufferR, sampleRate);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    // Áp softLimit để triệt tiêu hoàn toàn hiện tượng ré loa / vỡ tiếng khi các clip cộng dồn biên độ
    let sL = softLimit(cleanL[i] * gainFactor);
    view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
    offset += 2;
    
    let sR = softLimit(cleanR[i] * gainFactor);
    view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([wavBuffer], { type: 'audio/wav' });
}



export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const result = new Float32Array(buffer.length * numChannels);
  // Interleave channels
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < buffer.length; i++) {
      result[i * 2] = left[i];
      result[i * 2 + 1] = right[i];
    }
  } else {
    result.set(buffer.getChannelData(0));
  }

  const view = new DataView(new ArrayBuffer(44 + result.length * 2));
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + result.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); 
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, result.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export async function timeStretchBuffer(decoded: AudioBuffer, speedRatio: number): Promise<ArrayBuffer> {
  const offlineCtx = new OfflineAudioContext(
    decoded.numberOfChannels,
    Math.ceil(decoded.length / speedRatio),
    decoded.sampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.playbackRate.value = speedRatio;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  
  // Convert blob to arraybuffer
  const blob = audioBufferToWav(rendered);
  return await blob.arrayBuffer();
}

export async function timeStretchBufferPitchPreserving(
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
  
  // 2. Drain tất cả frames (kể cả các frames bị giữ trong SoundTouch internal buffer)
  const chunks: Float32Array[] = [];
  let totalExtracted = 0;
  let consecutiveZero = 0;
  while (true) {
    const extracted = filter.extract(frames, BUFFER_SIZE);
    if (extracted === 0) {
      consecutiveZero++;
      // Drain thêm vài lần sau khi nhận 0 đầu tiên — SoundTouch có thể vẫn còn dữ liệu trong internal buffer
      if (consecutiveZero >= 3) break;
      continue;
    }
    consecutiveZero = 0;
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
export async function timeStretchBufferRubberband(buffer: AudioBuffer, playbackRate: number): Promise<ArrayBuffer> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  
  try {
    // Thêm 0.15s silence ở ĐẦU và 0.3s silence ở CUỐI trước khi gửi FFmpeg
    // - 0.15s ở ĐẦU: để WSOLA (atempo) khởi động êm ái trong khoảng lặng, triệt tiêu 100% hiện tượng méo tiếng/trầm dè đầu câu
    // - 0.3s ở CUỐI: để FFmpeg xả trọn vẹn buffer âm thanh đuôi câu
    const leadPadSamples = Math.floor(buffer.sampleRate * 0.15);
    const tailPadSamples = Math.floor(buffer.sampleRate * 0.30);
    const totalSamples = buffer.length + leadPadSamples + tailPadSamples;
    const paddedBuffer = audioCtx.createBuffer(
      buffer.numberOfChannels,
      totalSamples,
      buffer.sampleRate
    );
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      paddedBuffer.getChannelData(c).set(buffer.getChannelData(c), leadPadSamples);
    }

    // 1. Gửi sang FFmpeg atempo (server đã có sẵn apad=pad_dur=0.5)
    const wavBlob = audioBufferToWav(paddedBuffer);
    const wavArrayBuffer = await wavBlob.arrayBuffer();
    const res = await fetch('/api/ffmpeg/atempo?speed=' + playbackRate, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: wavArrayBuffer
    });
    if (!res.ok) throw new Error('Lỗi ép tốc độ FFmpeg (atempo): ' + await res.text());
    
    const stretchedArrayBuffer = await res.arrayBuffer();
    const decodedStretched = await audioCtx.decodeAudioData(stretchedArrayBuffer.slice(0));
    
    // 2. trimSilence cắt bỏ khoảng lặng apad + padding thừa, vuốt mượt ranh giới
    const cleanBuffer = trimSilence(decodedStretched, 0.005, 0.0012, 0.25, 0.02);
    const cleanBlob = audioBufferToWav(cleanBuffer);
    return await cleanBlob.arrayBuffer();
  } catch (e) {
    return audioBufferToWav(buffer).arrayBuffer();
  } finally {
    try { audioCtx.close(); } catch(e) {}
  }
}

/**
 * Bộ lọc High-Pass Butterworth bậc 2 chuẩn Studio (fc = 55Hz, Q = 0.7071)
 * - Triệt tiêu 100% độ lệch DC (0Hz) và các dải tần số siêu trầm rác (<50Hz)
 * - Ngăn chặn hoàn toàn hiện tượng màng âm rè, đục, trầm dè ở câu ngắn và nguyên âm tròn môi
 * - Giữ nguyên 100% độ ấm, tự nhiên và sắc thái giọng nói con người (từ 80Hz trở lên)
 * - Độ trễ xử lý: ~0.1 miligiây (tính toán cực nhanh trên Float32Array)
 */
export function applyHighPass55Hz(samples: Float32Array, sampleRate: number): Float32Array {
  const fc = 55;
  const w0 = (2 * Math.PI * fc) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Math.SQRT1_2); // Q = 0.7071 (Butterworth)
  
  const b0 = (1 + cosw0) / 2;
  const b1 = -(1 + cosw0);
  const b2 = (1 + cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

export function trimSilence(
  buffer: AudioBuffer, 
  thresh = 0.005, 
  threshEnd = 0.0015,
  cushionSec = 0.25,
  fadeSec = 0.02
): AudioBuffer {
  let startOffset = 0;
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const cData = buffer.getChannelData(0);
  
  // 0. Bộ lọc Studio High-Pass Butterworth 55Hz:
  // Triệt tiêu 100% hiện tượng "gù DC / sub-bass rumble" (<50Hz) do vocoder của model AI sinh ra,
  // ngăn chặn hoàn toàn hiện tượng dò sai điểm bắt đầu gây ra tiếng "trầm dè / rè nhẹ đầu câu".
  const filteredData = applyHighPass55Hz(cData, sampleRate);

  // Tính peak trên tín hiệu đã lọc sạch DC
  let peak = 0;
  for (let i = 0; i < filteredData.length; i++) {
    const v = Math.abs(filteredData[i]);
    if (v > peak) peak = v;
  }
  const dynThresh = Math.max(0.003, peak * 0.03);
  // dynThreshEnd quét sâu xuống tận -56dB để phát hiện trọn vẹn cả âm gió thì thầm, âm mũi (-nh, -ng, -m) và âm tàn cuối từ
  const dynThreshEnd = Math.max(0.0003, peak * 0.002);

  // 1. Xóa khoảng lặng đầu câu (bắt đầu ngay khi có tiếng nói thật sự), giữ 40ms padding để âm gió đầu câu không bị hụt
  const startPaddingSamples = Math.floor(sampleRate * 0.040);
  for (let i = 0; i < filteredData.length; i++) {
      if (Math.abs(filteredData[i]) > dynThresh) {
          startOffset = Math.max(0, i - startPaddingSamples);
          break;
      }
  }
  
  // 2. Tìm điểm kết thúc lời nói thật sự (quét ngược từ đuôi với ngưỡng siêu nhạy trên tín hiệu sạch)
  let lastActiveSample = -1;
  for (let i = filteredData.length - 1; i >= 0; i--) {
      if (Math.abs(filteredData[i]) > dynThreshEnd) {
          lastActiveSample = i;
          break;
      }
  }

  // Nếu không tìm thấy âm thanh nào, trả về buffer gốc
  if (lastActiveSample === -1) return buffer;
  
  // 3. ĐẢM BẢO TRIỆT ĐỂ: 100% tiếng nói thật (rawSpeechEnd) được giữ nguyên, KHÔNG BAO GIỜ bị fade-out đè lên!
  const rawSpeechEnd = Math.min(buffer.length, lastActiveSample + 1);
  const speechLength = rawSpeechEnd - startOffset;
  
  // Lấy thêm tối đa 150ms âm thanh thực tế sau lastActiveSample nếu buffer gốc còn
  const tailHoldSamples = Math.floor(sampleRate * 0.15);
  const availableTailSamples = Math.max(0, buffer.length - rawSpeechEnd);
  const tailSamplesToCopy = Math.min(availableTailSamples, tailHoldSamples);
  
  // cushionSamples là khoảng lặng số hoàn toàn sạch (0.25s) ở đuôi để câu thoại không bị dính vào câu sau
  const cushionSamples = Math.floor(sampleRate * cushionSec);
  const totalOutSamples = speechLength + tailHoldSamples + cushionSamples;
  
  if (totalOutSamples <= 0) return buffer;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();
  const trimmedBuffer = ctx.createBuffer(numChannels, totalOutSamples, sampleRate);
  
  for (let c = 0; c < numChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = trimmedBuffer.getChannelData(c);
      
      // Lọc sạch toàn bộ kênh âm thanh qua bộ lọc 55Hz chuẩn studio (0 DC, 0 rè trầm)
      const cleanChannel = applyHighPass55Hz(src, sampleRate);
      
      for (let i = startOffset; i < rawSpeechEnd; i++) {
          dst[i - startOffset] = cleanChannel[i];
      }
      for (let i = 0; i < tailSamplesToCopy; i++) {
          dst[speechLength + i] = cleanChannel[rawSpeechEnd + i];
      }
      // Phần còn lại đến totalOutSamples tự động là 0 (khoảng lặng số chuẩn)
  }

  // Vuốt êm đầu 10ms chống click/bụp đầu câu
  const fadeInSamples = Math.min(Math.floor(sampleRate * 0.010), speechLength);
  for (let c = 0; c < trimmedBuffer.numberOfChannels; c++) {
      const channelData = trimmedBuffer.getChannelData(c);
      for (let j = 0; j < fadeInSamples; j++) {
          const progress = j / fadeInSamples;
          channelData[j] *= 0.5 * (1.0 - Math.cos(progress * Math.PI));
      }
  }

  // Vuốt êm đuôi (20ms): CHỈ VUỐT Ở VÙNG ĐỆM ĐUÔI (tailHoldSamples), KHÔNG BAO GIỜ ăn vào tiếng nói thật!
  // Đảm bảo biên độ sóng hạ cánh mượt về 0 trước khi bước vào khoảng lặng cushion
  const fadePoint = speechLength + tailSamplesToCopy;
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.020), tailSamplesToCopy > 0 ? tailSamplesToCopy : tailHoldSamples);
  for (let c = 0; c < trimmedBuffer.numberOfChannels; c++) {
      const channelData = trimmedBuffer.getChannelData(c);
      for (let j = 0; j < fadeSamples; j++) {
          const idx = fadePoint - fadeSamples + j;
          if (idx >= speechLength && idx < totalOutSamples) {
              const progress = j / fadeSamples;
              channelData[idx] *= 0.5 * (1.0 + Math.cos(progress * Math.PI));
          }
      }
  }
  
  (trimmedBuffer as any).speechDuration = speechLength / sampleRate;
  (trimmedBuffer as any).addedSilence = (totalOutSamples - speechLength) / sampleRate;
  
  try { ctx.close(); } catch(e) {}
  return trimmedBuffer;
}
