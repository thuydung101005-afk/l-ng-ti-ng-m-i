import React, { useState, useRef } from 'react';
import { Upload, Play, CheckCircle, CheckCircle2, Loader2, Download, Terminal, FileText } from 'lucide-react';
import { parseSrt, generateSrt, SrtSubtitle } from '../lib/srt';
import { mergeAudioClips, audioBufferToWav, timeStretchBuffer, timeStretchBufferRubberband, timeStretchBufferPitchPreserving } from '../lib/audio';

type LogType = 'info' | 'success' | 'error' | 'warning';


interface RewriteQueueItem {
  index: number;
  cleanText: string;
  actualDuration: number;
  targetDuration: number;
  originalBuffer: ArrayBuffer | null;
  currentTextToRewrite?: string;
  finalTargetChars?: number;
  targetSpeedForRewrite?: number;
  exportIdRef?: { current: string | null };
  bestRewrite?: string;
  rewriteSuccess?: boolean;
  newArrayBuffer?: ArrayBuffer;
  rewriteAttempts?: number;
}

type RateStats = { intercept: number, slope: number, mad: number, medianDuration: number } | null;


export function useDubbingEngine() {
  const [ttsProvider, setTtsProvider] = useState<'vclip' | 'aivoices'>('vclip');
  const [aivoicesKeysStr, setAivoicesKeysStr] = useState('');
  const [apiKeysStr, setApiKeysStr] = useState('');
  const [geminiApiKeysStr, setGeminiApiKeysStr] = useState(() => {
    return localStorage.getItem('gemini_api_keys') || '';
  });

  React.useEffect(() => {
    fetch('/api/gemini/default-keys')
      .then((r) => r.json())
      .then((data) => {
        if (data?.keys) {
          setGeminiApiKeysStr((prev) => {
            if (!prev || !prev.trim()) return data.keys;
            const currentKeys = prev.split(/[\n,]+/).map((k: string) => k.trim()).filter(Boolean);
            const envKeys = (data.keys as string).split(/[\n,]+/).map((k: string) => k.trim()).filter(Boolean);
            // Đưa các key từ .env lên đầu nếu chưa có
            const combined = Array.from(new Set([...envKeys, ...currentKeys]));
            return combined.join('\n');
          });
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (geminiApiKeysStr) {
      localStorage.setItem('gemini_api_keys', geminiApiKeysStr);
    }
  }, [geminiApiKeysStr]);
  const [voiceId, setVoiceId] = useState('mhsL3CPLxmLYdSTKp3GANz');
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalSubsCount, setTotalSubsCount] = useState(0);
  const [processingProvider, setProcessingProvider] = useState<'vclip' | 'aivoices' | 'omnivoice' | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ id: string; msg: string; type: LogType }[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSrtUrl, setResultSrtUrl] = useState<string | null>(null);
  const [autoFit, setAutoFit] = useState(true);
  const [reviewItems, setReviewItems] = useState<{ original: string; shortened: string; estimatedSpeed: number }[] | null>(null);
  const [reviewQueueItems, setReviewQueueItems] = useState<any[]>([]);
  const renderQueueRef = useRef<number[]>([]);
  const handleApproveRef = useRef<((index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => void) | null>(null);
  const handleRewriteRef = useRef<((index: number, originalText: string, neededSpeed: number) => Promise<string>) | null>(null);
  const [approvedRewrites, setApprovedRewrites] = useState<Record<string, string>>({});

  const [useRubberBandStretch, setUseRubberBandStretch] = useState(true);
  const [fixedSpeed, setFixedSpeed] = useState(1.3);

  const [maxAutoFitSpeed, setMaxAutoFitSpeed] = useState(1.42);

  const [minAutoFitSpeed, setMinAutoFitSpeed] = useState(1.0);


  const [smartGroup, setSmartGroup] = useState(true);
  const [groupGap, setGroupGap] = useState(0.8);
  const [aiRewrite, setAiRewrite] = useState(true);
  const [requireReview, setRequireReview] = useState(true);
  const [concurrency, setConcurrency] = useState(2);
  const [mode, setMode] = useState<'dubbing' | 'continuous'>('continuous');
  const reportListRef = useRef<{index: number, overflow: number, gap: number, text: string}[]>([]);
  const [aivoicesList, setAivoicesList] = useState<{ voice_id: string; name: string; gender: string; region: string }[]>([]);
  const reviewResolverRef = useRef<((editedItems: any[]) => void) | null>(null);

  const RENDER_SPEED = minAutoFitSpeed;
  const NORMAL_SPEED = minAutoFitSpeed;
  const MID_RENDER_SPEED = Number(((minAutoFitSpeed + maxAutoFitSpeed) / 2).toFixed(2));
  const MID_CAP_SPEED = maxAutoFitSpeed;
  const speedStep = Math.max(0.01, (maxAutoFitSpeed - minAutoFitSpeed) / 5);
  const STRETCH_PRESETS: [number, number][] = [
    [minAutoFitSpeed, Number((minAutoFitSpeed + speedStep * 1).toFixed(2))],
    [Number((minAutoFitSpeed + speedStep * 0.5).toFixed(2)), Number((minAutoFitSpeed + speedStep * 2).toFixed(2))],
    [Number((minAutoFitSpeed + speedStep * 1).toFixed(2)), Number((minAutoFitSpeed + speedStep * 3).toFixed(2))],
    [Number((minAutoFitSpeed + speedStep * 1.5).toFixed(2)), Number((minAutoFitSpeed + speedStep * 4).toFixed(2))],
    [Number((minAutoFitSpeed + speedStep * 2).toFixed(2)), maxAutoFitSpeed]
  ];

    const ttsCache = useRef(new Map<string, ArrayBuffer>());
  const jobKeyRef = useRef<Map<string, string>>(new Map());
  const speakingRateSamplesGrouped = useRef<{words: number, duration: number}[]>([]);
  const speakingRateSamplesSingle = useRef<{words: number, duration: number}[]>([]);

  React.useEffect(() => {
    fetch('/api/aivoices/voices')
      .then(res => res.json())
      .then(data => {
        if (data && data.data && Array.isArray(data.data)) {
          const viVoices = data.data.filter((v: any) => v.language === 'vi');
          setAivoicesList(viVoices);
        }
      })
      .catch(err => console.error('Failed to fetch aivoices:', err));
  }, []);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const currentKeyIndexRef = useRef(0);
  const currentAivoicesKeyIndexRef = useRef(0);

  const getNextApiKey = () => {
    const keys = apiKeysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) return '';
    return keys[0]; // Chỉ lấy đúng 1 key mặc định đầu tiên
  };

  const getNextAivoicesKey = () => {
    const keys = aivoicesKeysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) return '';
    const idx = currentAivoicesKeyIndexRef.current % keys.length;
    currentAivoicesKeyIndexRef.current = idx + 1;
    return keys[idx];
  };

  const addLog = (msg: string, type: LogType = 'info') => {
    setLogs((prev) => {
      const newLogs = [...prev, { id: Math.random().toString(36).substring(7), msg, type }];
      return newLogs.length > 500 ? newLogs.slice(-500) : newLogs;
    });
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSrtFile(file);
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Chuẩn hóa văn bản gửi cho model TTS (OmniVoice / API ngoài)
   * - Loại bỏ hoàn toàn ký tự vô hình, zero-width space, non-breaking space
   * - Gọt sạch ngoặc kép bao quanh
   * - Gom triệt để dấu ba chấm (...) và dấu đa chấm (..) về đúng DUY NHẤT 1 dấu chấm (.)
   * - Nếu câu ĐÃ CÓ dấu kết thúc (. ? !) -> GIỮ NGUYÊN đúng 1 dấu đó, TUYỆT ĐỐI KHÔNG thêm chấm
   * - Nếu câu CHƯA CÓ dấu kết thúc -> gắn đúng duy nhất 1 dấu chấm (.)
   */
  const sanitizeTextForTTS = (rawText: string): string => {
    if (!rawText) return "";
    let text = String(rawText);
    // 1. Loại bỏ các ký tự vô hình, BOM, zero-width space, non-breaking spaces
    text = text.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').trim();
    
    // 2. Bỏ dấu ngoặc kép / đơn bao quanh câu
    text = text.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
    
    // 3. Xử lý dấu 3 chấm: ở cuối câu chuyển thành dấu chấm (.), ở giữa câu chuyển thành dấu phẩy (,)
    text = text.replace(/(?:…|\.{2,})\s*$/g, '.');
    text = text.replace(/(?:…|\.{2,})/g, ', ');
    text = text.replace(/\s*,\s*/g, ', ');
    text = text.replace(/,\s*,+/g, ', ');
    text = text.replace(/,\s*\./g, '.');
    
    // 4. Bỏ các ký tự ngắt lửng vô nghĩa ở cuối (phẩy, chấm phẩy, hai chấm, gạch ngang, ngã)
    text = text.replace(/[,;:\-–—~]+$/, '').trim();
    
    // 5. Nếu là câu có dấu phẩy: chuyển đúng chữ cái đầu tiên ngay sau dấu phẩy thành chữ thường (ví dụ: ", Cứ" -> ", cứ")
    // Triệt tiêu hoàn toàn hiện tượng rè chữ cái đầu sau dấu phẩy khi AI phát âm
    text = text.replace(/,(\s*)([^\s])/g, (_, space, char) => ',' + space + char.toLowerCase());
    
    // 6. Đảm bảo tính duy nhất của dấu kết câu (. ? !)
    if (/[.!?]$/.test(text)) {
      // Nếu đã kết thúc bằng (. ? !), gom sạch khoảng trắng/dấu thừa trước nó và giữ đúng 1 dấu
      text = text.replace(/[\s\.]*([.!?])$/, '$1');
    } else if (text.length > 0) {
      // Nếu câu chưa có dấu kết thúc, thêm đúng duy nhất 1 dấu chấm
      text += '.';
    }
    return text;
  };

  const runOmnivoiceRaw = async (text: string, speed: number, activeVoiceId: string, targetDuration?: number): Promise<ArrayBuffer> => {
    addLog(`  🚀 Đang gọi OmniVoice (Tốc độ: ${speed.toFixed(2)}x${targetDuration ? `, Ép thời lượng: ${targetDuration.toFixed(2)}s` : ''})...`, 'info');
    const cleanedText = sanitizeTextForTTS(text);
    const body: any = { 
      text: cleanedText, 
      voice_id: activeVoiceId, 
      postprocess_output: false, // TẮT postprocess nội bộ của OmniVoice để model KHÔNG tự ý xén cụt đuôi âm thanh
      pad_duration: 0.15,
      fade_duration: 0.0
    };
    if (targetDuration) {
       body.target_duration = Number(targetDuration.toFixed(2));
    } else {
       body.speed = Number(speed.toFixed(2));
    }
    const res = await fetch('/api/omnivoice/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Lỗi gọi OmniVoice API (HTTP ${res.status})`);
    return await res.arrayBuffer();
  };

  const _runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }, activeProviderParam?: string, activeVoiceIdParam?: string) => {
    const provider = activeProviderParam || ttsProvider;
    const vId = activeVoiceIdParam || voiceId;
    if (provider === 'omnivoice') {
      addLog(`  ⏳ (Tốc độ ${currentSpeed}x) Đang gọi Local OmniVoice...`, 'info');
      try {
        const res = await fetch('/api/omnivoice/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: String(text), voice_id: vId, speed: Number(currentSpeed) })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        
        const arrayBuffer = await res.arrayBuffer();
        return arrayBuffer;
      } catch (err: any) {
        addLog(`  ❌ Lỗi gọi OmniVoice: ${err.message}`, 'error');
        throw err;
      }
    }
    if (provider === 'aivoices') {
      let activeApiKey = '';
      let createRetries = 0;
      const totalKeys = aivoicesKeysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0).length;
      const maxRetries = Math.max(20, totalKeys * 2);
      let data;
      let downloadUrl = null;

      while (createRetries < maxRetries) {
        activeApiKey = getNextAivoicesKey();
        try {
          const res = await fetch('/api/aivoices/synthesize', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ voice_id: vId, script_text: String(text), speed: Number(currentSpeed), apiKey: activeApiKey })
          });
          data = await res.json();
          if (!res.ok) {
             const errMsg = data.error?.message || data.message || JSON.stringify(data);
             addLog(`  ⚠️ Key AIVoices lỗi (${errMsg}), đổi key khác...`, 'warning');
             await sleep(500);
             createRetries++;
             continue;
          }
          break;
        } catch (err: any) {
          addLog(`  ⚠️ Lỗi kết nối AIVoices (${err.message}), thử key khác...`, 'warning');
          await sleep(1000);
          createRetries++;
        }
      }

      if (createRetries >= maxRetries) {
         throw new Error(`Đã thử hết các key AIVoices nhưng không thành công.`);
      }

      const jobId = data.data.job_id;
      addLog(`  ⏳ (Tốc độ ${currentSpeed}x) Đang render audio AIVoices... (ID: ${jobId})`, 'info');
      let retries = 0;
      while (retries < 60) {
        await sleep(3000);
        const sRes = await fetch(`/api/aivoices/job/${jobId}`, {
           headers: { 'Authorization': `Bearer ${activeApiKey}` }
        });
        const sData = await sRes.json();
        if (!sRes.ok) {
           addLog(`  ⚠️ Lỗi lấy trạng thái AIVoices: ${sData.message || JSON.stringify(sData)}`, 'warning');
           retries++;
           continue;
        }
        
        const status = sData.data.status;
        if (status === 'done') {
           downloadUrl = sData.data.output_url;
           break;
        } else if (status === 'failed') {
           throw new Error(`AIVoices render thất bại: ${sData.data.error_message}`);
        }
        retries++;
      }

      if (!downloadUrl) throw new Error(`Hết thời gian chờ render trên AIVoices cho câu ${index + 1}`);

      addLog(`  📥 Đang tải audio về...`, 'info');
      
      const dlRes = await fetch('/api/proxy-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadUrl })
      });
      
      if (!dlRes.ok) throw new Error(`Lỗi tải file từ AIVoices (HTTP ${dlRes.status})`);
      const arrayBuffer = await dlRes.arrayBuffer();
      if (arrayBuffer.byteLength < 500) throw new Error(`Tệp tải về bị rỗng (${arrayBuffer.byteLength} bytes)`);
      return arrayBuffer;
    }

    const ttsPayload = {
      jsonrpc: '2.0',
      method: 'ttsLongText',
      input: {
        text: String(text),
        userVoiceId: vId,
        speed: Number(currentSpeed),
      },
      id: String(index),
    };

    let data;
    let createRetries = 0;
    let activeApiKey = '';
    const totalKeys = apiKeysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0).length;
    const maxRetries = Math.max(20, totalKeys * 2);

    while (createRetries < maxRetries) {
      if (projectExportIdRef?.current) {
        // Reuse existing export id to avoid re-creating job on network error
        activeApiKey = jobKeyRef.current.get(projectExportIdRef.current) || getNextApiKey();
        data = { result: { projectExportId: projectExportIdRef.current } };
        addLog(`  🔍 Khôi phục lại ID cũ (${projectExportIdRef.current})...`, 'info');
        break;
      }
      
      activeApiKey = getNextApiKey();
      
      try {
        const res = await fetch('/api/vclip/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: activeApiKey, payload: ttsPayload }),
        });

        data = await res.json();
        
        if (!res.ok || data.error) {

          const errMsg = data.error ? (data.error.message || JSON.stringify(data.error)) : `HTTP Error ${res.status}`;
          
          if (errMsg.includes("already have an export in progress") || errMsg.includes("export in progress")) {
             addLog(`  ⏳ Key hiện tại đang bận, đang đổi key...`, 'warning');
             await sleep(totalKeys > 1 ? 500 : 3000);
          } else {
             addLog(`  ⚠️ Key lỗi (${errMsg}), đổi key khác...`, 'warning');
             await sleep(500);
          }
          createRetries++;
          continue;
        }
        
        if (data.result?.projectExportId) {
          jobKeyRef.current.set(data.result.projectExportId, activeApiKey);
        }
        break; // Thành công
      } catch (err: any) {
        addLog(`  ⚠️ Lỗi kết nối (${err.message}), thử key khác...`, 'warning');
        await sleep(1000);
        createRetries++;
      }
    }
    
    if (createRetries >= maxRetries) {
       throw new Error(`Đã thử hết các key nhưng không thành công.`);
    }

    if (data?.error) {
      throw new Error(`Lỗi từ VClip API: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const projectExportId = data.result.projectExportId;
    if (projectExportIdRef) projectExportIdRef.current = projectExportId;
    addLog(`  ⏳ (Tốc độ ${currentSpeed}x) Đang render audio... (ID: ${projectExportId})`, 'info');

    let downloadUrl = null;
    let retries = 0;
    while (retries < 60) {
      await sleep(3000);
      const statusPayload = {
        jsonrpc: '2.0',
        method: 'getExportStatus',
        input: { projectExportId },
        id: String(index),
      };

      const sRes = await fetch('/api/vclip/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeApiKey, payload: statusPayload }),
      });

      const sData = await sRes.json();
      if (sData.error) {
         addLog(`  ⚠️ Lỗi lấy trạng thái: ${sData.error.message || JSON.stringify(sData.error)}`, 'warning');
         retries++;
         continue;
      }

      const state = sData.result?.state;
      if (state === 'completed') {
        downloadUrl = sData.result.url;
        break;
      } else if (state === 'failed') {
        throw new Error(`Render thất bại trên VClip server cho câu ${index + 1}`);
      }
      retries++;
    }

    if (!downloadUrl) throw new Error(`Hết thời gian chờ render trên VClip cho câu ${index + 1}`);

    addLog(`  📥 Đang tải audio về...`, 'info');
    
    const dlRes = await fetch('/api/proxy-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: downloadUrl })
    });
    
    if (!dlRes.ok) throw new Error(`Lỗi tải file từ VClip (HTTP ${dlRes.status})`);
    
    const arrayBuffer = await dlRes.arrayBuffer();
    if (arrayBuffer.byteLength < 500) throw new Error(`Tệp tải về bị rỗng (${arrayBuffer.byteLength} bytes)`);

    return arrayBuffer;
  };

  const runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }, forceRefetch = false, activeProviderParam?: string, activeVoiceIdParam?: string) => {
    const effProvider = activeProviderParam || ttsProvider;
    const effVoiceId = activeVoiceIdParam || voiceId;
    const normalizedText = text.replace(/\s+/g, ' ').replace(/[\.,\?!]/g, '').trim().toLowerCase();
    const cacheKey = `${normalizedText}::${currentSpeed}::${effVoiceId}::${effProvider}`;
    
    if (forceRefetch) {
       ttsCache.current.delete(cacheKey);
    } else if (ttsCache.current.has(cacheKey)) {
      addLog(`  💾 Dùng lại audio đã cache cho câu ${index + 1}, không tốn credit.`, 'info');
      return ttsCache.current.get(cacheKey)!.slice(0); // Return a copy of ArrayBuffer
    }
    
    const result = await _runTTS(text, currentSpeed, index, projectExportIdRef, effProvider, effVoiceId);
    ttsCache.current.set(cacheKey, result);
    return result.slice(0);
  };


  const saveRewrites = () => {
    if (!reviewItems) return;
    const newRewrites = { ...approvedRewrites };
    reviewItems.forEach(item => {
      newRewrites[item.original] = item.shortened;
    });
    setApprovedRewrites(newRewrites);
    setReviewItems(null);
    addLog('Đã lưu các câu rút gọn vào bộ nhớ. Bác có thể bấm Lồng tiếng ngay bây giờ!', 'success');
  };

  const startDubbing = async (overrideProvider?: 'omnivoice') => {
    const activeProvider = overrideProvider || ttsProvider;
    const activeVoiceId = overrideProvider === 'omnivoice' ? 'ngoc_huyen' : voiceId;
    speakingRateSamplesGrouped.current = [];
    speakingRateSamplesSingle.current = [];
    reportListRef.current = [];
    if (!srtFile) {
      addLog('Vui lòng chọn file SRT.', 'error');
      return;
    }
    const keys = activeProvider === 'vclip' ? apiKeysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0) : aivoicesKeysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if ((keys.length === 0 && activeProvider !== 'omnivoice') || !activeVoiceId) {
      addLog('Vui lòng nhập ít nhất 1 API Key và Voice ID.', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessingProvider(activeProvider);
    setProgress(0);
    setLogs([]);
    setResultUrl(null);

    try {
      addLog(`Đang đọc file: ${srtFile.name}...`, 'info');
      const text = await srtFile.text();
      const subs = parseSrt(text);

      if (subs.length === 0) {
        throw new Error('Không tìm thấy nội dung hợp lệ trong file SRT.');
      }

      addLog(`✅ Tìm thấy ${subs.length} câu thoại gốc. Bắt đầu phân tích...`, 'success');

      let processedSubs = subs;
      if (mode === 'continuous') {
        addLog('Chế độ đọc liền mạch: Đang ghép toàn bộ text thành 1 đoạn...', 'info');
        const fullText = processedSubs.map(sub => {
          let cleanText = sub.text.trim();
          if (cleanText.startsWith('-')) cleanText = cleanText.substring(1).trim();
          return cleanText;
        }).join('\n\n');

        addLog(`Đang gửi yêu cầu tạo audio cho văn bản dài (${fullText.length} ký tự)...`, 'info');
        
        try {
          let exportIdRef: { current: string | null } = { current: null };
          const arrayBuffer = await runTTS(fullText, NORMAL_SPEED, 0, exportIdRef, false, activeProvider, activeVoiceId);
          const finalBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
          const objectUrl = URL.createObjectURL(finalBlob);
          setResultUrl(objectUrl);
          setResultSrtUrl(null);
                if (reportListRef.current.length > 0) {
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'warning');
        addLog(`⚠️ ${reportListRef.current.length} câu chạm trần ${maxAutoFitSpeed}x, cần kiểm tra lại:`, 'warning');
        reportListRef.current.forEach(p => {
            addLog(`  • Câu ${p.index} — dư ${p.overflow.toFixed(2)}s (gap ${p.gap.toFixed(2)}s): "${p.text}"`, 'warning');
        });
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'warning');
      }

      addLog(`🎉 Hoàn thành! Bạn có thể nghe thử hoặc tải xuống bên dưới.`, 'success');
        } catch (err: any) {
          addLog(`❌ Quá trình bị lỗi: ${err.message}`, 'error');
        }
        setProgress(100);
        setIsProcessing(false);
      setProcessingProvider(null);
        return;
      }

      if (smartGroup) {
        addLog('🧠 Đang gom cụm các câu thoại gần nhau để giữ nhịp độ tự nhiên...', 'info');
        const grouped: typeof subs = [];
        let currentGroup = { ...subs[0] };

        for (let i = 1; i < subs.length; i++) {
          const sub = subs[i];
          const gap = sub.start - currentGroup.end;
          
          const isNewSpeaker = sub.text.trim().startsWith('-');
          
          if (gap <= groupGap && !isNewSpeaker) { // Khoảng cách nhỏ và không phải nhân vật mới
             currentGroup.end = sub.end;
              const lastChar = currentGroup.text.trim().slice(-1);
              const needsPunctuation = !['.', ',', '!', '?', ';', ':', '…'].includes(lastChar);
              let appended = sub.text.trim();
              if (needsPunctuation || lastChar === ',') {
                appended = appended.charAt(0).toLowerCase() + appended.slice(1);
              }
              currentGroup.text += (needsPunctuation ? ',' : '') + ' ' + appended;
          } else {
             grouped.push(currentGroup);
             currentGroup = { ...sub };
          }
        }
        grouped.push(currentGroup);
        processedSubs = grouped;
        addLog(`✨ Đã gom từ ${subs.length} dòng ngắn thành ${processedSubs.length} đoạn văn dài mượt mà.`, 'success');
      }

  // Gọi API Local GPU (bỏ mutex đơn luồng để hỗ trợ tối đa 5 luồng song song)
  async function safeRunOmnivoiceRaw(text: string, speed: number, voiceId: string, targetDuration?: number) {
      return await runOmnivoiceRaw(text, speed, voiceId, targetDuration);
  }

  const totalSubs = processedSubs.length;
    setTotalSubsCount(totalSubs);
  const audioClips: ({ buffer: ArrayBuffer; startTime: number; maxDuration?: number } | null)[] = new Array(totalSubs).fill(null);
  const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new audioContextClass();
  const applyTimeStretch = (buf: AudioBuffer, ratio: number) => timeStretchBufferRubberband(buf, ratio);
  const hasGeminiKey = geminiApiKeysStr.trim().length > 0;

  // ===== LUỒNG RIÊNG CHO OMNIVOICE (HỖ TRỢ ĐA LUỒNG TỐI ĐA 5 LUỒNG) =====
if (activeProvider === 'omnivoice') {
    const maxWorkers = Math.min(5, Math.max(1, concurrency || 1));
    addLog(`Đang chuẩn bị lồng tiếng Local (OmniVoice GPU) với ${totalSubs} câu (chạy song song ${maxWorkers} luồng)...`, 'info');
    
    // Khởi tạo hàng đợi
    renderQueueRef.current = Array.from({length: totalSubs}, (_, i) => i);
    setReviewQueueItems([]);
    let activeWorkers = 0;
    const activeIndices = new Set<number>(); // Khóa an toàn: đảm bảo các câu liền kề không bao giờ chạy đè lên nhau
    let completedCount = 0;
    let isFinished = false;
    let activeGeminiTasks = 0; // ĐẾM SỐ TÁC VỤ AI ĐANG CHẠY NGẦM
    const processedIndices = new Set<number>(); // Track indices that have been AI processed

    // Trình xử lý duyệt từ UI
    handleRewriteRef.current = async (index: number, originalText: string, neededSpeed: number) => {
        if (!hasGeminiKey) throw new Error("Chưa nhập API Key Gemini");
        const targetChars = Math.max(10, Math.floor(originalText.length * (maxAutoFitSpeed / neededSpeed) * 0.9));
        const res = await fetch('/api/gemini/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: originalText,
                targetChars: targetChars,
                previousText: "", // Bỏ context theo yêu cầu V3
                nextText: "",
                clientGeminiKeysStr: geminiApiKeysStr,
                attempt: 1
            })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = String(errData.error || "");
            if (msg.includes("401") || msg.includes("UNAUTHENTICATED") || msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
                throw new Error("Tất cả các API key đã thử đều bị Google từ chối (401 / hết hạn / chưa kích hoạt). Vui lòng dán key mới nhất vào ô 'API Key AI Rút gọn' trên giao diện!");
            }
            throw new Error(errData.error || `Lỗi gọi Gemini (HTTP ${res.status})`);
        }
        const data = await res.json();
        return data.result || originalText;
    };

    handleApproveRef.current = (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => {
        let finalStartIndex = index;
        let finalEndIndex = index;
        
        let prevIndex = index - 1;
        while (prevIndex >= 0 && !processedSubs[prevIndex].text.trim()) prevIndex--;
        
        let nextIndex = index + 1;
        while (nextIndex < processedSubs.length && !processedSubs[nextIndex].text.trim()) nextIndex++;

        if (options?.mergePrev && prevIndex >= 0) {
            finalStartIndex = prevIndex;
        }
        if (options?.mergeNext && nextIndex < processedSubs.length) {
            finalEndIndex = nextIndex;
        }
        
        if (finalEndIndex >= processedSubs.length) finalEndIndex = index;
        if (finalStartIndex < 0) finalStartIndex = index;
        
        // LƯU end time TRƯỚC KHI loop xóa (tránh bug đọc sau khi đã clear = 0)
        const savedFinalEndTime = processedSubs[finalEndIndex]?.end ?? processedSubs[index].end;
        
        // Clear all absorbed subs
        for (let idx = finalStartIndex + 1; idx <= finalEndIndex; idx++) {
            processedSubs[idx].text = "";
            processedSubs[idx].start = 0;
            processedSubs[idx].end = 0;
            audioClips[idx] = null;
            processedIndices.add(idx);
            
            // Re-assign renderQueue without these items
            let newQueue = [];
            for (let i=0; i<renderQueueRef.current.length; i++) {
                if (renderQueueRef.current[i] !== idx) newQueue.push(renderQueueRef.current[i]);
            }
            renderQueueRef.current = newQueue;
        }
        
        // Ensure finalStartIndex inherits the end time (dùng giá trị đã lưu)
        processedSubs[finalStartIndex].text = newText;
        processedSubs[finalStartIndex].end = savedFinalEndTime;
        audioClips[finalStartIndex] = null;
        processedIndices.add(finalStartIndex); 
        
        setReviewQueueItems(prev => prev.filter(item => item.index < finalStartIndex + 1 || item.index > finalEndIndex));
        setReviewQueueItems(prev => prev.filter(item => item.index !== index));
        
        if (!renderQueueRef.current.includes(finalStartIndex)) {
            renderQueueRef.current.push(finalStartIndex);
        }
        
        addLog(`  ✅ Đã duyệt câu ${index + 1}: "${newText.substring(0, 20)}...". Đang render lại...`, 'success');
        processNext();
    };

    // Hàm xử lý độc lập cho từng câu phụ đề
    const processSentence = async (i: number) => {
        const sub = processedSubs[i];
        if (!sub || !sub.text.trim()) {
            audioClips[i] = null;
            return;
        }

        let cleanText = sub.text.trim().replace(/^-/, '').trim();
        const originalClean = cleanText;
        
        // Lần theo chuỗi các bản rút gọn nếu câu này bị rút gọn nhiều lần
        let maxDepth = 10;
        while (approvedRewrites[cleanText] && maxDepth > 0) {
            cleanText = approvedRewrites[cleanText];
            maxDepth--;
        }
        
        // Bỏ ngoặc kép bao quanh nếu AI rút gọn tự ý thêm vào ("...")
        cleanText = cleanText.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
        // Chuẩn hóa dấu ba chấm: cuối câu chuyển thành dấu chấm (.), ở giữa câu chuyển thành dấu phẩy (,)
        cleanText = cleanText.replace(/(?:…|\.{2,})\s*$/g, '.');
        cleanText = cleanText.replace(/(?:…|\.{2,})/g, ', ');

        // Đảm bảo file SRT cuối cùng xuất ra khớp 100% với bản âm thanh đã rút gọn
        if (cleanText !== originalClean) {
            sub.text = cleanText;
        }
        
        // Chuẩn hóa văn bản gửi cho TTS: gom triệt để các dấu chấm kép/ba chấm và đảm bảo kết thúc bằng đúng 1 dấu duy nhất
        let ttsCleanText = sanitizeTextForTTS(cleanText);
        
        if (!ttsCleanText.replace(/[,.;:!\?]/g, '').trim()) {
            addLog(`  ⚠️ Bỏ qua câu ${i+1} vì chỉ chứa dấu câu.`, 'warning');
            audioClips[i] = null;
            return;
        }
        
        let targetDuration = sub.end - sub.start;
        let gap = 0;
        if (i < totalSubs - 1) {
            let nextValidIdx = i + 1;
            while (nextValidIdx < totalSubs && !processedSubs[nextValidIdx].text.trim()) {
                nextValidIdx++;
            }
            if (nextValidIdx < totalSubs) {
                const nextValidSub = processedSubs[nextValidIdx];
                gap = Math.max(0, nextValidSub.start - sub.end);
                if (sub.start + targetDuration > nextValidSub.start) {
                    targetDuration = nextValidSub.start - sub.start;
                    gap = 0;
                }
            }
        }
        if (targetDuration <= 0) targetDuration = 0.1;
        
        addLog(`[${i+1}/${totalSubs}] Đang render...`, 'info');

        try {
            const effectiveDuration = targetDuration + gap;
            // @ts-ignore
            const { trimSilence } = await import('../lib/audio');
            
            // Render ở tốc độ 1.0x chuẩn để đo đạc thời gian gốc xác thực nhất
            let rawBuffer = await safeRunOmnivoiceRaw(ttsCleanText, 1.0, activeVoiceId);
            let decoded1x: AudioBuffer = await audioCtx.decodeAudioData(rawBuffer.slice(0));
            decoded1x = trimSilence(decoded1x);

            // Helper: Ép tốc độ qua FFmpeg atempo (FFmpeg tự flush buffer chuẩn, không cần bơm 2s mồi hay gọt lại)
            const stretchAndTrim = async (audioBuf: AudioBuffer, speed: number): Promise<ArrayBuffer> => {
                return await timeStretchBufferRubberband(audioBuf, speed);
            };

            // Tính thời lượng tiếng nói thực tế bằng cách TRỪ ĐI khoảng lặng đệm (chống cụt âm) được thêm vào cho hàm tăng tốc
            const addedSilence = (decoded1x as any).addedSilence || 0;
            let actualDuration1x = (decoded1x as any).speechDuration || Math.max(0.1, decoded1x.duration - addedSilence);
            // neededSpeed giờ đây là tốc độ TỰ NHIÊN chuẩn xác so với khung hình (không bị đội lên do khoảng lặng đệm)
            let neededSpeed = actualDuration1x / effectiveDuration;
            
            // NẾU MODEL SINH RA QUÁ DÀI (câu quá dài so với slot) -> ĐẨY VÀO AI REVIEW
            if (neededSpeed > maxAutoFitSpeed && aiRewrite && hasGeminiKey) {
                
                let nextValidIdx = i + 1;
                while (nextValidIdx < totalSubs && !processedSubs[nextValidIdx].text.trim()) nextValidIdx++;
                
                const endsWithComma = cleanText.trim().endsWith(',') || cleanText.trim().endsWith(';');
                const nextSubStart = nextValidIdx < totalSubs ? processedSubs[nextValidIdx].start : Infinity;
                const gapToNext = nextSubStart - sub.end;
                
                if (endsWithComma && gapToNext >= 0 && gapToNext <= Math.max(0.2, groupGap)) {
                     const nextSub = processedSubs[nextValidIdx];
                     addLog(`  🔄 Auto-Merge: Câu ${i+1} lố tốc độ & có dấu ngắt, tự động gộp với câu ${nextValidIdx+1}!`, 'success');
                     
                     let t1 = sub.text.trim();
                     let t2 = nextSub.text.trim();
                      const lastCharT1 = t1.slice(-1);
                      const hasPunct = [',', '.', '!', '?', ';', ':'].includes(lastCharT1);
                      if (lastCharT1 === ',' || !hasPunct) {
                        t2 = t2.charAt(0).toLowerCase() + t2.slice(1);
                      }
                      sub.text = t1 + (hasPunct ? ' ' : ', ') + t2;
                     sub.end = nextSub.end;
                     nextSub.text = ""; // Đánh dấu đã gộp nội dung vào câu trước, giữ nguyên mốc thời gian
                     audioClips[nextValidIdx] = null;
                     
                     // Loại bỏ câu tiếp theo khỏi hàng đợi vì đã được gộp
                     renderQueueRef.current = renderQueueRef.current.filter(idx => idx !== nextValidIdx);
                     renderQueueRef.current.unshift(i);
                     return;
                }
                
                if (requireReview) {
                    let prevText = "";
                    let nextText = "";
                    let prevIdx = i - 1;
                    while (prevIdx >= 0 && !processedSubs[prevIdx].text.trim()) prevIdx--;
                    if (prevIdx >= 0) prevText = processedSubs[prevIdx].text.trim();
                    if (nextValidIdx < totalSubs) nextText = processedSubs[nextValidIdx].text.trim();

                    setReviewQueueItems(prev => [...prev, {
                        index: i,
                        original: cleanText,
                        shortened: cleanText,
                        neededSpeed: neededSpeed,
                        prevText: prevText,
                        nextText: nextText,
                        // Timing info
                        subStart: sub.start,
                        subEnd: sub.end,
                        effectiveDuration: effectiveDuration,
                        actualDuration1x: actualDuration1x,
                        prevStart: prevIdx >= 0 ? processedSubs[prevIdx].start : undefined,
                        prevEnd: prevIdx >= 0 ? processedSubs[prevIdx].end : undefined,
                        nextStart: nextValidIdx < totalSubs ? processedSubs[nextValidIdx].start : undefined,
                        nextEnd: nextValidIdx < totalSubs ? processedSubs[nextValidIdx].end : undefined,
                    }]);
                    addLog(`  ⚠️ Câu ${i + 1} lố tốc độ (${neededSpeed.toFixed(2)}x | Giọng đọc ${actualDuration1x.toFixed(2)}s / Khung ${(sub.end - sub.start).toFixed(2)}s + gap ${gap.toFixed(2)}s). Đẩy xuống khu vực duyệt!`, 'warning');
                    return;
                } else if (!processedIndices.has(i)) {
                    // Chế độ Auto-Pilot: Tự động rút gọn qua Gemini không cần bấm duyệt thủ công
                    addLog(`  🤖 Auto-Pilot: Đang gọi AI rút gọn câu ${i + 1} (cần ${neededSpeed.toFixed(2)}x)...`, 'info');
                    try {
                        if (handleRewriteRef.current) {
                            const rewritten = await handleRewriteRef.current(i, cleanText, neededSpeed);
                            if (rewritten && rewritten.trim() !== cleanText.trim()) {
                                const sanitizedRewritten = sanitizeTextForTTS(rewritten.trim());
                                addLog(`  ✨ AI đã rút gọn câu ${i + 1}: "${sanitizedRewritten}"`, 'success');
                                approvedRewrites[cleanText] = sanitizedRewritten;
                                sub.text = sanitizedRewritten;
                                processedIndices.add(i);
                                renderQueueRef.current.unshift(i);
                                return;
                            }
                        }
                    } catch (err: any) {
                        addLog(`  ⚠️ Lỗi AI rút gọn câu ${i + 1}: ${err.message}. Tiếp tục xử lý bằng ép tốc độ.`, 'warning');
                    }
                }
            }
            
            let finalBuffer = await audioBufferToWav(decoded1x).arrayBuffer();
            
            if (neededSpeed <= minAutoFitSpeed) {
                addLog(`  ✅ Câu ${i + 1}: Thừa thời gian, áp dụng tốc độ Min (${minAutoFitSpeed}x)`, 'info');
                if (minAutoFitSpeed !== 1.0) {
                    if (useRubberBandStretch) {
                         finalBuffer = await stretchAndTrim(decoded1x, minAutoFitSpeed);
                    } else {
                         addLog(`  ⚠️ Đang tắt Rubber Band. Giữ nguyên bản 1.0x gốc!`, 'warning');
                    }
                }
            } else if (neededSpeed <= maxAutoFitSpeed) {
                addLog(`  ✅ Câu ${i + 1}: Thiếu thời gian, ép tốc độ lên (${neededSpeed.toFixed(2)}x)...`, 'info');
                if (useRubberBandStretch) {
                     finalBuffer = await stretchAndTrim(decoded1x, neededSpeed);
                } else {
                     addLog(`  ⚠️ Đang tắt Rubber Band. Giữ nguyên bản 1.0x gốc (âm thanh sẽ lấn sang câu sau!)`, 'warning');
                }
            } else {
                // Safety-net: câu đã được user duyệt (processedIndices) nhưng vẫn lố → ép Max.
                addLog(`  ⚠️ Câu ${i + 1}: Vẫn lố (${neededSpeed.toFixed(2)}x) sau khi duyệt, ép Max (${maxAutoFitSpeed}x).`, 'warning');
                if (useRubberBandStretch) {
                     finalBuffer = await stretchAndTrim(decoded1x, maxAutoFitSpeed);
                }
            }
            
            audioClips[i] = { buffer: finalBuffer, startTime: sub.start, maxDuration: sub.end + gap };
            completedCount++;
            setProgress(Math.round((completedCount / totalSubs) * 90));
            
        } catch (e: any) {
            addLog(`  ❌ Lỗi render câu ${i+1}: ${e.message}`, 'error');
        }
    };

    // Hàm điều phối worker pool song song (tối đa 5 luồng)
    const processNext = () => {
        if (renderQueueRef.current.length === 0) {
            if (activeWorkers === 0) {
                checkCompletion();
            }
            return;
        }

        while (activeWorkers < maxWorkers && renderQueueRef.current.length > 0) {
            // An toàn đa luồng: Tuyệt đối không cho 2 câu liền kề (idx và idx±1) chạy cùng lúc
            // để tránh race condition khi câu trước mượn gap hoặc tự động gộp (auto-merge) với câu sau!
            const candidateQueueIdx = renderQueueRef.current.findIndex(idx => {
                return !activeIndices.has(idx - 1) && !activeIndices.has(idx + 1);
            });

            if (candidateQueueIdx === -1) {
                // Các câu còn lại đều đang kề cạnh các câu đang chạy, tạm dừng chờ worker hiện tại trả khóa
                break;
            }

            const nextIdx = renderQueueRef.current.splice(candidateQueueIdx, 1)[0];
            activeIndices.add(nextIdx);
            activeWorkers++;

            (async (idx: number) => {
                try {
                    await processSentence(idx);
                } catch (err: any) {
                    addLog(`  ❌ Lỗi xử lý câu ${idx + 1}: ${err.message}`, 'error');
                } finally {
                    activeIndices.delete(idx);
                    activeWorkers--;
                    if (renderQueueRef.current.length > 0) {
                        processNext();
                    } else if (activeWorkers === 0) {
                        checkCompletion();
                    }
                }
            })(nextIdx);
        }
    };

    const checkCompletion = async () => {
        // Để hoàn thành: Hàng đợi rỗng + Không còn worker nào đang chạy + Bảng duyệt rỗng + Không có tác vụ AI ngầm
        setReviewQueueItems(prev => {
            if (renderQueueRef.current.length === 0 && activeWorkers === 0 && activeGeminiTasks === 0) {
                if (prev.length === 0) {
                    if (!isFinished) {
                        isFinished = true;
                        // Phải dùng setTimeout để thoát khỏi React State Callback, tránh lỗi White Screen (Crash)
                        setTimeout(() => finishDubbing(), 0);
                    }
                } else {
                    // Tránh gọi setLogs (addLog) bên trong setReviewQueueItems
                    setTimeout(() => addLog(`⏳ Đang đợi người dùng duyệt ${prev.length} câu còn lại...`, 'info'), 0);
                }
            }
            return prev;
        });
    };

    const finishDubbing = async () => {
        const validAudioClips = audioClips.filter((clip, idx) => clip !== null && processedSubs[idx] && processedSubs[idx].text.trim() !== "") as { buffer: ArrayBuffer; startTime: number }[];
        addLog('✨ Đang ghép các track vào file tổng hợp...', 'warning');
        const finalBlob = await mergeAudioClips(validAudioClips);
        setResultUrl(URL.createObjectURL(finalBlob));
        setProgress(100);
        const updatedSrtText = generateSrt(processedSubs);
        setResultSrtUrl(URL.createObjectURL(new Blob([updatedSrtText], { type: 'text/plain' })));
        addLog('🎉 Hoàn thành!', 'success');
        setIsProcessing(false);
        try { audioCtx.close(); } catch(e) {}
    };

    // Bắt đầu nhào vô chạy
    processNext();
    return;
}
// ===== HẾT LUỒNG RIÊNG OMNIVOICE =====


        const concurrencyLimit = concurrency;
      
      let completedInitial = 0;
      let completedRewrite = 0;
      const updateProgress = (initial: number, rewrite: number, queueLen: number) => {
        let p = 0;
        if (queueLen === 0) {
          p = (initial / totalSubs) * 90;
        } else {
          p = (initial / totalSubs) * 50 + (rewrite / queueLen) * 40;
        }
        setProgress(Math.round(p));
      };
      // Hàng đợi 2: Các câu cần AI rewrite
      const rewriteQueue: RewriteQueueItem[] = [];

      // --- Giai đoạn triage: phân loại câu an toàn / chưa an toàn ---
      const IMMEDIATE_SAFE_MIN_WORDS = 6;
      const IMMEDIATE_SAFE_FACTOR = 1.6;
      const MIN_FIXED_OVERHEAD = 0.3; 
      const MIN_SEC_PER_WORD_AT_MAX_SPEED = 0.15;

      const isStructurallySafe = (wordCount: number, targetDuration: number) => {
        if (wordCount < IMMEDIATE_SAFE_MIN_WORDS) return false;
        const worstCaseMinDuration = MIN_FIXED_OVERHEAD + wordCount * MIN_SEC_PER_WORD_AT_MAX_SPEED;
        return targetDuration >= worstCaseMinDuration * IMMEDIATE_SAFE_FACTOR;
      };

      const immediateIndices: number[] = [];
      const deferredIndices: number[] = [];

      for (let i = 0; i < totalSubs; i++) {
        const sub = processedSubs[i];
        let cleanText = sub.text.trim();
        if (cleanText.startsWith('-')) cleanText = cleanText.substring(1).trim();
        const wordCount = cleanText.trim().split(/\s+/).length;

        let targetDuration = sub.end - sub.start;
        if (i < totalSubs - 1) {
          const nextSub = processedSubs[i + 1];
          if (sub.start + targetDuration > nextSub.start) targetDuration = nextSub.start - sub.start;
        }
        if (targetDuration <= 0) targetDuration = 0.1;

        if (isStructurallySafe(wordCount, targetDuration)) {
          immediateIndices.push(i);
        } else {
          deferredIndices.push(i);
        }
      }

      addLog(`🧭 Phân loại: ${immediateIndices.length} câu xử lý ngay (an toàn), ${deferredIndices.length} câu hoãn lại chờ đủ dữ liệu.`, 'info');

      // ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----
              const WINDOW_SIZE = 15;
              const getRegression = (samples: {words: number, duration: number}[]) => {
                if (samples.length < 5) return null;
                const recent = samples.slice(-WINDOW_SIZE);
                const slopes: number[] = [];
                for (let j = 0; j < recent.length; j++) {
                  for (let k = j + 1; k < recent.length; k++) {
                    const dx = recent[k].words - recent[j].words;
                    const dy = recent[k].duration - recent[j].duration;
                    if (dx !== 0) {
                      slopes.push(dy / dx);
                    }
                  }
                }
                if (slopes.length === 0) return null;
                slopes.sort((a, b) => a - b);
                const slope = slopes[Math.floor(slopes.length / 2)];

                const intercepts = recent.map(p => p.duration - slope * p.words).sort((a, b) => a - b);
                const intercept = intercepts[Math.floor(intercepts.length / 2)];

                const residuals = recent.map(p => Math.abs(p.duration - (intercept + slope * p.words))).sort((a, b) => a - b);
                const mad = residuals[Math.floor(residuals.length / 2)];
                const medianDuration = recent.map(p => p.duration).sort((a, b) => a - b)[Math.floor(recent.length / 2)];

                return { intercept, slope, mad, medianDuration };
              };

      const makeQueueProcessor = (indexList: number[]) => {
        let cursor = 0;
        return async (): Promise<void> => {
          while (cursor < indexList.length) {
            const i = indexList[cursor++];
          const sub = processedSubs[i];
          addLog(`[${i + 1}/${totalSubs}] Đang xử lý: "${sub.text.length > 40 ? sub.text.substring(0, 40) + '...' : sub.text}"`, 'info');

          let cleanText = sub.text.trim();
          if (cleanText.startsWith('-')) {
             cleanText = cleanText.substring(1).trim();
          }

          if (!cleanText) {
             addLog(`  ⚠️ Bỏ qua câu ${i + 1} do nội dung trống.`, 'info');
             updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
             continue;
          }

          let sentenceSuccess = false;
          let sentenceAttempts = 0;
          let exportIdRef: { current: string | null } = { current: null };
          let forceRefetch = false;
          while (!sentenceSuccess) {
            sentenceAttempts++;
            if (sentenceAttempts > 3) {
                addLog(`  ❌ Quá nhiều lỗi cho câu ${i + 1}, bỏ qua.`, 'error');
                sentenceSuccess = true;
                updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                continue;
            }
            try {
              let targetDuration = sub.end - sub.start;
              let borrowedGap = 0;
              if (i < totalSubs - 1) {
                 const nextSub = processedSubs[i+1];
                 if (sub.start + targetDuration > nextSub.start) {
                    // Câu chồng lên câu tiếp theo: thu nhỏ targetDuration
                    targetDuration = nextSub.start - sub.start;
                    borrowedGap = 0;
                 } else {
                    // Mượn gap: cho phép audio tràn vào khoảng trống giữa 2 câu
                    borrowedGap = Math.max(0, nextSub.start - sub.end);
                 }
              }
              if (targetDuration <= 0) targetDuration = 0.1;
              const effectiveDuration = targetDuration + borrowedGap;

              if (!aiRewrite) {
                  // --- SỬ DỤNG TRỰC TIẾP minAutoFitSpeed VÀ maxAutoFitSpeed TỪ GIAO DIỆN ---
                  // Bước 1: Render thử ở minAutoFitSpeed (chuẩn giao diện)
                  let renderSpeed1 = minAutoFitSpeed;
                  let exportIdRef1: { current: string | null } = { current: null };
                  let buffer1 = await runTTS(cleanText, renderSpeed1, i, exportIdRef1, forceRefetch, activeProvider, activeVoiceId);
                  forceRefetch = false;
                  let decoded1 = await audioCtx.decodeAudioData(buffer1.slice(0));
                  let rawDuration = decoded1.duration;

                  // Bước 2: Tính tốc độ cần thiết (có tính gap mượn)
                  let neededSpeed = (rawDuration * renderSpeed1) / effectiveDuration;
                  let finalBuffer: ArrayBuffer;

                  // Bước 3: Phân nhánh theo ngưỡng người dùng cài đặt
                  if (neededSpeed <= minAutoFitSpeed) {
                      // Nhánh A: Thừa thời gian -> giữ nguyên tốc độ Min
                      finalBuffer = buffer1;
                      addLog(`  ✅ Câu ${i + 1} (Nhánh A): Cần ${neededSpeed.toFixed(2)}x <= Min (${minAutoFitSpeed}x). Giữ nguyên tốc độ Min.`, 'success');
                  } else if (neededSpeed <= maxAutoFitSpeed) {
                      // Nhánh B: Trong dải cho phép -> ép tốc độ vừa khít
                      finalBuffer = await applyTimeStretch(decoded1, neededSpeed / renderSpeed1);
                      addLog(`  ✅ Câu ${i + 1} (Nhánh B): Cần ${neededSpeed.toFixed(2)}x. Ép từ ${renderSpeed1}x -> ${neededSpeed.toFixed(2)}x.`, 'success');
                  } else {
                      // Nhánh C
                      let gap = 0.3;
                      if (i < totalSubs - 1) {
                          gap = processedSubs[i+1].start - (sub.start + targetDuration);
                          if (gap < 0) gap = 0;
                      }
                      
                      let neededSpeedWithGap = (rawDuration * renderSpeed1) / (targetDuration + gap);
                      if (neededSpeedWithGap <= maxAutoFitSpeed) {
                          finalBuffer = await applyTimeStretch(decoded1, neededSpeedWithGap / renderSpeed1);
                          addLog(`  ✅ Câu ${i + 1} (Nhánh C): Mượn gap (${gap.toFixed(2)}s), ép tốc độ ${neededSpeedWithGap.toFixed(2)}x (<= Max ${maxAutoFitSpeed}x).`, 'success');
                      } else {
                          if (hasGeminiKey) {
                              rewriteQueue.push({
                                  index: i,
                                  cleanText,
                                  actualDuration: rawDuration * (renderSpeed1 / minAutoFitSpeed),
                                  targetDuration: targetDuration + gap,
                                  originalBuffer: null as any
                              });
                              addLog(`  🔮 Câu ${i + 1} cần ${neededSpeedWithGap.toFixed(2)}x vượt trần Max (${maxAutoFitSpeed}x). Đưa vào hàng đợi AI rút gọn.`, 'warning');
                              sentenceSuccess = true;
                              updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                              continue; // Skip setting audioClips[i]
                          } else {
                              finalBuffer = await applyTimeStretch(decoded1, maxAutoFitSpeed / renderSpeed1);
                              addLog(`  ⚠️ Câu ${i + 1} vượt trần Max (${maxAutoFitSpeed}x) nhưng không có key AI. Ép tối đa về ${maxAutoFitSpeed}x.`, 'warning');
                              reportListRef.current.push({ index: i+1, overflow: ((rawDuration*renderSpeed1)/maxAutoFitSpeed)-(targetDuration+gap), gap, text: cleanText });
                          }
                      }
                  }

                  audioClips[i] = { buffer: finalBuffer, startTime: sub.start, maxDuration: sub.end + borrowedGap };
                  sentenceSuccess = true;
                  updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);

              } else {
                  // ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----

const isGroupedSentence = smartGroup && sub.text.includes(', ');
              const rateSamplesRef = isGroupedSentence ? speakingRateSamplesGrouped : speakingRateSamplesSingle;
              const wordCount = cleanText.trim().split(/\s+/).length;
              
              const ownStats: RateStats = getRegression(rateSamplesRef.current);
              const rateStats = ownStats ?? getRegression([...speakingRateSamplesGrouped.current, ...speakingRateSamplesSingle.current]);

              let bestPreset: [number, number] | null = null;
              
              const worstCaseMinDuration = MIN_FIXED_OVERHEAD + wordCount * MIN_SEC_PER_WORD_AT_MAX_SPEED;
              const isTight = targetDuration < worstCaseMinDuration * IMMEDIATE_SAFE_FACTOR;

              if (wordCount < IMMEDIATE_SAFE_MIN_WORDS && isTight) {
                 bestPreset = [MID_RENDER_SPEED, MID_CAP_SPEED];
                 addLog(`  ⚡ Câu ${i + 1} ngắn và khung thời gian chật (${targetDuration.toFixed(2)}s). Dự đoán mức cao nhất (${MID_CAP_SPEED}x).`, 'info');
              } else if (autoFit && rateStats) {
                 const { intercept, slope, mad, medianDuration } = rateStats;
                 const estimatedDuration = Math.max(0.2, intercept + slope * wordCount);
                 const estimatedSpeedNeeded = NORMAL_SPEED * (estimatedDuration / targetDuration);

                 addLog(`  🧪 DEBUG: Câu ${i+1} estimatedSpeedNeeded=${estimatedSpeedNeeded.toFixed(2)}, intercept=${intercept.toFixed(2)}, slope=${slope.toFixed(2)}, samples=${rateSamplesRef.current.length}`, 'info');

                 const noiseRatio = medianDuration > 0 ? mad / medianDuration : 0;
                 const margin = 1.15 + Math.min(noiseRatio * 2, 0.3);
                 
                 const upperBoundEstimate = estimatedSpeedNeeded * (1 + Math.min(noiseRatio, 0.25));

                 if (aiRewrite && estimatedSpeedNeeded > MID_CAP_SPEED) {
                     addLog(`  🔮 Câu ${i + 1} dự đoán quá dài (~${estimatedSpeedNeeded.toFixed(1)}x, vượt trần ${MID_CAP_SPEED}x). Bỏ qua render thử.`, 'warning');
                     rewriteQueue.push({ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any });
                     sentenceSuccess = true;
                     updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                     continue;
                 } else {
                     for (const preset of STRETCH_PRESETS) {
                         if (preset[1] >= upperBoundEstimate) {
                             bestPreset = preset;
                             break;
                         }
                     }
                     if (!bestPreset) {
                         bestPreset = [MID_RENDER_SPEED, MID_CAP_SPEED];
                     }
                     if (bestPreset[0] > RENDER_SPEED) {
                         addLog(`  🔮 Câu ${i + 1} dự đoán cần tăng tốc (upper bound ~${upperBoundEstimate.toFixed(1)}x). Chọn preset ${bestPreset[0]}x → ${bestPreset[1]}x.`, 'info');
                     }
                 }
              }

              if (!bestPreset) bestPreset = [RENDER_SPEED, NORMAL_SPEED];
              let [renderSpeedToUse, targetSpeedToUse] = bestPreset;

              // ---- Render 1 lần ở renderSpeedToUse ----
              let arrayBuffer = await runTTS(cleanText, renderSpeedToUse, i, exportIdRef, forceRefetch, activeProvider, activeVoiceId);
              forceRefetch = false;

              let decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
              let rawDuration = decoded.duration;

              // Tính xem thực tế cần bao nhiêu để vừa khung
              let actualNeededSpeed = (rawDuration * renderSpeedToUse) / effectiveDuration;

              if (autoFit && actualNeededSpeed > targetSpeedToUse) {
                  // Tìm preset cao hơn để đáp ứng tốc độ cần thiết
                  let bestNewPreset: [number, number] | null = null;
                  for (const preset of STRETCH_PRESETS) {
                      if (preset[1] >= actualNeededSpeed && preset[1] <= MID_CAP_SPEED) {
                          bestNewPreset = preset;
                          break;
                      }
                  }

                  if (bestNewPreset && bestNewPreset[0] > renderSpeedToUse) {
                      addLog(`  ⚡ Câu ${i+1} thực tế cần ~${actualNeededSpeed.toFixed(2)}x. Render lại ở mức ${bestNewPreset[0]}x để ép lên ${bestNewPreset[1]}x (giữ đúng khoảng cách 0.15).`, 'info');
                      
                      renderSpeedToUse = bestNewPreset[0];
                      targetSpeedToUse = bestNewPreset[1];
                      
                      // Render lại để lấy audio ở tốc độ mới
                      let exportIdRefNew: { current: string | null } = { current: null };
                      arrayBuffer = await runTTS(cleanText, renderSpeedToUse, i, exportIdRefNew, forceRefetch, activeProvider, activeVoiceId);
                      decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
                      rawDuration = decoded.duration;
                      
                      // Tính lại (chủ yếu để report, logic ở dưới tự đưa vào queue AI nếu vẫn dài)
                      actualNeededSpeed = (rawDuration * renderSpeedToUse) / targetDuration;
                  } else if (!bestNewPreset && actualNeededSpeed > MID_CAP_SPEED) {
                      // Vượt quá preset lớn nhất (1.8x)
                      targetSpeedToUse = MID_CAP_SPEED;
                      addLog(`  ⚠️ Câu ${i+1} cần tốc độ > ${MID_CAP_SPEED}x. Ép về ${MID_CAP_SPEED}x và xem xét AI.`, 'warning');
                  }
              }

              const finalDuration = rawDuration * (renderSpeedToUse / targetSpeedToUse);
              if (finalDuration > effectiveDuration + 0.05 && aiRewrite) {
                   const stretchedBuffer = await applyTimeStretch(decoded, targetSpeedToUse / renderSpeedToUse);
                   // Store actualDuration converted to NORMAL_SPEED scale for AI rewrite logic
                   rewriteQueue.push({ index: i, cleanText, actualDuration: rawDuration * (renderSpeedToUse / NORMAL_SPEED), targetDuration: effectiveDuration, originalBuffer: stretchedBuffer });
                   addLog(`  ⚠️ Câu ${i + 1} vẫn dài hơn khung dù ở mức ${targetSpeedToUse}x. Đưa vào hàng đợi AI rút gọn.`, 'warning');
              } else {
                   // Update regression model ONLY when we keep the audio
                   let normalizedDurationForSample = rawDuration * (renderSpeedToUse / NORMAL_SPEED);
                   const existingReg = getRegression(rateSamplesRef.current);
                   if (!existingReg) {
                       rateSamplesRef.current.push({ words: wordCount, duration: normalizedDurationForSample });
                   } else {
                       const expected = Math.max(0.2, existingReg.intercept + existingReg.slope * wordCount);
                       if (Math.abs(normalizedDurationForSample - expected) / expected < 0.5) {
                           rateSamplesRef.current.push({ words: wordCount, duration: normalizedDurationForSample });
                       }
                   }

                   const finalBuffer = await applyTimeStretch(decoded, targetSpeedToUse / renderSpeedToUse);
                   audioClips[i] = { buffer: finalBuffer, startTime: sub.start, maxDuration: sub.end + borrowedGap };
                   addLog(`  ✅ Câu ${i + 1} hoàn tất ở mức cố định ${targetSpeedToUse}x`, 'success');
              }
              sentenceSuccess = true;
                  updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
              }
            } catch (err: any) {
               forceRefetch = true;
               addLog(`  ⚠️ Lỗi câu ${i + 1} (lần ${sentenceAttempts}): ${err.message}. Đang thử lại sau 2s...`, 'error');
               await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      };
      };

      const processRewriteQueue = async (): Promise<void> => {
        let processingQueue = [...rewriteQueue];

        while (processingQueue.length > 0) {
            const chunk = processingQueue.splice(0, 10);
            addLog(`  ⚠️ Hàng đợi AI: Gửi nhóm ${chunk.length} câu để rút gọn...`, 'warning');

            const itemsPayload = chunk.map(item => {
                let previousText = "";
                if (item.index > 0) {
                    const isPrevInChunk = chunk.some(x => x.index === item.index - 1);
                    if (!isPrevInChunk) {
                        let prevSubText = processedSubs[item.index-1].text.trim();
                        if (prevSubText.startsWith('-')) prevSubText = prevSubText.substring(1).trim();
                        previousText = prevSubText;
                    }
                }
                let nextText = "";
                if (item.index < totalSubs - 1) {
                    const isNextInChunk = chunk.some(x => x.index === item.index + 1);
                    if (!isNextInChunk) {
                        let nextSubText = processedSubs[item.index+1].text.trim();
                        if (nextSubText.startsWith('-')) nextSubText = nextSubText.substring(1).trim();
                        nextText = nextSubText;
                    }
                }

                if (!item.currentTextToRewrite) item.currentTextToRewrite = item.cleanText;

                let currentChars = item.currentTextToRewrite.length;
                let targetSpeedForRewrite = maxAutoFitSpeed;
                let ratio = item.targetDuration / (item.actualDuration * (minAutoFitSpeed / targetSpeedForRewrite));
                let targetChars = Math.floor(currentChars * ratio);

                if (!item.finalTargetChars) {
                    const isPredicted = item.originalBuffer === null;
                    const safetyMargin = isPredicted ? 0.10 : 0.05;
                    item.finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * safetyMargin));
                }
                item.targetSpeedForRewrite = targetSpeedForRewrite;

                return {
                    id: item.index,
                    text: item.currentTextToRewrite,
                    targetChars: item.finalTargetChars,
                    targetDuration: item.targetDuration,
                    targetSpeed: targetSpeedForRewrite,
                    previousText,
                    nextText
                };
            });

            try {
                const res = await fetch('/api/gemini/rewrite-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: itemsPayload, clientGeminiKeysStr: geminiApiKeysStr })
                });

                if (res.ok) {
                    const data = await res.json();
                    const results = data.result;

                    for (let k = 0; k < chunk.length; k++) {
                        const item = chunk[k];
                        const rewritten = results[k]?.result || item.currentTextToRewrite;
                        item.bestRewrite = rewritten;

                        item.exportIdRef = item.exportIdRef || { current: null };
                        let testBuffer = await runTTS(rewritten, minAutoFitSpeed, item.index, item.exportIdRef, false, activeProvider, activeVoiceId);
                        let testDecoded = await audioCtx.decodeAudioData(testBuffer.slice(0));
                        const rewriteStretchRatio = (item.targetSpeedForRewrite || maxAutoFitSpeed) / minAutoFitSpeed;
                        testBuffer = await applyTimeStretch(testDecoded, rewriteStretchRatio);

                        item.newArrayBuffer = testBuffer;
                        item.rewriteSuccess = true;
                        addLog(`  💡 Câu ${item.index + 1} rút gọn thành công: "${rewritten}" (render ${minAutoFitSpeed}→${(item.targetSpeedForRewrite || maxAutoFitSpeed).toFixed(2)}x)`, 'success');
                    }
                } else {
                    throw new Error("HTTP " + res.status);
                }
            } catch (err: any) {
                addLog(`  ❌ Lỗi gọi AI rút gọn nhóm: ${err.message}.`, 'error');
                for (const item of chunk) {
                    if (item.rewriteSuccess) continue;
                    
                    item.rewriteAttempts = (item.rewriteAttempts || 0) + 1;
                    if (item.rewriteAttempts < 3) {
                        addLog(`  🔄 Câu ${item.index + 1} sẽ được thử lại (Lần ${item.rewriteAttempts}/3)`, 'info');
                        processingQueue.push(item);
                    } else {
                        addLog(`  ❌ Câu ${item.index + 1} đã hết lượt thử rút gọn. Đang dùng audio gốc.`, 'error');
                        item.rewriteSuccess = false;
                    }
                }
                if (processingQueue.length > 0) {
                     await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        for (const item of rewriteQueue) {
           const sub = processedSubs[item.index];
           if (!item.rewriteSuccess) {
               addLog(`  ⚠️ Câu ${item.index + 1} rút gọn thất bại. Ép audio gốc về tốc độ trần (render ${minAutoFitSpeed}x, stretch ${maxAutoFitSpeed}x).`, 'warning');
               let exportIdRef: { current: string | null } = { current: null };
               const fallbackBuffer = await runTTS(item.cleanText, minAutoFitSpeed, item.index, exportIdRef, false, activeProvider, activeVoiceId);
               const fallbackDecoded = await audioCtx.decodeAudioData(fallbackBuffer.slice(0));
               item.newArrayBuffer = await applyTimeStretch(fallbackDecoded, maxAutoFitSpeed / minAutoFitSpeed);
           }

           const prefix = sub.text.trim().startsWith('-') ? '- ' : '';
           sub.text = prefix + (item.bestRewrite || item.cleanText);

           audioClips[item.index] = { buffer: item.newArrayBuffer as ArrayBuffer, startTime: sub.start };
           addLog(`  ✅ Hoàn tất câu ${item.index + 1} (Từ hàng đợi AI)`, 'success');
           updateProgress(completedInitial, ++completedRewrite, rewriteQueue.length);
        }
      };

      addLog(`⚙️ Đợt 1: xử lý các câu an toàn để hiệu chỉnh model...`, 'info');
      const phase1Workers = Array(concurrencyLimit).fill(0)
        .map(() => makeQueueProcessor(immediateIndices)());
      await Promise.all(phase1Workers);

      if (deferredIndices.length > 0) {
        addLog(`⚙️ Đợt 2: xử lý ${deferredIndices.length} câu còn lại với dữ liệu đã tích lũy...`, 'info');
        const phase2Workers = Array(concurrencyLimit).fill(0)
          .map(() => makeQueueProcessor(deferredIndices)());
        await Promise.all(phase2Workers);
      }
      
      // Sau khi xong initial queue, xử lý rewrite queue nếu có
      if (rewriteQueue.length > 0) {
          addLog(`⚙️ Bắt đầu xử lý ${rewriteQueue.length} câu cần AI rút gọn theo nhóm để tiết kiệm credit...`, 'info');
          await processRewriteQueue();
      }
      
      const validAudioClips = audioClips.filter((clip, idx) => clip !== null && processedSubs[idx] && processedSubs[idx].text.trim() !== "") as { buffer: ArrayBuffer; startTime: number; maxDuration?: number }[];

      addLog(`⚙️ Đang ghép các track vào file tổng hợp (Timeline mốc thời gian)...`, 'warning');
      let finalBlob = null;
      let mergeRetries = 0;
      const maxMergeRetries = 10;
      
      while (!finalBlob && mergeRetries < maxMergeRetries) {
        try {
          finalBlob = await mergeAudioClips(validAudioClips);
        } catch (mergeErr: any) {
          mergeRetries++;
          addLog(`❌ Lỗi ghép audio lần ${mergeRetries}: ${mergeErr.message}. ${mergeRetries < maxMergeRetries ? 'Đang thử lại...' : 'Thất bại.'}`, 'error');
          if (mergeRetries < maxMergeRetries) {
            await sleep(2000);
          }
        }
      }

      if (!finalBlob) {
        throw new Error("Không thể ghép audio sau nhiều lần thử. Vui lòng tải lại trang và thử lại.");
      }

      const objectUrl = URL.createObjectURL(finalBlob);
      setResultUrl(objectUrl);
      setProgress(100);

      const updatedSrtText = generateSrt(processedSubs);
      const srtBlob = new Blob([updatedSrtText], { type: 'text/plain' });
      const srtObjectUrl = URL.createObjectURL(srtBlob);
      setResultSrtUrl(srtObjectUrl);
      
      try { audioCtx.close(); } catch(e) {}

            if (reportListRef.current.length > 0) {
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'warning');
        addLog(`⚠️ ${reportListRef.current.length} câu chạm trần ${maxAutoFitSpeed}x, cần kiểm tra lại:`, 'warning');
        reportListRef.current.forEach(p => {
            addLog(`  • Câu ${p.index} — dư ${p.overflow.toFixed(2)}s (gap ${p.gap.toFixed(2)}s): "${p.text}"`, 'warning');
        });
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'warning');
      }

      addLog(`🎉 Hoàn thành! Bạn có thể nghe thử hoặc tải xuống bên dưới.`, 'success');

    } catch (err: any) {
      addLog(`❌ Quá trình bị lỗi: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingProvider(null);
    }
  };

  return {
    ttsProvider, setTtsProvider,
    aivoicesKeysStr, setAivoicesKeysStr,
    apiKeysStr, setApiKeysStr,
    geminiApiKeysStr, setGeminiApiKeysStr,
    voiceId, setVoiceId,
    srtFile, setSrtFile,
    isProcessing, setIsProcessing,
    processingProvider, setProcessingProvider,
    progress, setProgress,
    logs, setLogs,
    resultUrl, setResultUrl,
    resultSrtUrl, setResultSrtUrl,
    autoFit, setAutoFit,
    reviewItems, setReviewItems,
    approvedRewrites, setApprovedRewrites,
    useRubberBandStretch, setUseRubberBandStretch,
    fixedSpeed, setFixedSpeed,
    maxAutoFitSpeed, setMaxAutoFitSpeed,
    minAutoFitSpeed, setMinAutoFitSpeed,
    smartGroup, setSmartGroup,
    groupGap, setGroupGap,
    aiRewrite, setAiRewrite, requireReview, setRequireReview, reviewQueueItems, setReviewQueueItems, handleApprove: (index: number, newText: string, options?: { mergePrev?: boolean, mergeNext?: boolean }) => { if (handleApproveRef.current) handleApproveRef.current(index, newText, options); },
      handleRewrite: (index: number, originalText: string, neededSpeed: number) => { return handleRewriteRef.current ? handleRewriteRef.current(index, originalText, neededSpeed) : Promise.resolve(originalText); },
    concurrency, setConcurrency,
    totalSubsCount,
      mode, setMode,
    aivoicesList, setAivoicesList,
    logsEndRef,
    handleFileChange,
    
    saveRewrites,
    startDubbing
  };
}


