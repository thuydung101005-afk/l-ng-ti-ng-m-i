const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `      const prompt = \`Hãy rút gọn câu này giảm chính xác khoảng \${req.body.reducePercent}%.\\nYêu cầu BẮT BUỘC:\\n- Không vượt quá độ dài mục tiêu sau khi giảm \${req.body.reducePercent}%.\\n- Giữ nguyên ý nghĩa.\\n- Không thêm nội dung.\\n- Ưu tiên ngắn hơn một chút để đảm bảo vừa thời gian.\\n- CHỈ ĐƯỢC trả về nội dung câu đã rút gọn, KHÔNG giải thích, KHÔNG thêm ngoặc kép.\\n\${contextStr}Câu cần rút gọn:\\n"\${text}"\`;`;

const newPrompt = `      const prompt = \`Hãy rút gọn câu này để có độ dài TỐI ĐA là \${req.body.targetChars} ký tự.
Yêu cầu BẮT BUỘC:
- Rút gọn sao cho độ dài của kết quả KHÔNG ĐƯỢC VƯỢT QUÁ \${req.body.targetChars} ký tự (tính cả dấu cách).
- Giữ nguyên ý nghĩa cốt lõi.
- Không thêm nội dung hay giải thích gì thêm.
- Ưu tiên ngắn hơn mục tiêu một chút để đảm bảo an toàn.
- CHỈ ĐƯỢC trả về nội dung câu đã rút gọn, KHÔNG giải thích, KHÔNG thêm ngoặc kép.
\${contextStr}
Câu cần rút gọn:
"\${text}"\`;`;

if (code.includes('Hãy rút gọn câu này giảm chính xác khoảng')) {
    code = code.replace(/const prompt = `Hãy rút gọn câu này giảm chính xác khoảng[\s\S]*?"\${text}"`;/, newPrompt);
    fs.writeFileSync('server.ts', code);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find the target code in server.ts");
}
