const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\/\/ Ghi nhận mẫu tốc độ đọc — đo tại mốc NORMAL_SPEED, đồng nhất cho mọi câu\s*speakingRateSamples\.current\.push\(cleanText\.length \/ actualDuration \* NORMAL_SPEED\);/m;

const replacement = `// Ghi nhận mẫu tốc độ đọc — đo tại mốc NORMAL_SPEED, đồng nhất cho mọi câu
              const newRate = wordCount / actualDuration * NORMAL_SPEED;
              const existingStats = getMedianAndMAD(rateSamplesRef.current);
              if (!existingStats || Math.abs(newRate - existingStats.median) / existingStats.median < 0.5) {
                rateSamplesRef.current.push(newRate);
              }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced record!");
} else {
    console.log("Regex failed to match record.");
}
