const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/finalSpeed > 1\.6 && aiRewrite/g, "finalSpeed > 1.7 && aiRewrite");
code = code.replace(/vượt quá tốc độ 1\.6x/g, "vượt quá tốc độ 1.7x");
code = code.replace(/finalSpeed <= 1\.6/g, "finalSpeed <= 1.7");
code = code.replace(/<= 1\.6x/g, "<= 1.7x");
code = code.replace(/Math\.max\(speed, 1\.6\)/g, "Math.max(speed, 1.7)");
code = code.replace(/Tốc độ &gt; 1\.6/g, "Tốc độ &gt; 1.7");

fs.writeFileSync('src/App.tsx', code);
console.log("Updated max speed to 1.7.");
