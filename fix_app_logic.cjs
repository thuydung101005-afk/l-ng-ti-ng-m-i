const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// fix concurrencyLimit
code = code.replace(
    /const concurrencyLimit = [^\n]+;/,
    "const concurrencyLimit = concurrency;"
);

// fix maxAttempts
code = code.replace(
    /const maxAttempts = 2; \/\/ Gọi AI tối đa 2 lần/,
    "const maxAttempts = 1; // Hướng đến rút gọn 1 lần duy nhất"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Logic fixed!");
