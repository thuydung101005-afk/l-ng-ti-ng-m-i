const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const \[groupGap, setGroupGap\] = useState\(0\.4\);/, "const [groupGap, setGroupGap] = useState(0.8);");

fs.writeFileSync('src/App.tsx', code);
console.log("Changed groupGap default.");
