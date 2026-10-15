const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /let sentenceSuccess = false;\n\s*let sentenceAttempts = 0;\n\s*let exportIdRef: \{ current: string \| null \} = \{ current: null \};\n\s*while \(\!sentenceSuccess\) \{\n\s*sentenceAttempts\+\+;\n\s*try \{\n\s*let arrayBuffer = await runTTS\(cleanText, speed, i, exportIdRef\);/g;

const replacement = `let sentenceSuccess = false;
          let sentenceAttempts = 0;
          let exportIdRef: { current: string | null } = { current: null };
          let forceRefetch = false;
          while (!sentenceSuccess) {
            sentenceAttempts++;
            try {
              let arrayBuffer = await runTTS(cleanText, speed, i, exportIdRef, forceRefetch);
              forceRefetch = false;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated loop 1.");
} else {
    console.log("Regex failed 1");
}
