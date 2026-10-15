const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<\/label>\s*<\/div>\s*<\/div>\s*<div className="bg-blue-50\/50 p-4 rounded-xl border border-blue-100">\s*<div className="space-y-2">\s*<label className="text-sm font-semibold text-blue-900 block">Số tiến trình đồng thời \(Concurrency\)<\/label>\s*<div className="flex items-center space-x-2">\s*<input[^>]+>\s*<span className="text-xs text-blue-700\/80">Số luồng xử lý song song. Tăng lên để render nhanh hơn.<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/g, "</label>\n                  </div>");

fs.writeFileSync('src/App.tsx', code);
console.log("Regex replaced broken JSX");
