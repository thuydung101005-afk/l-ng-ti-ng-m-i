const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex1 = /addLog\(\`  ⚠️ Bỏ qua câu \$\{i \+ 1\} do nội dung trống\.\`, 'info'\);\n\s*continue;/;
if (code.match(regex1)) {
    code = code.replace(regex1, `addLog(\`  ⚠️ Bỏ qua câu \${i + 1} do nội dung trống.\`, 'info');\n             updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);\n             continue;`);
} else {
    console.log("Regex1 failed");
}

const regex2 = /addLog\(\`  ⚠️ Câu \$\{i \+ 1\} cần AI rút gọn \(vượt quá tốc độ 1\.5x\)\. Đã đưa vào hàng đợi xử lý sau\.\`, 'warning'\);\n\s*sentenceSuccess = true;\n\s*continue;/;
if (code.match(regex2)) {
    code = code.replace(regex2, `addLog(\`  ⚠️ Câu \${i + 1} cần AI rút gọn (vượt quá tốc độ 1.5x). Đã đưa vào hàng đợi xử lý sau.\`, 'warning');\n                       sentenceSuccess = true;\n                       updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);\n                       continue;`);
} else {
    console.log("Regex2 failed");
}

const regex3 = /addLog\(\`  ✅ Hoàn tất câu \$\{i \+ 1\}\`, 'success'\);\n\s*sentenceSuccess = true;/;
if (code.match(regex3)) {
    code = code.replace(regex3, `addLog(\`  ✅ Hoàn tất câu \${i + 1}\`, 'success');\n              sentenceSuccess = true;\n              updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);`);
} else {
    console.log("Regex3 failed");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Initial queue progress updated.");
