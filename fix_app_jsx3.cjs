const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<\/label>\s*<\/div>\s*<\/div>\s*<div className="bg-blue-50\/50 p-4 rounded-xl border border-blue-100">[\s\S]*?Số luồng xử lý song song. Tăng lên để render nhanh hơn.<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/g, "</label>\n                  </div>");

fs.writeFileSync('src/App.tsx', code);
console.log("Regex 2 replaced broken JSX");
