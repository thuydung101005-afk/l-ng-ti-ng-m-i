const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const rewriteWorkers = Array\(concurrencyLimit\)\.fill\(0\)\.map\(\(\) => processRewriteQueue\(\)\);\n\s*await Promise\.all\(rewriteWorkers\);/;
const replacement = `await processRewriteQueue();`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated caller.");
} else {
    console.log("Regex failed");
}
