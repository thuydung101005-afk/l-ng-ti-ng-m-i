import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

let globalGeminiKeyIndex = 0;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.raw({ type: 'audio/wav', limit: '50mb' }));

  const { spawn } = await import("child_process");

  app.post("/api/ffmpeg/atempo", (req, res) => {
    let speed = parseFloat(req.query.speed as string);
    if (isNaN(speed) || speed <= 0) {
      return res.status(400).json({ error: "Invalid speed parameter. Must be greater than 0" });
    }

    const filters: string[] = ['apad=pad_dur=0.5'];
    // Đệm 0.5s silence trước khi vào atempo để WSOLA xả trọn vẹn trong khoảng lặng, triệt tiêu hoàn toàn tiếng khựng ré loa
    
    while (speed > 2.0) {
      filters.push('atempo=2.0');
      speed /= 2.0;
    }
    while (speed < 0.5) {
      filters.push('atempo=0.5');
      speed /= 0.5;
    }
    if (speed !== 1.0 || filters.length === 1) {
      filters.push(`atempo=${speed}`);
    }
    const filterStr = filters.join(',');

    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-filter:a', filterStr,
      '-f', 'wav',
      'pipe:1'
    ]);

    ffmpeg.stdin.on('error', () => {});
    ffmpeg.stdin.write(req.body);
    ffmpeg.stdin.end();

    const chunks: Buffer[] = [];
    let stderrStr = '';
    ffmpeg.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    ffmpeg.stderr.on('data', (chunk) => { stderrStr += chunk.toString(); });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const resultBuffer = Buffer.concat(chunks);
        res.setHeader("Content-Type", "audio/wav");
        res.send(resultBuffer);
      } else {
        res.status(500).json({ error: `FFmpeg exited with code ${code}: ${stderrStr}` });
      }
    });
  });
  
    app.post('/api/rubberband/stretch', async (req, res) => {
    let speed = parseFloat(req.query.speed as string);
    if (isNaN(speed) || speed <= 0) {
      return res.status(400).json({ error: 'Invalid speed parameter' });
    }

    const tmpDir = 'D:\\temp_rubberband';
    const id = crypto.randomUUID();
    const inFile = path.join(tmpDir, `in_${id}.wav`);
    const outFile = path.join(tmpDir, `out_${id}.wav`);

    try {
      fs.writeFileSync(inFile, req.body);
      const exePath = path.resolve('./rubberband.exe');
      
      // Use R3 engine (-3) for best quality, preserve formants (-F), and change tempo (-T)
      const cmd = `"${exePath}" -3 -F -T ${speed.toFixed(4)} "${inFile}" "${outFile}"`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('Rubberband error:', stderr);
          fs.unlinkSync(inFile);
          return res.status(500).json({ error: 'Rubberband failed' });
        }
        
        try {
          const resultBuffer = fs.readFileSync(outFile);
          res.setHeader('Content-Type', 'audio/wav');
          res.send(resultBuffer);
        } catch (readErr) {
          res.status(500).json({ error: 'Failed to read output file' });
        } finally {
          try { fs.unlinkSync(inFile); } catch(e){}
          try { fs.unlinkSync(outFile); } catch(e){}
        }
      });
    } catch (err) {
      console.error("RUBBERBAND ROUTE CATCH ERROR:", err);
      res.status(500).json({ error: 'Failed to process request', details: String(err) });
    }
  });

  function getGeminiKeysFromDisk(): string[] {
    let raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEYS\s*=\s*"([^"]+)"/s) || envContent.match(/^GEMINI_API_KEYS\s*=\s*(.+)$/m) || envContent.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
        if (match && match[1]?.trim()) {
          raw = match[1].trim();
        }
      }
    } catch (e) {}
    return raw.replace(/\\n/g, '\n').split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);
  }

  app.get("/api/gemini/default-keys", (req, res) => {
    const keys = getGeminiKeysFromDisk();
    res.json({ keys: keys.join('\n') });
  });

  app.post("/api/gemini/rewrite-batch", async (req, res) => {
    try {
      const { items, clientGeminiKeysStr } = req.body;
      
      const clientKeys = typeof clientGeminiKeysStr === 'string' 
        ? clientGeminiKeysStr.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean)
        : [];
        
      const envKeys = getGeminiKeysFromDisk();
      const apiKeys = Array.from(new Set([...clientKeys, ...envKeys]));

      if (apiKeys.length === 0) {
        return res.status(500).json({ error: "Thieu biến môi trường GEMINI_API_KEY hoặc GEMINI_API_KEYS ở server và không có key dự phòng" });
      }

      let prompt = "Hãy viết lại và rút gọn các câu dưới đây theo yêu cầu cho từng câu.\nYêu cầu BẮT BUỘC:\n- BẮT BUỘC phải rút gọn nội dung ngắn hơn câu gốc, NHƯNG giữ nguyên ý nghĩa cốt lõi.\n- Trả về KẾT QUẢ DƯỚI DẠNG MẢNG JSON, KHÔNG BỌC TRONG MARKDOWN CODE BLOCK, CHỈ TRẢ VỀ CHÍNH XÁC ARRAY JSON.\n- Mảng JSON trả về PHẢI CHỨA CHÍNH XÁC " + items.length + " phần tử, tương ứng với " + items.length + " câu đầu vào theo đúng thứ tự.\n- Mỗi phần tử chứa một trường 'result' mang nội dung đã rút gọn.\n- Độ dài 'result' không được vượt quá số ký tự tối đa yêu cầu.\n\nDữ liệu đầu vào:\n";
      
      items.forEach((item, index) => {
        prompt += "\n[Câu số " + (item.id + 1) + "]\n";
        if (item.targetChars) prompt += "- Độ dài tối đa: " + item.targetChars + " ký tự.\n";
        if (item.targetDuration && item.targetSpeed) prompt += "- Thời gian mục tiêu: " + Number(item.targetDuration).toFixed(2) + "s ở tốc độ " + Number(item.targetSpeed).toFixed(1) + "x.\n";
        if (item.previousText) prompt += "- Câu trước: '" + item.previousText + "'\n";
        if (item.nextText) prompt += "- Câu sau: '" + item.nextText + "'\n";
        prompt += "- Nội dung gốc: '" + item.text + "'\n";
      });
      
      let resultText = "";
      let lastError;
      const geminiModels = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
      let success = false;
      const startKeyIndex = globalGeminiKeyIndex % apiKeys.length;

      // Vòng lặp duyệt qua từng key
      for (let k = 0; k < apiKeys.length; k++) {
          const currentKeyIdx = (startKeyIndex + k) % apiKeys.length;
          const currentKey = apiKeys[currentKeyIdx];
          const isGrok = currentKey.startsWith("xai-");
          const isDeepSeek = currentKey.startsWith("sk-");
          const modelsToTry = isGrok ? ["grok-2-latest"] : (isDeepSeek ? ["deepseek-chat"] : geminiModels);

          // Vòng lặp duyệt qua từng model của key đó
          for (const model of modelsToTry) {
              try {
                  console.log(`[AI Rewrite Batch] Thử key ${currentKeyIdx + 1}/${apiKeys.length} (${currentKey.substring(0, 10)}...) với model: ${model}`);
                  if (isGrok || isDeepSeek) {
                      const apiUrl = isGrok ? "https://api.x.ai/v1/chat/completions" : "https://api.deepseek.com/v1/chat/completions";
                      const res = await fetch(apiUrl, {
                          method: "POST",
                          headers: {
                              "Content-Type": "application/json",
                              "Authorization": "Bearer " + currentKey
                          },
                          body: JSON.stringify({
                              messages: [{ role: "user", content: prompt }],
                              model: model,
                              temperature: 0.2
                          })
                      });
                      if (!res.ok) throw new Error("HTTP " + res.status + ": " + await res.text());
                      const data = await res.json();
                      resultText = data.choices[0].message.content.trim();
                      success = true;
                      globalGeminiKeyIndex = currentKeyIdx;
                      break;
                  } else {
                      const ai = new GoogleGenAI({ apiKey: currentKey });
                      const geminiResponse = await ai.models.generateContent({
                          model: model,
                          contents: prompt,
                          config: {
                              responseMimeType: "application/json"
                          }
                      });
                      resultText = geminiResponse.text?.trim() || "";
                      success = true;
                      globalGeminiKeyIndex = currentKeyIdx;
                      break;
                  }
              } catch (error: any) {
                  lastError = error;
                  const errMsg = String(error?.message || error);
                  console.warn(`[AI Rewrite Batch] Key ${currentKeyIdx + 1} model ${model} lỗi:`, errMsg.substring(0, 150));
                  if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
                      await new Promise(r => setTimeout(r, 500));
                      break; // Quota hết thì đổi key luôn
                  }
              }
          }
          if (success) break;
      }
      
      if (!success) throw lastError || new Error("Failed to generate content");
      
      let parsed = [];
      try {
         let cleanJson = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
         const firstBracket = cleanJson.indexOf('[');
         const lastBracket = cleanJson.lastIndexOf(']');
         if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
           cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
         }
         parsed = JSON.parse(cleanJson);
      } catch (e) {
         console.warn("Failed to parse batch JSON response:", resultText);
         throw new Error("Invalid JSON format from AI");
      }
      
      console.log("[AI Rewrite Result]:", JSON.stringify(parsed, null, 2));
      res.json({ result: parsed });
    } catch (error) {
      console.error("[Gemini Batch Rewrite] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/gemini/rewrite", async (req, res) => {
    try {
      const { text, currentDurationMs, targetDurationMs, previousText, nextText, clientGeminiKeysStr, attempt, originalText } = req.body;
      
      const clientKeys = typeof clientGeminiKeysStr === 'string' 
        ? clientGeminiKeysStr.split(/[\n,]+/).map((k: string) => k.trim()).filter(Boolean)
        : [];
        
      const envKeys = getGeminiKeysFromDisk();
      const apiKeys = Array.from(new Set([...clientKeys, ...envKeys])) as string[];

      if (apiKeys.length === 0) {
        return res.status(500).json({ error: "Thieu biến môi trường GEMINI_API_KEY hoặc GEMINI_API_KEYS ở server và không có key dự phòng" });
      }
      
      let contextStr = "";
      if (previousText || nextText) {
          contextStr = `\nNgữ cảnh (không thay đổi ngữ cảnh, chỉ dùng để hiểu ý nghĩa):\n`;
          if (previousText) contextStr += `Câu trước: "${previousText}"\n`;
          if (nextText) contextStr += `Câu sau: "${nextText}"\n`;
      }
      
            let durationStr = "";
      if (req.body.targetChars) {
          durationStr += `\n- Độ dài tối đa: Rút gọn sao cho độ dài TỐI ĐA khoảng ${req.body.targetChars} ký tự.`;
      }
      if (req.body.targetDuration && req.body.targetSpeed) {
          durationStr += `\n- Yêu cầu thời gian: Câu rút gọn nên đọc xong trong ${Number(req.body.targetDuration).toFixed(2)} giây (ở tốc độ ${Number(req.body.targetSpeed).toFixed(1)}x).`;
      }

      const prompt = `Hãy viết lại và rút gọn câu dưới đây sao cho thật súc tích, mạch lạc và tự nhiên.
Yêu cầu BẮT BUỘC:${durationStr}
- Giữ nguyên ý nghĩa cốt lõi của câu gốc, đảm bảo câu văn mạch lạc, đúng nghĩa cũ và trôi chảy.
- Không thêm nội dung, không giải thích, không tự ý bình luận.
- CHỈ ĐƯỢC trả về nội dung câu đã rút gọn, KHÔNG giải thích, KHÔNG thêm ngoặc kép.
${contextStr}
Câu gốc cần rút gọn:
"${text}"`;

      let resultText = "";
      let lastError;
      const geminiModels = [
        "gemini-flash-latest",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash"
      ];
      
      let success = false;
      const startKeyIndex = globalGeminiKeyIndex % apiKeys.length;
      
      // Vòng lặp duyệt qua từng key
      for (let k = 0; k < apiKeys.length; k++) {
          const currentKeyIdx = (startKeyIndex + k) % apiKeys.length;
          const currentKey = apiKeys[currentKeyIdx];
          const isGrok = currentKey.startsWith("xai-");
          const isDeepSeek = currentKey.startsWith("sk-");
          const modelsToTry = isGrok ? ["grok-2-latest"] : (isDeepSeek ? ["deepseek-chat"] : geminiModels);
          
          // Vòng lặp duyệt qua từng model của key đó
          for (const model of modelsToTry) {
              try {
                  console.log(`[AI Rewrite] Thử key ${currentKeyIdx + 1}/${apiKeys.length} (${currentKey.substring(0, 10)}...) với model: ${model}`);
                  if (isGrok || isDeepSeek) {
                      const apiUrl = isGrok ? "https://api.x.ai/v1/chat/completions" : "https://api.deepseek.com/v1/chat/completions";
                      const res = await fetch(apiUrl, {
                          method: "POST",
                          headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${currentKey}`
                          },
                          body: JSON.stringify({
                              messages: [
                                  { role: "user", content: prompt }
                              ],
                              model: model,
                              temperature: 0.3
                          })
                      });
                      if (!res.ok) {
                          const errData = await res.text();
                          throw new Error(`HTTP ${res.status}: ${errData}`);
                      }
                      const data = await res.json();
                      resultText = data.choices[0].message.content.trim();
                      success = true;
                      globalGeminiKeyIndex = currentKeyIdx;
                      break;
                  } else {
                      const ai = new GoogleGenAI({ apiKey: currentKey });
                      const geminiResponse = await ai.models.generateContent({
                          model: model,
                          contents: prompt,
                      });
                      resultText = geminiResponse.text?.trim() || "";
                      success = true;
                      globalGeminiKeyIndex = currentKeyIdx;
                      break;
                  }
              } catch (error: any) {
                  lastError = error;
                  const errMsg = String(error.message || error);
                  console.warn(`[AI Rewrite] Key ${currentKeyIdx + 1} model ${model} lỗi:`, errMsg.substring(0, 150));
                  if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
                      await new Promise(resolve => setTimeout(resolve, 500));
                      break; // Hết quota thì chuyển key tiếp theo
                  }
              }
          }
          if (success) break;
      }
      if (!success) {
        throw lastError || new Error("Failed to generate content after multiple attempts");
      }
      res.json({ result: resultText });
    } catch (error) {
      console.error("[Gemini Rewrite] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/vclip/rpc", async (req, res) => {
    const { apiKey, payload } = req.body;
    
    if (!payload?.input && !payload?.method) {
      return res.status(400).json({ error: { message: "Internal Proxy Error: Missing payload structure" }});
    }

    try {
      console.log(`[Proxy] Sending to VClip | Method: ${payload.method} | id: ${payload.id}`);
      
      const response = await fetch("https://api-tts.vclip.io/json-rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.status(response.status).json(data);
      } catch (e) {
        res.status(response.status || 500).json({ error: { message: `Upstream HTTP ${response.status}: ${text.substring(0, 200)}` } });
      }
    } catch (error) {
      console.error("[Proxy] Error:", error);
      res.status(500).json({ error: { message: String(error) } });
    }
  });

  app.get('/api/aivoices/voices', async (req, res) => {
    try {
      const response = await fetch('https://tts-api.achihub.com/api/tts/voices');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/aivoices/synthesize', async (req, res) => {
    try {
      const { voice_id, script_text, speed, pitch, apiKey } = req.body;
      const response = await fetch('https://tts-api.achihub.com/api/tts/synthesize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voice_id, script_text, speed: speed || 1.0, pitch: pitch || 0 })
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json(data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/aivoices/job/:id', async (req, res) => {
    try {
      const apiKey = req.headers.authorization?.split(' ')[1];
      const response = await fetch(`https://tts-api.achihub.com/api/tts/${req.params.id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json(data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Quản lý bể Server OmniVoice (hỗ trợ tối đa 5 server Colab song song)
  const activeOmniRequests: Record<string, number> = {};

  function getOmniVoiceUrls(): string[] {
    let urls: string[] = [];
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // 1. Kiểm tra OMNIVOICE_URL_1 đến OMNIVOICE_URL_5
        for (let i = 1; i <= 5; i++) {
          const re = new RegExp(`^OMNIVOICE_URL_${i}\\s*=\\s*(.+)`, 'm');
          const m = envContent.match(re);
          if (m && m[1]) {
            const u = m[1].trim().replace(/^["']|["']$/g, '');
            if (u && !urls.includes(u)) urls.push(u);
          }
        }

        // 2. Kiểm tra OMNIVOICE_URLS hoặc OMNIVOICE_URL (phân tách bởi dấu phẩy hoặc xuống dòng)
        const matchAll = envContent.match(/^OMNIVOICE_URLS?\s*=\s*(.+)$/m);
        if (matchAll && matchAll[1]) {
          const parts = matchAll[1].split(/[,\n;]+/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          for (const p of parts) {
            if (!urls.includes(p)) urls.push(p);
          }
        }
      }
    } catch (e) {}

    if (urls.length === 0 && process.env.OMNIVOICE_URL) {
      const parts = process.env.OMNIVOICE_URL.split(/[,\n;]+/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      for (const p of parts) {
        if (!urls.includes(p)) urls.push(p);
      }
    }

    if (urls.length === 0) {
      urls = ['http://localhost:8001'];
    }

    // Giới hạn tối đa 5 server và chuẩn hóa URL
    return urls.slice(0, 5).map(u => u.replace(/\/+$/, ''));
  }

  app.get('/api/omnivoice/servers', async (req, res) => {
    const urls = getOmniVoiceUrls();
    res.json({
      count: urls.length,
      servers: urls.map(u => ({
        url: u,
        activeRequests: activeOmniRequests[u] || 0
      }))
    });
  });

  app.post('/api/omnivoice/generate', async (req, res) => {
    try {
      const { text, voice_id, speed, target_duration, postprocess_output } = req.body;

      if (req.body && typeof req.body.text === 'string') {
        let t = req.body.text.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').trim();
        t = t.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
        t = t.replace(/(?:…|\.{2,})\s*$/g, '.');
        t = t.replace(/(?:…|\.{2,})/g, ', ');
        t = t.replace(/\s*,\s*/g, ', ');
        t = t.replace(/,\s*,+/g, ', ');
        t = t.replace(/,\s*\./g, '.');
        t = t.replace(/[,;:\-–—~]+$/, '').trim();
        t = t.replace(/,(\s*)([^\s])/g, (_, space, char) => ',' + space + char.toLowerCase());
        if (/[.!?]$/.test(t)) {
          t = t.replace(/[\s\.]*([.!?])$/, '$1');
        } else if (t.length > 0) {
          t += '.';
        }
        req.body.text = t;
      }

      const urls = getOmniVoiceUrls();
      // Sắp xếp các server theo số request đang chạy (Least Connections - ưu tiên server rảnh nhất)
      const sortedUrls = [...urls].sort((a, b) => (activeOmniRequests[a] || 0) - (activeOmniRequests[b] || 0));

      let lastError: any = null;
      let successBuffer: ArrayBuffer | null = null;

      for (const targetUrl of sortedUrls) {
        activeOmniRequests[targetUrl] = (activeOmniRequests[targetUrl] || 0) + 1;
        const currentActive = activeOmniRequests[targetUrl];
        console.log(`[OmniVoice Pool] [Server ${targetUrl}] (Đang chạy: ${currentActive}) | Gửi câu: "${req.body?.text?.substring(0, 30)}..."`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

          const response = await fetch(`${targetUrl}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          successBuffer = await response.arrayBuffer();
          activeOmniRequests[targetUrl] = Math.max(0, (activeOmniRequests[targetUrl] || 1) - 1);
          break; // Thành công, thoát vòng lặp
        } catch (err: any) {
          activeOmniRequests[targetUrl] = Math.max(0, (activeOmniRequests[targetUrl] || 1) - 1);
          lastError = err;
          console.warn(`[OmniVoice Pool] ⚠️ Server ${targetUrl} gặp lỗi: ${err.message}. Thử server tiếp theo nếu có...`);
        }
      }

      if (successBuffer) {
        res.setHeader("Content-Type", "audio/wav");
        return res.send(Buffer.from(successBuffer));
      }

      console.error("[OmniVoice Pool] Tất cả các server đều không phản hồi:", lastError);
      return res.status(500).json({ error: `Tất cả server OmniVoice đều gặp sự cố: ${lastError?.message || 'Không rõ lỗi'}` });

    } catch (error: any) {
      console.error("[OmniVoice] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/omnivoice/voices', async (req, res) => {
    const urls = getOmniVoiceUrls();
    for (const url of urls) {
      try {
        const response = await fetch(`${url}/voices`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        }
      } catch (e) {}
    }
    res.status(500).json({ error: "Không thể lấy danh sách giọng từ bất kỳ server OmniVoice nào." });
  });

  app.get('/api/omnivoice/health', async (req, res) => {
    const urls = getOmniVoiceUrls();
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
          const data = await resp.json().catch(() => ({}));
          return { url, online: resp.ok, activeRequests: activeOmniRequests[url] || 0, data };
        } catch (e: any) {
          return { url, online: false, activeRequests: activeOmniRequests[url] || 0, error: e.message };
        }
      })
    );
    res.json({ count: urls.length, servers: results });
  });

  // Proxy the audio file download to avoid CORS issues
  app.post("/api/proxy-download", async (req, res) => {
    const { url } = req.body;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
      }
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", response.headers.get("Content-Type") || "audio/mpeg");
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();


