const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<label className="text-sm font-medium text-gray-700">API Key VClip \(Nhập nhiều key, mỗi key 1 dòng hoặc cách nhau dấu phẩy\)<\/label>/m;
const replacement = `<label className="text-sm font-medium text-gray-700">API Key VClip (Chỉ sử dụng 1 key đầu tiên để tránh lỗi ID giọng)</label>`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed label");
} else {
    console.log("Regex failed");
}
