const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const batchApi = `
  app.post("/api/gemini/rewrite-batch", async (req, res) => {
    try {
      const { items, clientGeminiKeysStr } = req.body;
      
      const clientKeys = typeof clientGeminiKeysStr === 'string' 
        ? clientGeminiKeysStr.split(/[\\n,]+/).map((k) => k.trim()).filter(Boolean)
        : [];
        
      const apiKeys = clientKeys.length > 0 ? clientKeys : [
        process.env.GEMINI_API_KEY
      ].filter(Boolean);

      if (apiKeys.length === 0) {
        return res.status(500).json({ error: "Thieu biến môi trường GEMINI_API_KEY ở server và không có key dự phòng" });
      }

      let prompt = "Hãy viết lại và rút gọn các câu dưới đây theo yêu cầu cho từng câu.\\nYêu cầu BẮT BUỘC:\\n- Giữ nguyên ý nghĩa cốt lõi của câu gốc, mạch lạc và tự nhiên.\\n- Trả về KẾT QUẢ DƯỚI DẠNG MẢNG JSON, KHÔNG BỌC TRONG MARKDOWN CODE BLOCK, CHỈ TRẢ VỀ CHÍNH XÁC ARRAY JSON.\\n- Mỗi phần tử trong mảng tương ứng với một câu, chứa một trường 'result' mang nội dung đã rút gọn.\\n\\nDữ liệu đầu vào:\\n";
      
      items.forEach((item, index) => {
        prompt += "\\n[Câu " + (index + 1) + "]\\n";
        if (item.targetChars) prompt += "- Độ dài tối đa: " + item.targetChars + " ký tự.\\n";
        if (item.targetDuration && item.targetSpeed) prompt += "- Thời gian mục tiêu: " + Number(item.targetDuration).toFixed(2) + "s ở tốc độ " + Number(item.targetSpeed).toFixed(1) + "x.\\n";
        if (item.previousText) prompt += "- Câu trước: '" + item.previousText + "'\\n";
        if (item.nextText) prompt += "- Câu sau: '" + item.nextText + "'\\n";
        prompt += "- Nội dung gốc: '" + item.text + "'\\n";
      });
      
      let resultText = "";
      let lastError;
      let keyIndex = globalGeminiKeyIndex++;
      
      const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-pro-exp"];
      let success = false;
      let maxRetries = 15;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const currentKey = apiKeys[keyIndex % apiKeys.length];
          const isGrok = currentKey.startsWith("xai-");
          const isDeepSeek = currentKey.startsWith("sk-");
          const model = isGrok ? "grok-2-latest" : (isDeepSeek ? "deepseek-chat" : geminiModels[(attempt - 1) % geminiModels.length]);
          
          try {
              if (isGrok || isDeepSeek) {
                  const apiUrl = isGrok ? "https://api.x.ai/v1/chat/completions" : "https://api.deepseek.com/chat/completions";
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
                  break;
              } else {
                  const ai = new GoogleGenAI({ apiKey: currentKey });
                  const geminiResponse = await ai.models.generateContent({
                      model: model,
                      contents: prompt,
                  });
                  resultText = geminiResponse.text?.trim() || "";
                  success = true;
                  break;
              }
          } catch (error) {
              lastError = error;
              const errMsg = String(error.message || error);
              if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
                  keyIndex++; globalGeminiKeyIndex = keyIndex; await new Promise(r => setTimeout(r, 1000)); continue;
              } else if (errMsg.includes("503") || errMsg.includes("High demand")) {
                  await new Promise(r => setTimeout(r, 2000)); continue;
              }
              keyIndex++; globalGeminiKeyIndex = keyIndex; continue;
          }
      }
      
      if (!success) throw lastError || new Error("Failed to generate content");
      
      let parsed = [];
      try {
         resultText = resultText.replace(/^\\s*[\`]+(json)?/im, '').replace(/[\`]+\\s*$/im, '').trim();
         parsed = JSON.parse(resultText);
      } catch (e) {
         console.warn("Failed to parse batch JSON response:", resultText);
         throw new Error("Invalid JSON format from AI");
      }
      
      res.json({ result: parsed });
    } catch (error) {
      console.error("[Gemini Batch Rewrite] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });
`;

code = code.replace(/app\.post\("\/api\/gemini\/rewrite", async \(req, res\) => \{/, batchApi + '\n  app.post("/api/gemini/rewrite", async (req, res) => {');

fs.writeFileSync('server.ts', code);
console.log("Added batch API.");
