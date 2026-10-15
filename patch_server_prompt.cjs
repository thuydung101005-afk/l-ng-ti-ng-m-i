const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /let prompt = "Hãy viết lại và rút gọn các câu dưới đây theo yêu cầu cho từng câu\\.\\nYêu cầu BẮT BUỘC:\\n- Giữ nguyên ý nghĩa cốt lõi của câu gốc, mạch lạc và tự nhiên\\.\\n- Trả về KẾT QUẢ DƯỚI DẠNG MẢNG JSON, KHÔNG BỌC TRONG MARKDOWN CODE BLOCK, CHỈ TRẢ VỀ CHÍNH XÁC ARRAY JSON\\.\\n- Mỗi phần tử trong mảng tương ứng với một câu, chứa một trường 'result' mang nội dung đã rút gọn\\.\\n\\nDữ liệu đầu vào:\\n";/;

const replacement = `let prompt = "Hãy viết lại và rút gọn các câu dưới đây theo yêu cầu cho từng câu.\\n" +
      "Yêu cầu BẮT BUỘC:\\n" +
      "- BẮT BUỘC phải rút gọn nội dung ngắn hơn câu gốc, NHƯNG giữ nguyên ý nghĩa cốt lõi.\\n" +
      "- Trả về KẾT QUẢ DƯỚI DẠNG MẢNG JSON, KHÔNG BỌC TRONG MARKDOWN CODE BLOCK.\\n" +
      "- Mảng JSON trả về PHẢI CHỨA CHÍNH XÁC " + items.length + " phần tử, tương ứng với " + items.length + " câu đầu vào theo đúng thứ tự.\\n" +
      "- Mỗi phần tử chứa một trường 'result' mang nội dung đã rút gọn.\\n" +
      "- Độ dài 'result' không được vượt quá số ký tự tối đa yêu cầu.\\n\\nDữ liệu đầu vào:\\n";`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server.ts prompt");
} else {
    console.log("Regex not found in server.ts");
}
