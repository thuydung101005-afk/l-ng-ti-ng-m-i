const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex5 = /setResultUrl\(objectUrl\);\n\s*const updatedSrtText = generateSrt\(processedSubs\);/;
if (code.match(regex5)) {
    code = code.replace(regex5, `setResultUrl(objectUrl);\n      setProgress(100);\n\n      const updatedSrtText = generateSrt(processedSubs);`);
} else {
    console.log("Regex5 failed");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Final progress updated.");
