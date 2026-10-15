const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Inside continuous mode
const continuousRegex = /setIsProcessing\(false\);\n\s*return;/;
if (code.match(continuousRegex)) {
    code = code.replace(continuousRegex, `setProgress(100);\n        setIsProcessing(false);\n        return;`);
} else {
    console.log("Continuous regex failed!");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Continuous updated.");
