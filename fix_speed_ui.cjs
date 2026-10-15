const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className="space-y-2">\s*<label className="text-sm font-medium text-gray-700">Tốc độ \(Speed\)<\/label>\s*<input\s*type="number"\s*step="0\.1"\s*min="0\.5"\s*max="3\.0"\s*value=\{speed\}\s*onChange=\{\(e\) => setSpeed\(parseFloat\(e\.target\.value\)\)\}\s*className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"\s*disabled=\{isProcessing\}\s*\/>\s*<\/div>/m;
const replacement = ``;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Removed speed input");
} else {
    console.log("Regex failed to match speed UI");
}
