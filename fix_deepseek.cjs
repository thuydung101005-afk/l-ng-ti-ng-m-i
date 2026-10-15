const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const isGrok = currentKey.startsWith\("xai-"\);\s*const model = isGrok \? "grok-2-latest" : geminiModels\[\(attempt - 1\) % geminiModels.length\];\s*try \{\s*if \(isGrok\) \{[\s\S]*?break;\s*\} else \{/m;

const replacement = `const isGrok = currentKey.startsWith("xai-");
          const isDeepSeek = currentKey.startsWith("sk-");
          const model = isGrok ? "grok-2-latest" : (isDeepSeek ? "deepseek-chat" : geminiModels[(attempt - 1) % geminiModels.length]);
          
          try {
              if (isGrok || isDeepSeek) {
                  const apiUrl = isGrok ? "https://api.x.ai/v1/chat/completions" : "https://api.deepseek.com/chat/completions";
                  const res = await fetch(apiUrl, {
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json",
                          "Authorization": \`Bearer \${currentKey}\`
                      },
                      body: JSON.stringify({
                          messages: [
                              { role: "user", content: prompt }
                          ],
                          model: model,
                          temperature: 0.3
                      })
                  });
                  if (!res.ok) {
                      const errData = await res.text();
                      throw new Error(\`HTTP \${res.status}: \${errData}\`);
                  }
                  const data = await res.json();
                  resultText = data.choices[0].message.content.trim();
                  success = true;
                  break;
              } else {`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Added DeepSeek support!");
} else {
    console.log("Could not find regex match in server.ts");
}
