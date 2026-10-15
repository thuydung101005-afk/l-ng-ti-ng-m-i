const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /\/\/ Always treat the provided key as deepseek key, and use deepseek-chat\n\s*const model = "deepseek-chat";\n\s*try \{\n\s*if \(true\) \{/g,
  `const isGrok = currentKey.startsWith("xai-");
          const isDeepSeek = currentKey.startsWith("sk-");
          const model = isGrok ? "grok-2-latest" : (isDeepSeek ? "deepseek-chat" : geminiModels[(attempt - 1) % geminiModels.length]);
          
          try {
              if (isGrok || isDeepSeek) {`
);

fs.writeFileSync('server.ts', code);
console.log("Reverted deepseek patch");
