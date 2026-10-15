const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\/\/ ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----\s*const getMedianRate = \(\) => \{\s*const samples = speakingRateSamples\.current;\s*if \(samples\.length < 5\) return null;\s*const sorted = \[\.\.\.samples\]\.sort\(\(a, b\) => a - b\);\s*return sorted\[Math\.floor\(sorted\.length \/ 2\)\];\s*\};\s*const medianRate = getMedianRate\(\);\s*if \(autoFit && aiRewrite && medianRate\) \{\s*const estimatedDuration = cleanText\.length \/ medianRate \/ NORMAL_SPEED; \/\/ chia cho NORMAL_SPEED\s*const estimatedSpeedNeeded = NORMAL_SPEED \* \(estimatedDuration \/ targetDuration\); \/\/ nhân NORMAL_SPEED\s*if \(estimatedSpeedNeeded > 1\.8 \* 1\.3\) \{\s*addLog\(`  🔮 Câu \$\{i \+ 1\} dự đoán quá dài \(~\$\{estimatedSpeedNeeded\.toFixed\(1\)\}x\)\. Bỏ qua render thử\.`, 'warning'\);\s*rewriteQueue\.push\(\{ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any \}\);\s*sentenceSuccess = true;\s*updateProgress\(\+\+completedInitial, completedRewrite, rewriteQueue\.length\);\s*continue;\s*\}\s*\}/m;

const replacement = `// ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----
              const WINDOW_SIZE = 15;
              const getMedianAndMAD = (samples: number[]) => {
                if (samples.length < 5) return null;
                const recent = samples.slice(-WINDOW_SIZE);
                const sorted = [...recent].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const deviations = recent.map(s => Math.abs(s - median)).sort((a, b) => a - b);
                const mad = deviations[Math.floor(deviations.length / 2)];
                return { median, mad };
              };

              const isGroupedSentence = smartGroup && sub.text.includes(', ');
              const rateSamplesRef = isGroupedSentence ? speakingRateSamplesGrouped : speakingRateSamplesSingle;
              const wordCount = cleanText.trim().split(/\\s+/).length;
              const rateStats = getMedianAndMAD(rateSamplesRef.current);

              if (autoFit && aiRewrite && rateStats) {
                 const { median, mad } = rateStats;
                 const estimatedDuration = wordCount / median / NORMAL_SPEED;
                 const estimatedSpeedNeeded = NORMAL_SPEED * (estimatedDuration / targetDuration);

                 const noiseRatio = mad / median;
                 const margin = 1.15 + Math.min(noiseRatio * 2, 0.3);

                 if (estimatedSpeedNeeded > 1.8 * margin) {
                     addLog(\`  🔮 Câu \${i + 1} dự đoán quá dài (~\${estimatedSpeedNeeded.toFixed(1)}x, margin \${margin.toFixed(2)}). Bỏ qua render thử.\`, 'warning');
                     rewriteQueue.push({ index: i, cleanText, actualDuration: estimatedDuration, targetDuration, originalBuffer: null as any });
                     sentenceSuccess = true;
                     updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);
                     continue;
                 }
              }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced median!");
} else {
    console.log("Regex failed to match median");
}
