const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add progress state
const stateRegex = /const \[isProcessing, setIsProcessing\] = useState\(false\);/;
if (code.match(stateRegex)) {
    code = code.replace(stateRegex, `const [isProcessing, setIsProcessing] = useState(false);\n  const [progress, setProgress] = useState(0);`);
} else {
    console.log("State regex failed!");
}

// 2. Reset progress
const startRegex = /setIsProcessing\(true\);\n\s*setLogs\(\[\]\);\n\s*setResultUrl\(null\);/;
if (code.match(startRegex)) {
    code = code.replace(startRegex, `setIsProcessing(true);\n    setProgress(0);\n    setLogs([]);\n    setResultUrl(null);`);
} else {
    console.log("Start regex failed!");
}

fs.writeFileSync('src/App.tsx', code);
console.log("State and reset added.");
