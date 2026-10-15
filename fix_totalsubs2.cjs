const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const audioClips: \(\{ buffer: ArrayBuffer; startTime: number; maxDuration\?: number \} \| null\)\[\] = new Array\(totalSubs\)\.fill\(null\);/m;
const replacement = `const totalSubs = processedSubs.length;\n      const audioClips: ({ buffer: ArrayBuffer; startTime: number; maxDuration?: number } | null)[] = new Array(totalSubs).fill(null);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    // Also remove the other totalSubs declaration to avoid redeclaration error
    const regex2 = /const totalSubs = processedSubs\.length;\s*\/\/ Hàng đợi 2: Các câu cần AI rewrite/m;
    code = code.replace(regex2, `// Hàng đợi 2: Các câu cần AI rewrite`);
    
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed totalSubs 2!");
} else {
    console.log("totalSubs 2 regex not matched!");
}
