const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(projectExportIdRef\?\.current\) \{([\s\S]*?)break;\s*\}\s*try \{/m;
const replacement = `if (projectExportIdRef?.current) {$1break;
      }
      
      activeApiKey = getNextApiKey();
      
      try {`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed activeApiKey");
} else {
    console.log("Failed to match regex");
}
