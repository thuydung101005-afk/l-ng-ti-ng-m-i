const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const getNextApiKey = \(\) => \{([\s\S]*?)return keys\[idx\];\s*\};/m;
const replacement = `const getNextApiKey = () => {
    const keys = apiKeysStr.split(/[\\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) return '';
    return keys[0]; // Chỉ lấy đúng 1 key mặc định đầu tiên
  };`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed getNextApiKey");
} else {
    console.log("Regex failed");
}
