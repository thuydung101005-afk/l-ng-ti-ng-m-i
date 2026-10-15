const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const varsRegex = /let currentIndex = 0;\n\s*\/\/ Hàng đợi 2: Các câu cần AI rewrite/;
if (code.match(varsRegex)) {
    code = code.replace(varsRegex, `let currentIndex = 0;\n      let completedInitial = 0;\n      let completedRewrite = 0;\n      const updateProgress = (initial: number, rewrite: number, queueLen: number) => {\n        let p = 0;\n        if (queueLen === 0) {\n          p = (initial / totalSubs) * 90;\n        } else {\n          p = (initial / totalSubs) * 50 + (rewrite / queueLen) * 40;\n        }\n        setProgress(Math.round(p));\n      };\n      // Hàng đợi 2: Các câu cần AI rewrite`);
} else {
    console.log("Vars regex failed!");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Vars updated.");
