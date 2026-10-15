const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (code.includes('const [aiRewrite, setAiRewrite] = useState(true);')) {
    code = code.replace(
        "const [aiRewrite, setAiRewrite] = useState(true);",
        "const [aiRewrite, setAiRewrite] = useState(true);\n  const [concurrency, setConcurrency] = useState(2);"
    );
    fs.writeFileSync('src/App.tsx', code);
    console.log("State added!");
} else {
    console.log("Could not find state injection point");
}
