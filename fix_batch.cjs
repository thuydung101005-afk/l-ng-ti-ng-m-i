const fs = require('fs');

// 1. Cập nhật src/App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const appRegex = /const itemsPayload = chunk\.map\(item => \{([\s\S]*?)return \{/m;
const appReplacement = `const itemsPayload = chunk.map(item => {
                  let previousText = "";
                  if (item.index > 0) {
                     // Nếu câu trước đã có trong chunk này thì không cần gửi lại để tiết kiệm token
                     const isPrevInChunk = chunk.some(x => x.index === item.index - 1);
                     if (!isPrevInChunk) {
                         let prevSubText = processedSubs[item.index-1].text.trim();
                         if (prevSubText.startsWith('-')) prevSubText = prevSubText.substring(1).trim();
                         previousText = prevSubText;
                     }
                  }
                  let nextText = "";
                  if (item.index < totalSubs - 1) {
                     // Nếu câu sau đã có trong chunk này thì không cần gửi lại
                     const isNextInChunk = chunk.some(x => x.index === item.index + 1);
                     if (!isNextInChunk) {
                         let nextSubText = processedSubs[item.index+1].text.trim();
                         if (nextSubText.startsWith('-')) nextSubText = nextSubText.substring(1).trim();
                         nextText = nextSubText;
                     }
                  }
                  
                  if (!item.currentTextToRewrite) item.currentTextToRewrite = item.cleanText;
                  
                  let currentChars = item.currentTextToRewrite.length;
                  let targetSpeedForRewrite = Math.max(speed, 1.7);
                  let ratio = item.targetDuration / (item.actualDuration * (speed / targetSpeedForRewrite));
                  let targetChars = Math.floor(currentChars * ratio);
                  
                  if (!item.finalTargetChars) {
                     item.finalTargetChars = Math.max(1, targetChars - Math.floor(currentChars * 0.05));
                  }
                  item.targetSpeedForRewrite = targetSpeedForRewrite;
                  
                  return {`;

if (appCode.match(appRegex)) {
    appCode = appCode.replace(appRegex, appReplacement);
    fs.writeFileSync('src/App.tsx', appCode);
    console.log("Updated App.tsx context logic.");
} else {
    console.log("Regex failed in App.tsx");
}

// 2. Cập nhật server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

// Thay đổi prompt để hiển thị id gốc của câu
const serverRegex = /items\.forEach\(\(item, index\) => \{\s*prompt \+= "\\\n\[Câu " \+ \(index \+ 1\) \+ "\]\\\n";/m;
const serverReplacement = `items.forEach((item, index) => {
        prompt += "\\n[Câu số " + (item.id + 1) + "]\\n";`;

if (serverCode.match(serverRegex)) {
    serverCode = serverCode.replace(serverRegex, serverReplacement);
    fs.writeFileSync('server.ts', serverCode);
    console.log("Updated server.ts prompt format.");
} else {
    console.log("Regex failed in server.ts");
}
