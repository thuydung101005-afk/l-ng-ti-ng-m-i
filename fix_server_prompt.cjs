const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const prompt = \`Hãy rút gọn câu này để có độ dài TỐI ĐA là \$\{req\.body\.targetChars\} ký tự\.[\s\S]*?\$\{contextStr\}\nCâu cần rút gọn:\n"\$\{text\}"\`;/m;

const replacement = `let durationStr = "";
      if (req.body.targetDuration && req.body.targetSpeed) {
          durationStr = \`\\n- Yêu cầu thời gian: Câu rút gọn phải đọc xong trong tối đa \${Number(req.body.targetDuration).toFixed(2)} giây (ở tốc độ đọc \${Number(req.body.targetSpeed).toFixed(1)}x).\`;
      }

      const prompt = \`Hãy viết lại và rút gọn câu dưới đây sao cho thật súc tích và mượt mà.
Yêu cầu BẮT BUỘC:\${durationStr}
- Giữ nguyên ý nghĩa cốt lõi của câu gốc.
- Không thêm nội dung, không giải thích, không tự ý bình luận.
- CHỈ ĐƯỢC trả về nội dung câu đã rút gọn, KHÔNG giải thích, KHÔNG thêm ngoặc kép.
\${contextStr}
Câu gốc cần rút gọn:
"\${text}"\`;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Updated AI prompt in server.ts!");
} else {
    console.log("Could not find prompt regex match in server.ts");
}
