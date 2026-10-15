const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const charsPerSecond = item\.cleanText\.length \/ item\.actualDuration;\s*const estimatedDuration = rewritten\.length \/ charsPerSecond \/ item\.targetSpeedForRewrite;/m;

const replacement = `const cleanWordCount = item.cleanText.trim().split(/\\s+/).length;
                         const rewrittenWordCount = rewritten.trim().split(/\\s+/).length;
                         const wordsPerSecond = cleanWordCount / item.actualDuration;
                         const estimatedDuration = rewrittenWordCount / wordsPerSecond / item.targetSpeedForRewrite;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced chars!");
} else {
    console.log("Regex failed to match chars.");
}
