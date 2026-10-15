const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /let arrayBuffer = await runTTS\(cleanText, speed, i, exportIdRef, forceRefetch\);\s*forceRefetch = false;\s*let targetDuration = sub\.end - sub\.start;\s*if \(i < totalSubs - 1\) \{\s*const nextSub = processedSubs\[i\+1\];\s*if \(sub\.start \+ targetDuration > nextSub\.start\) \{\s*targetDuration = nextSub\.start - sub\.start;\s*\}\s*\}\s*if \(targetDuration <= 0\) targetDuration = 0\.1;\s*const getMedianRate = \(\) => \{\s*const samples = speakingRateSamples\.current;\s*if \(samples\.length < 5\) return null;\s*const sorted = \[\.\.\.samples\]\.sort\(\(a, b\) => a - b\);\s*return sorted\[Math\.floor\(sorted\.length \/ 2\)\];\s*\};\s*const medianRate = getMedianRate\(\);\s*if \(autoFit && aiRewrite && medianRate\) \{\s*const estimatedDuration = cleanText\.length \/ medianRate \/ speed;\s*const estimatedSpeedNeeded = speed \* \(estimatedDuration \/ targetDuration\);\s*if \(estimatedSpeedNeeded > 1\.8 \* 1\.3\) \{ \/\/ biên độ an toàn 1\.3\s*addLog\(`  🔮 Câu \$\{i \+ 1\} dự đoán quá dài \(cần ~\$\{estimatedSpeedNeeded\.toFixed\(1\)\}x\)\. Đưa thẳng vào hàng đợi AI\.\.\.`, 'warning'\);\s*rewriteQueue\.push\(\{ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any \}\);\s*updateProgress\(\+\+completedInitial, completedRewrite, rewriteQueue\.length\);\s*continue; \/\/ Bỏ qua render thử\s*\}\s*\}/m;

const replacement = `let targetDuration = sub.end - sub.start;
              if (i < totalSubs - 1) {
                 const nextSub = processedSubs[i+1];
                 if (sub.start + targetDuration > nextSub.start) {
                    targetDuration = nextSub.start - sub.start;
                 }
              }
              if (targetDuration <= 0) targetDuration = 0.1;

              const getMedianRate = () => {
                const samples = speakingRateSamples.current;
                if (samples.length < 5) return null;
                const sorted = [...samples].sort((a, b) => a - b);
                return sorted[Math.floor(sorted.length / 2)];
              };

              const medianRate = getMedianRate();
              if (autoFit && aiRewrite && medianRate) {
                 const estimatedDuration = cleanText.length / medianRate / speed;
                 const estimatedSpeedNeeded = speed * (estimatedDuration / targetDuration);
                 
                 if (estimatedSpeedNeeded > 1.8 * 1.3) {
                     addLog(\`  🔮 Câu \${i + 1} dự đoán quá dài (cần ~\${estimatedSpeedNeeded.toFixed(1)}x). Bỏ qua render thử.\`, 'warning');
                     rewriteQueue.push({ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any });
                     sentenceSuccess = true;
                     updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                     continue;
                 }
              }

              let arrayBuffer = await runTTS(cleanText, speed, i, exportIdRef, forceRefetch);
              forceRefetch = false;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed prediction block successfully!");
} else {
    console.log("Regex failed to match");
}
