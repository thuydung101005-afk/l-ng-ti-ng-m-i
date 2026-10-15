const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSuccessLogic = `                                 // Đánh giá xem đã giảm đủ chưa bằng cách đếm số từ (tiết kiệm quota V-Clip)
                                 const actualReducePercent = 1 - (newWords / currentWords);
                                 bestRewrite = rewriteResult;
                                 
                                 if (actualReducePercent >= targetReducePercent - 0.05) { // Cho phép du di 5%
                                    rewriteSuccess = true;
                                 } else {
                                    // Vẫn chưa giảm đủ, tính toán lại % cần giảm cho lần gọi AI tiếp theo
                                    targetReducePercent = Math.max(0, targetReducePercent - actualReducePercent);
                                    currentTextToRewrite = rewriteResult;
                                    currentWords = newWords;
                                 }`;

const newSuccessLogic = `                                 bestRewrite = rewriteResult;
                                 rewriteSuccess = true; // Luôn coi là thành công vì chỉ chạy 1 lần duy nhất`;

if (code.includes(oldSuccessLogic)) {
    code = code.replace(oldSuccessLogic, newSuccessLogic);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Success logic fixed");
} else {
    console.log("Could not find success logic block");
}
