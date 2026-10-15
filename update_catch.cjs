const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\} catch \(err: any\) \{\n\s*addLog\(\`  ⚠️ Lỗi câu \$\{i \+ 1\} \(lần \$\{sentenceAttempts\}\): \$\{err\.message\}\. Đang thử lại sau 2s\.\.\.\`, 'error'\);\n\s*await new Promise\(resolve => setTimeout\(resolve, 2000\)\);\n\s*\}/g;

const replacement = `} catch (err: any) {
               forceRefetch = true;
               addLog(\`  ⚠️ Lỗi câu \${i + 1} (lần \${sentenceAttempts}): \${err.message}. Đang thử lại sau 2s...\`, 'error');
               await new Promise(resolve => setTimeout(resolve, 2000));
            }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated catch 1.");
} else {
    console.log("Regex failed 2");
}
