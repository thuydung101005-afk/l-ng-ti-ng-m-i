const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex4 = /addLog\(\`  ✅ Hoàn tất câu \$\{i \+ 1\} \(Từ hàng đợi AI\)\`, 'success'\);/;
if (code.match(regex4)) {
    code = code.replace(regex4, `addLog(\`  ✅ Hoàn tất câu \${i + 1} (Từ hàng đợi AI)\`, 'success');\n          updateProgress(completedInitial, ++completedRewrite, rewriteQueue.length);`);
} else {
    console.log("Regex4 failed");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Rewrite queue progress updated.");
