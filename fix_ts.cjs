const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const rewriteQueue: \{ index: number, cleanText: string, actualDuration: number, targetDuration: number, originalBuffer: ArrayBuffer \}\[\] = \[\];/;
const replacement = `const rewriteQueue: { index: number, cleanText: string, actualDuration: number, targetDuration: number, originalBuffer: ArrayBuffer, rewriteSuccess?: boolean, newArrayBuffer?: ArrayBuffer, bestRewrite?: string }[] = [];`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed TS error");
} else {
    console.log("Regex failed");
}
