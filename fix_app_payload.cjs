const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /text: currentTextToRewrite,\s*targetChars: finalTargetChars,\s*previousText,/m;
const replacement = `text: currentTextToRewrite,
                                 targetChars: finalTargetChars,
                                 targetDuration: targetDuration,
                                 targetSpeed: speed,
                                 previousText,`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated API payload in src/App.tsx!");
} else {
    console.log("Could not find payload regex match in src/App.tsx");
}
