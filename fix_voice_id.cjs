const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const badText = `                ) : (
                  <input 
                    type="text" 
                    value="mhsL3CPLxmLYdSTKp3GANz" 
                    readOnly
                    className="w-full border border-gray-300 bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none"
                    disabled={isProcessing}
                  />
                )}`;

const goodText = `                ) : ttsProvider === 'omnivoice' ? (
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
                )}`;

if (content.includes(badText)) {
  content = content.replace(badText, goodText);
  fs.writeFileSync(path, content);
  console.log('Success fixing Voice ID input');
} else {
  console.log('Bad text not found');
}
