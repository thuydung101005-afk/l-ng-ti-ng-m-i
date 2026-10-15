const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /addLog\(\`⚙️ Bắt đầu xử lý \$\{rewriteQueue\.length\} câu cần AI rút gọn \(Giới hạn \$\{concurrencyLimit\} luồng\)\.\.\.\`, 'info'\);/;
const replacement = `addLog(\`⚙️ Bắt đầu xử lý \${rewriteQueue.length} câu cần AI rút gọn theo nhóm để tiết kiệm credit...\`, 'info');`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated log message.");
} else {
    console.log("Regex failed");
}
