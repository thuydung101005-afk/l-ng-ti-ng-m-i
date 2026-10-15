const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /\{ttsProvider === 'vclip' \? \(\n\s*<div className="space-y-2">\n\s*<label className="text-sm font-medium text-gray-700">API Key VClip \(Chỉ sử dụng 1 key đầu tiên để tránh lỗi ID giọng\)<\/label>\n\s*<textarea\n\s*rows=\{3\}\n\s*value=\{apiKeysStr\}\n\s*onChange=\{\(e\) => setApiKeysStr\(e\.target\.value\)\}\n\s*className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"\n\s*disabled=\{isProcessing\}\n\s*placeholder="sk_live_key1&#10;sk_live_key2"\n\s*\/>\n\s*<\/div>\n\s*\) : \(\n\s*<div className="space-y-2">\n\s*<label className="text-sm font-medium text-gray-700">API Keys AIVoices \(Mỗi dòng 1 key, tự luân phiên khi lỗi\)<\/label>\n\s*<textarea\n\s*rows=\{3\}\n\s*value=\{aivoicesKeysStr\}\n\s*onChange=\{\(e\) => setAivoicesKeysStr\(e\.target\.value\)\}\n\s*className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"\n\s*disabled=\{isProcessing\}\n\s*placeholder="aiv_key1&#10;aiv_key2"\n\s*\/>\n\s*<\/div>\n\s*\)\}/,
  `{ttsProvider === 'omnivoice' ? null : ttsProvider === 'vclip' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">API Key VClip (Chỉ sử dụng 1 key đầu tiên để tránh lỗi ID giọng)</label>
                  <textarea 
                    rows={3}
                    value={apiKeysStr} 
                    onChange={(e) => setApiKeysStr(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                    placeholder="sk_live_key1&#10;sk_live_key2"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">API Keys AIVoices (Mỗi dòng 1 key, tự luân phiên khi lỗi)</label>
                  <textarea 
                    rows={3}
                    value={aivoicesKeysStr} 
                    onChange={(e) => setAivoicesKeysStr(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                    placeholder="aiv_key1&#10;aiv_key2"
                  />
                </div>
              )}`
);

fs.writeFileSync(path, content);
console.log('Success');
