const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const newBlock = fs.readFileSync('omnivoice_block.txt', 'utf8');

const runOmniOldStart = "const runOmnivoiceDuration = async";
const runOmniOldEnd = "};\n";

let startIdx = code.indexOf(runOmniOldStart);
let endIdx = code.indexOf(runOmniOldEnd, startIdx) + runOmniOldEnd.length;

const runOmniNew = `const runOmnivoiceRaw = async (text: string, speed: number, activeVoiceId: string): Promise<ArrayBuffer> => {
    addLog(\`  🚀 Đang gọi OmniVoice (Tốc độ: \${speed.toFixed(2)}x)...\`, 'info');
    const res = await fetch('/api/omnivoice/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text), voice_id: activeVoiceId, speed: Number(speed.toFixed(2)), postprocess_output: false })
    });
    if (!res.ok) throw new Error(\`Lỗi gọi OmniVoice API (HTTP \${res.status})\`);
    return await res.arrayBuffer();
  };\n`;

code = code.substring(0, startIdx) + runOmniNew + code.substring(endIdx);

const blockStart = "// ===== LUỒNG RIÊNG CHO OMNIVOICE (có kiểm tra AI rút gọn) =====";
const blockEnd = "// ===== HẾT LUỒNG RIÊNG OMNIVOICE =====";

let bStartIdx = code.indexOf(blockStart);
let bEndIdx = code.indexOf(blockEnd, bStartIdx) + blockEnd.length;

code = code.substring(0, bStartIdx) + newBlock + code.substring(bEndIdx);

fs.writeFileSync('src/App.tsx', code);
console.log('Patch complete.');
