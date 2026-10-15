const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/finalSpeed > 1\.5 && aiRewrite/g, "finalSpeed > 1.6 && aiRewrite");
code = code.replace(/vượt quá tốc độ 1\.5x/g, "vượt quá tốc độ 1.6x");
code = code.replace(/finalSpeed <= 1\.5/g, "finalSpeed <= 1.6");
code = code.replace(/<= 1\.5x/g, "<= 1.6x");
code = code.replace(/Math\.max\(speed, 1\.5\)/g, "Math.max(speed, 1.6)");
code = code.replace(/Tốc độ &gt; 1\.5/g, "Tốc độ &gt; 1.6");

fs.writeFileSync('src/App.tsx', code);
console.log("Updated max speed to 1.6.");
