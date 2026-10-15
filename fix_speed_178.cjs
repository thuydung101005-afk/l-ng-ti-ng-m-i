const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/finalSpeed > 1\.7 && aiRewrite/g, "finalSpeed > 1.78 && aiRewrite");
code = code.replace(/vượt quá tốc độ 1\.7x/g, "vượt quá tốc độ 1.78x");
code = code.replace(/finalSpeed <= 1\.7/g, "finalSpeed <= 1.78");
code = code.replace(/<= 1\.7x/g, "<= 1.78x");
code = code.replace(/Math\.max\(speed, 1\.7\)/g, "Math.max(speed, 1.78)");
code = code.replace(/Tốc độ &gt; 1\.7/g, "Tốc độ &gt; 1.78");

fs.writeFileSync('src/App.tsx', code);
console.log("Updated max speed to 1.78.");
