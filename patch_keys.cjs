const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const keys = ttsProvider === 'vclip' \? apiKeysStr\.split\(\/\[\\n,\]\+\/\)\.map\(k => k\.trim\(\)\)\.filter\(k => k\.length > 0\) : aivoicesKeysStr\.split\(\/\[\\n,\]\+\/\)\.map\(k => k\.trim\(\)\)\.filter\(k => k\.length > 0\);\n\s*if \(\(keys\.length === 0 \|\| !voiceId\) && ttsProvider !== 'omnivoice'\) \{/,
  `const keys = ttsProvider === 'vclip' ? apiKeysStr.split(/[\\n,]+/).map(k => k.trim()).filter(k => k.length > 0) : aivoicesKeysStr.split(/[\\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if ((keys.length === 0 && ttsProvider !== 'omnivoice') || !voiceId) {`
);

content = content.replace(
  /const keys = ttsProvider === 'vclip' \? apiKeysStr\.split\(\/\[\\n,\]\+\/\)\.map\(k => k\.trim\(\)\)\.filter\(k => k\.length > 0\) : aivoicesKeysStr\.split\(\/\[\\n,\]\+\/\)\.map\(k => k\.trim\(\)\)\.filter\(k => k\.length > 0\);\n\s*if \(keys\.length === 0 \|\| !voiceId\) \{/,
  `const keys = ttsProvider === 'vclip' ? apiKeysStr.split(/[\\n,]+/).map(k => k.trim()).filter(k => k.length > 0) : aivoicesKeysStr.split(/[\\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if ((keys.length === 0 && ttsProvider !== 'omnivoice') || !voiceId) {`
);

fs.writeFileSync(path, content);
console.log('Success');
