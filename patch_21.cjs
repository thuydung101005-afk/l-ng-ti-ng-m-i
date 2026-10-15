const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /if \(neededSpeedWithGap <= 2\.0\) \{/,
    `if (neededSpeedWithGap <= 2.1) {`
);

content = content.replace(
    /\/\/ MỚI: vượt 2\.0x -> đẩy vào AI rewrite queue thay vì ép cứng/,
    `// MỚI: vượt 2.1x -> đẩy vào AI rewrite queue thay vì ép cứng`
);

content = content.replace(
    /addLog\(\`  🔮 Câu \$\{i \+ 1\} vượt 2\.0x \(cần \$\{neededSpeedWithGap\.toFixed\(2\)\}x\)\. Đưa vào hàng đợi AI rút gọn dù đã tắt AI Rewrite\.\`, 'warning'\);/,
    `addLog(\`  🔮 Câu \${i + 1} vượt 2.1x (cần \${neededSpeedWithGap.toFixed(2)}x). Đưa vào hàng đợi AI rút gọn dù đã tắt AI Rewrite.\`, 'warning');`
);

content = content.replace(
    /\/\/ Không có key -> fallback ép 2\.0x như cũ/,
    `// Không có key -> fallback ép 2.1x`
);

content = content.replace(
    /let bufferFallback = await runTTS\(cleanText, 1\.85, i, exportIdRefFallback, false\);/,
    `let bufferFallback = await runTTS(cleanText, 1.95, i, exportIdRefFallback, false);`
);

content = content.replace(
    /finalBuffer = await timeStretchBuffer\(decodedFallback, 2\.0 \/ 1\.85\);/,
    `finalBuffer = await timeStretchBuffer(decodedFallback, 2.1 / 1.95);`
);

content = content.replace(
    /addLog\(\`  ⚠️ Câu \$\{i \+ 1\} vượt 2\.0x nhưng không có key AI\. Ép cứng 2\.0x\.\`, 'warning'\);/,
    `addLog(\`  ⚠️ Câu \${i + 1} vượt 2.1x nhưng không có key AI. Ép cứng 2.1x.\`, 'warning');`
);

content = content.replace(
    /overflow: \(\(rawDuration\*1\.4\)\/2\.0\)-\(targetDuration\+gap\)/,
    `overflow: ((rawDuration*1.4)/2.1)-(targetDuration+gap)`
);

content = content.replace(
    /addLog\(\`⚠️ \$\{reportListRef\.current\.length\} câu chạm trần 2\.0x, cần kiểm tra lại:\`, 'warning'\);/g,
    `addLog(\`⚠️ \${reportListRef.current.length} câu chạm trần 2.1x, cần kiểm tra lại:\`, 'warning');`
);

fs.writeFileSync(path, content);
console.log('Success');
