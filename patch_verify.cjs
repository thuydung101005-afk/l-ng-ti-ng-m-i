const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /let gap = 2\.0;/,
    `let gap = 0.3;`
);

content = content.replace(
    /finalBuffer = await timeStretchBuffer\(decoded2, neededSpeed \/ renderSpeed2\);\n(\s*)addLog/,
    `finalBuffer = await timeStretchBuffer(decoded2, neededSpeed / renderSpeed2);
$1let decodedFinal2 = await audioCtx.decodeAudioData(finalBuffer.slice(0));
$1let diff2 = decodedFinal2.duration - targetDuration;
$1if (Math.abs(diff2) > 0.1) {
$1    addLog(\`  ⚠️ Verify Nhánh B: Câu \${i + 1} lệch \${diff2.toFixed(2)}s so với dự kiến.\`, 'warning');
$1}
$1addLog`
);

content = content.replace(
    /finalBuffer = await timeStretchBuffer\(decodedC2a, neededSpeedWithGap \/ renderSpeedC2a\);\n(\s*)addLog/,
    `finalBuffer = await timeStretchBuffer(decodedC2a, neededSpeedWithGap / renderSpeedC2a);
$1let decodedFinalC2a = await audioCtx.decodeAudioData(finalBuffer.slice(0));
$1let diffC2a = decodedFinalC2a.duration - (targetDuration + gap);
$1if (Math.abs(diffC2a) > 0.1) {
$1    addLog(\`  ⚠️ Verify Nhánh C2a: Câu \${i + 1} lệch \${diffC2a.toFixed(2)}s so với dự kiến.\`, 'warning');
$1}
$1addLog`
);

const reportLog = `      if (reportListRef.current.length > 0) {
        addLog(\`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`, 'warning');
        addLog(\`⚠️ \${reportListRef.current.length} câu chạm trần 2.0x, cần kiểm tra lại:\`, 'warning');
        reportListRef.current.forEach(p => {
            addLog(\`  • Câu \${p.index} — dư \${p.overflow.toFixed(2)}s (gap \${p.gap.toFixed(2)}s): "\${p.text}"\`, 'warning');
        });
        addLog(\`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`, 'warning');
      }

      addLog(\`🎉 Hoàn thành! Bạn có thể nghe thử hoặc tải xuống bên dưới.\`, 'success');`;

content = content.replace(
    /addLog\(`🎉 Hoàn thành! Bạn có thể nghe thử hoặc tải xuống bên dưới.`, 'success'\);/g,
    reportLog
);

fs.writeFileSync(path, content);
console.log('Success');
