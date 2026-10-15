const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\} else \{\s*addLog\(`  ⚠️ Câu \$\{i \+ 1\} vẫn dài dù đã ở \$\{MID_CAP_SPEED\}x\. Chuyển sang hàng đợi AI rút gọn\.`, 'warning'\);\s*rewriteQueue\.push\(\{ index: i, cleanText, actualDuration, targetDuration, originalBuffer: arrayBuffer \}\);\s*sentenceSuccess = true;\s*updateProgress\(\+\+completedInitial, completedRewrite, rewriteQueue\.length\);\s*continue;\s*\}/m;

const replacement = `} else {
                    if (aiRewrite) {
                       addLog(\`  ⚠️ Câu \${i + 1} vẫn dài dù đã ở \${MID_CAP_SPEED}x. Chuyển sang hàng đợi AI rút gọn.\`, 'warning');
                       rewriteQueue.push({ index: i, cleanText, actualDuration, targetDuration, originalBuffer: arrayBuffer });
                    } else {
                       addLog(\`  ⚠️ Câu \${i + 1} vẫn dài hơn khung dù đã ở \${MID_CAP_SPEED}x (AI rút gọn đang tắt). Chấp nhận audio hiện tại.\`, 'warning');
                       audioClips[i] = { buffer: arrayBuffer, startTime: sub.start };
                    }
                    sentenceSuccess = true;
                    updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                    continue;
                 }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Successfully fixed aiRewrite condition for group 3.");
} else {
    console.log("Regex not found.");
}
