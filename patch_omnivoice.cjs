const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update ttsProvider state
content = content.replace(
  /const \[ttsProvider, setTtsProvider\] = useState\<'vclip' \| 'aivoices'\>\('vclip'\);/,
  "const [ttsProvider, setTtsProvider] = useState<'vclip' | 'aivoices' | 'omnivoice'>('omnivoice');"
);

// Update select in the UI
content = content.replace(
  /onChange=\{\(e\) => \{\n\s*const newProvider = e\.target\.value as 'vclip' \| 'aivoices';\n\s*setTtsProvider\(newProvider\);\n\s*if \(newProvider === 'aivoices' && aivoicesList\.length > 0\) \{\n\s*setVoiceId\(aivoicesList\[0\]\.voice_id\);\n\s*\} else if \(newProvider === 'vclip'\) \{\n\s*setVoiceId\('hcm-diemmy'\);\n\s*\}\n\s*\}\}/,
  `onChange={(e) => {
                    const newProvider = e.target.value as 'vclip' | 'aivoices' | 'omnivoice';
                    setTtsProvider(newProvider);
                    if (newProvider === 'omnivoice') {
                      setVoiceId('ngoc_huyen');
                    } else if (newProvider === 'aivoices' && aivoicesList.length > 0) {
                      setVoiceId(aivoicesList[0].voice_id);
                    } else if (newProvider === 'vclip') {
                      setVoiceId('hcm-diemmy');
                    }
                  }}`
);

content = content.replace(
  /<option value="vclip">VClip API \(sk_live_\.\.\.\)<\/option>/,
  `<option value="omnivoice">Local OmniVoice (Giọng tự clone)</option>
                  <option value="vclip">VClip API (sk_live_...)</option>`
);

// Update voiceId input logic
content = content.replace(
  /\{ttsProvider === 'aivoices' \? \(\n\s*<select[\s\S]*?<\/select>\n\s*\) : \(\n\s*<input\n\s*type="text"\n\s*value="mhsL3CPLxmLYdSTKp3GANz"\n\s*readOnly\n\s*className="w-full border border-gray-300 bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none"\n\s*disabled=\{isProcessing\}\n\s*\/>\n\s*\)\}/,
  `{ttsProvider === 'aivoices' ? (
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                  >
                    {aivoicesList.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} - {voice.gender === 'female' ? 'Nữ' : 'Nam'} ({voice.region === 'northern' ? 'Miền Bắc' : voice.region === 'southern' ? 'Miền Nam' : voice.region === 'central' ? 'Miền Trung' : voice.region})
                      </option>
                    ))}
                    {aivoicesList.length === 0 && <option value={voiceId}>{voiceId}</option>}
                  </select>
                ) : ttsProvider === 'omnivoice' ? (
                  <input
                    type="text"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                    placeholder="ngoc_huyen"
                  />
                ) : (
                  <input 
                    type="text" 
                    value="mhsL3CPLxmLYdSTKp3GANz" 
                    readOnly
                    className="w-full border border-gray-300 bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none"
                    disabled={isProcessing}
                  />
                )}`
);

// Update _runTTS
content = content.replace(
  /const _runTTS = async \(text: string, currentSpeed: number, index: number, projectExportIdRef\?: \{ current: string \| null \}\) => \{/,
  `const _runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }) => {
    if (ttsProvider === 'omnivoice') {
      addLog(\`  ⏳ (Tốc độ \${currentSpeed}x) Đang gọi Local OmniVoice...\`, 'info');
      try {
        const res = await fetch('/api/omnivoice/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: String(text), voice_id: voiceId, speed: Number(currentSpeed) })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errData.error || \`HTTP \${res.status}\`);
        }
        
        const arrayBuffer = await res.arrayBuffer();
        return arrayBuffer;
      } catch (err: any) {
        addLog(\`  ❌ Lỗi gọi OmniVoice: \${err.message}\`, 'error');
        throw err;
      }
    }`
);

fs.writeFileSync(path, content);
console.log('Success');
