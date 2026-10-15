const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const \[aivoicesList, setAivoicesList\] = useState<\{ voice_id: string; name: string; gender: string; region: string \}\[\]>\(\[\]\);/;
const replacement = `const [aivoicesList, setAivoicesList] = useState<{ voice_id: string; name: string; gender: string; region: string }[]>([]);\n  const ttsCache = useRef(new Map<string, ArrayBuffer>());`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Cache ref added.");
} else {
    console.log("Regex failed");
}
