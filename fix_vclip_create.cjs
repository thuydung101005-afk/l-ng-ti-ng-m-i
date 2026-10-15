const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /while \(createRetries < maxRetries\) \{\n\s*activeApiKey = getNextApiKey\(\);\n\s*try \{/g;
const replacement = `while (createRetries < maxRetries) {
      activeApiKey = getNextApiKey();
      
      if (projectExportIdRef?.current) {
        // Reuse existing export id to avoid re-creating job on network error
        data = { result: { projectExportId: projectExportIdRef.current } };
        addLog(\`  🔍 Khôi phục lại ID cũ (\${projectExportIdRef.current})...\`, 'info');
        break;
      }
            
      try {`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Replaced create job logic.");
} else {
    console.log("Regex failed");
}
