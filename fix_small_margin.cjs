const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const margin = 1\.15 \+ Math\.min\(noiseRatio \* 2, 0\.3\);\s*if \(aiRewrite && estimatedSpeedNeeded > MID_CAP_SPEED \* margin\) \{/m;

const replacement = `const margin = 1.15 + Math.min(noiseRatio * 2, 0.3);
                 const smallMargin = 1.03; // chỉ cần đệm nhẹ để tránh dự đoán nhiễu nhỏ

                 if (aiRewrite && estimatedSpeedNeeded > MID_CAP_SPEED * margin) {`;

code = code.replace(regex, replacement);

const regex2 = /\} else if \(estimatedSpeedNeeded > NORMAL_SPEED \* margin\) \{/m;
const replacement2 = `} else if (estimatedSpeedNeeded > NORMAL_SPEED * smallMargin) {`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed smallMargin");
