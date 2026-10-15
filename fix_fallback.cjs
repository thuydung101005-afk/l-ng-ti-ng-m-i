const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /addLog\(\`  ⚠️ Câu \$\{i \+ 1\} rút gọn thất bại\. Giữ nguyên câu gốc và ép tốc độ tối đa 2\.0x\.\`, 'warning'\);\n\s*let emergencySpeed = speed \* \(actualDuration \/ targetDuration\);\n\s*let appliedEmergencySpeed = Math\.min\(Number\(emergencySpeed\.toFixed\(2\)\) \+ 0\.01, 2\.0\);\n\s*newArrayBuffer = await runTTS\(cleanText, appliedEmergencySpeed, i\);/;

const replacement = `addLog(\`  ⚠️ Câu \${i + 1} rút gọn thất bại. Dùng time-stretch khẩn cấp, không tốn thêm credit.\`, 'warning');
              const decoded = await audioCtx.decodeAudioData(originalBuffer.slice(0));
              const emergencyRatio = actualDuration / targetDuration;
              newArrayBuffer = await timeStretchBuffer(decoded, emergencyRatio);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced fallback TTS with time stretch.");
} else {
    console.log("Regex failed");
}
