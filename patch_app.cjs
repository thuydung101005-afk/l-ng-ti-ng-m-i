const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update State
code = code.replace(
  "const [ttsProvider, setTtsProvider] = useState<'vclip' | 'aivoices' | 'omnivoice'>('omnivoice');",
  "const [ttsProvider, setTtsProvider] = useState<'vclip' | 'aivoices'>('vclip');"
);

// 2. Update runOmnivoiceDuration signature
code = code.replace(
  "const runOmnivoiceDuration = async (text: string, targetDuration: number, index: number): Promise<ArrayBuffer> => {",
  "const runOmnivoiceDuration = async (text: string, targetDuration: number, index: number, activeVoiceId: string): Promise<ArrayBuffer> => {"
);
code = code.replace(
  "body: JSON.stringify({ text: String(text), voice_id: voiceId, speed: Number(neededSpeed.toFixed(2)), postprocess_output: false })",
  "body: JSON.stringify({ text: String(text), voice_id: activeVoiceId, speed: Number(neededSpeed.toFixed(2)), postprocess_output: false })"
);

// 3. Update _runTTS signature
code = code.replace(
  "const _runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }) => {",
  "const _runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }, activeProvider?: string, activeVoiceId?: string) => {\n    const provider = activeProvider || ttsProvider;\n    const vId = activeVoiceId || voiceId;"
);

// Replace ttsProvider and voiceId inside _runTTS with provider and vId
let runTTSBlockStart = code.indexOf("const _runTTS");
let startDubbingStart = code.indexOf("const startDubbing");

let _runTTSCode = code.substring(runTTSBlockStart, startDubbingStart);
_runTTSCode = _runTTSCode.replace(/ttsProvider/g, 'provider');
_runTTSCode = _runTTSCode.replace(/voiceId/g, 'vId');
code = code.substring(0, runTTSBlockStart) + _runTTSCode + code.substring(startDubbingStart);

// 4. Update runTTS signature
code = code.replace(
  "const runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }, forceRefetch = false) => {",
  "const runTTS = async (text: string, currentSpeed: number, index: number, projectExportIdRef?: { current: string | null }, forceRefetch = false, activeProvider?: string, activeVoiceId?: string) => {\n    const provider = activeProvider || ttsProvider;\n    const vId = activeVoiceId || voiceId;"
);
// Replace in runTTS block
let runTTSBlockStart2 = code.indexOf("const runTTS =");
let startDubbingStart2 = code.indexOf("const startDubbing =");
let runTTSCode = code.substring(runTTSBlockStart2, startDubbingStart2);
runTTSCode = runTTSCode.replace(/ttsProvider/g, 'provider').replace(/voiceId/g, 'vId');
runTTSCode = runTTSCode.replace(
  "const result = await _runTTS(text, currentSpeed, index, projectExportIdRef);",
  "const result = await _runTTS(text, currentSpeed, index, projectExportIdRef, provider, vId);"
);
code = code.substring(0, runTTSBlockStart2) + runTTSCode + code.substring(startDubbingStart2);

// 5. Update startDubbing
code = code.replace(
  "const startDubbing = async () => {",
  "const startDubbing = async (overrideProvider?: 'omnivoice') => {\n    const activeProvider = overrideProvider || ttsProvider;\n    const activeVoiceId = overrideProvider === 'omnivoice' ? 'ngoc_huyen' : voiceId;"
);

let startDubbingEnd = code.indexOf("return (", startDubbingStart2);
let startDubbingCode = code.substring(startDubbingStart2, startDubbingEnd);
startDubbingCode = startDubbingCode.replace(/ttsProvider/g, 'activeProvider').replace(/voiceId/g, 'activeVoiceId');
// Update runTTS calls inside startDubbingCode to pass activeProvider, activeVoiceId
startDubbingCode = startDubbingCode.replace(/runTTS\(([^,]+), ([^,]+), ([^,]+), ([^,)]+)\)/g, "runTTS($1, $2, $3, $4, false, activeProvider, activeVoiceId)");
startDubbingCode = startDubbingCode.replace(/runTTS\(([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,)]+)\)/g, "runTTS($1, $2, $3, $4, $5, activeProvider, activeVoiceId)");
startDubbingCode = startDubbingCode.replace(/runOmnivoiceDuration\(([^,]+), ([^,]+), ([^,)]+)\)/g, "runOmnivoiceDuration($1, $2, $3, activeVoiceId)");

code = code.substring(0, startDubbingStart2) + startDubbingCode + code.substring(startDubbingEnd);

// 6. UI Updates
// Replace dropdown
let selectHtmlOld = `<select
                  value={ttsProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as 'vclip' | 'aivoices' | 'omnivoice';
                    setTtsProvider(newProvider);
                    if (newProvider === 'omnivoice') {
                      setVoiceId('ngoc_huyen');
                      setConcurrency(1);
                    } else if (newProvider === 'aivoices' && aivoicesList.length > 0) {
                      setVoiceId(aivoicesList[0].voice_id);
                    } else if (newProvider === 'vclip') {
                      setVoiceId('mhsL3CPLxmLYdSTKp3GANz');
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  disabled={isProcessing}
                >
                  <option value="omnivoice">Local OmniVoice (Giọng tự clone)</option>
                  <option value="vclip">VClip API (sk_live_...)</option>
                  <option value="aivoices">AIVoices (achihub.com) (aiv_...)</option>
                </select>`;

let selectHtmlNew = `<select
                  value={ttsProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as 'vclip' | 'aivoices';
                    setTtsProvider(newProvider);
                    if (newProvider === 'aivoices' && aivoicesList.length > 0) {
                      setVoiceId(aivoicesList[0].voice_id);
                    } else if (newProvider === 'vclip') {
                      setVoiceId('mhsL3CPLxmLYdSTKp3GANz');
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  disabled={isProcessing}
                >
                  <option value="vclip">VClip API (sk_live_...)</option>
                  <option value="aivoices">AIVoices (achihub.com) (aiv_...)</option>
                </select>`;

code = code.replace(selectHtmlOld, selectHtmlNew);

// Remove API Key logic for omnivoice
code = code.replace("{ttsProvider === 'omnivoice' ? null : ttsProvider === 'vclip' ? (", "{ttsProvider === 'vclip' ? (");

// Remove Voice ID input for omnivoice
let voiceIdSelectOld = `) : ttsProvider === 'omnivoice' ? (
                  <input
                    type="text"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                    placeholder="ngoc_huyen"
                  />
                ) : (`;

let voiceIdSelectNew = `) : (`;
code = code.replace(voiceIdSelectOld, voiceIdSelectNew);

// Add the new button
let buttonOld = `<button
              onClick={startDubbing}
              disabled={isProcessing || !srtFile}
              className={\`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all \${
                isProcessing || !srtFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
              }\`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" /> Bắt đầu lồng tiếng
                </>
              )}
            </button>`;

let buttonNew = `<div className="flex flex-col gap-3">
              <button
                onClick={() => startDubbing()}
                disabled={isProcessing || !srtFile}
                className={\`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all \${
                  isProcessing || !srtFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }\`}
              >
                {isProcessing && ttsProvider !== 'omnivoice' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý (API)...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" /> Bắt đầu lồng tiếng (API)
                  </>
                )}
              </button>
              
              <button
                onClick={() => startDubbing('omnivoice')}
                disabled={isProcessing || !srtFile}
                className={\`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all \${
                  isProcessing || !srtFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/30'
                }\`}
              >
                {isProcessing && ttsProvider === 'omnivoice' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý (Local)...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" /> 🎙️ Lồng tiếng Ngọc Huyền (Local GPU)
                  </>
                )}
              </button>
            </div>`;

code = code.replace(buttonOld, buttonNew);

// Wait, the "isProcessing && ttsProvider === 'omnivoice'" logic will fail because ttsProvider state is not 'omnivoice' anymore.
// Let's add a state to track which provider is currently processing.
code = code.replace("const [isProcessing, setIsProcessing] = useState(false);", "const [isProcessing, setIsProcessing] = useState(false);\n  const [processingProvider, setProcessingProvider] = useState<'vclip' | 'aivoices' | 'omnivoice' | null>(null);");

code = code.replace("setIsProcessing(true);", "setIsProcessing(true);\n    setProcessingProvider(activeProvider);");
code = code.replace("setIsProcessing(false);", "setIsProcessing(false);\n      setProcessingProvider(null);");

buttonNew = buttonNew.replace("ttsProvider !== 'omnivoice'", "processingProvider !== 'omnivoice'");
buttonNew = buttonNew.replace("ttsProvider === 'omnivoice'", "processingProvider === 'omnivoice'");
code = code.replace(buttonOld, buttonNew); // In case it wasn't replaced earlier

fs.writeFileSync('src/App.tsx', code);
console.log('Done patching App.tsx');
