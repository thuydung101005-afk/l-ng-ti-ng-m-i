const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const apiUrl = "https:\/\/api\.deepseek\.com\/chat\/completions";/g,
  'const apiUrl = isGrok ? "https://api.x.ai/v1/chat/completions" : "https://api.deepseek.com/chat/completions";'
);

fs.writeFileSync('server.ts', code);
console.log("Reverted apiUrl patch");
