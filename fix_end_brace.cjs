const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\} catch \(err: any\) \{\s*forceRefetch = true;\s*addLog\(`  ⚠️ Lỗi câu \$\{i \+ 1\} \(lần \$\{sentenceAttempts\}\): \$\{err\.message\}\. Đang thử lại sau 2s\.\.\.`, 'error'\);\s*await new Promise\(resolve => setTimeout\(resolve, 2000\)\);\s*\}\s*\}\s*\}\s*\};\s*const processRewriteQueue = async \(\): Promise<void> => \{/;

const replacement = `} catch (err: any) {
               forceRefetch = true;
               addLog(\`  ⚠️ Lỗi câu \${i + 1} (lần \${sentenceAttempts}): \${err.message}. Đang thử lại sau 2s...\`, 'error');
               await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      };
      };

      const processRewriteQueue = async (): Promise<void> => {`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Successfully fixed end brace.");
} else {
    console.log("Failed to match regex.");
}
