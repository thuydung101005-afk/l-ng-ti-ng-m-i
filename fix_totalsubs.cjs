const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /let currentIndex = 0;\s*\/\/ Hàng đợi 2: Các câu cần AI rewrite/m;
const replacement = `let currentIndex = 0;\n      const totalSubs = processedSubs.length;\n      // Hàng đợi 2: Các câu cần AI rewrite`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed totalSubs!");
} else {
    console.log("totalSubs regex not matched!");
}
