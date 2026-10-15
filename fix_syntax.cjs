const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /updateProgress\(\+\+completedInitial, completedRewrite, rewriteQueue\.length\);\s+continue;\s+\} else \{\s+if \(aiRewrite\) \{[\s\S]*?updateProgress\(\+\+completedInitial, completedRewrite, rewriteQueue\.length\);/;

if (code.match(regex)) {
    code = code.replace(regex, 'updateProgress(++completedInitial, completedRewrite, rewriteQueue.length);');
    fs.writeFileSync('src/App.tsx', code);
    console.log("Successfully fixed syntax.");
} else {
    console.log("Regex not found.");
}
