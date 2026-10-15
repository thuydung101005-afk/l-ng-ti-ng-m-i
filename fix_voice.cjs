const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<input \s*type="text" \s*value=\{voiceId\} \s*onChange=\{\(e\) => setVoiceId\(e.target.value\)\}\s*className="[^"]+"\s*disabled=\{isProcessing\}\s*\/>/m;

const replacement = `<input 
                    type="text" 
                    value="mhsL3CPLxmLYdSTKp3GANz" 
                    readOnly
                    className="w-full border border-gray-300 bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none"
                    disabled={isProcessing}
                  />`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed VClip voiceId input");
} else {
    console.log("Regex failed");
}
