const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/finalSpeed > 1\.78 && aiRewrite/g, "finalSpeed > 1.8 && aiRewrite");
code = code.replace(/vượt quá tốc độ 1\.78x/g, "vượt quá tốc độ 1.8x");
code = code.replace(/finalSpeed <= 1\.78/g, "finalSpeed <= 1.8");
code = code.replace(/<= 1\.78x/g, "<= 1.8x");
code = code.replace(/Math\.max\(speed, 1\.78\)/g, "Math.max(speed, 1.8)");
code = code.replace(/Tốc độ &gt; 1\.78/g, "Tốc độ &gt; 1.8");

fs.writeFileSync('src/App.tsx', code);
console.log("Updated max speed to 1.8.");
