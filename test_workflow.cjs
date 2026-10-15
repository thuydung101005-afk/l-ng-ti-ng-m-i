const fs = require('fs');
const path = require('path');

// URL OmniVoice backend qua proxy server local
const API_URL = 'http://localhost:3000/api/omnivoice/generate';
const ATEMPO_URL = 'http://localhost:3000/api/ffmpeg/atempo';

// Bộ test: 1 câu ngắn và 1 câu dài để kiểm tra âm sắc & chống ngắt đuôi
const TEST_CASES = [
  {
    id: 'short',
    text: 'Dạ vâng, em hiểu rồi ạ.',
    targetDuration: 1.5,
  },
  {
    id: 'long',
    text: 'Hôm nay chúng ta sẽ cùng nhau tìm hiểu về quy trình lồng tiếng tự động bằng trí tuệ nhân tạo, đảm bảo âm sắc đồng nhất và không bị ngắt quãng.',
    targetDuration: 6.0,
  }
];

async function runPipeline() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KIỂM TRA QUY TRÌNH LỒNG TIẾNG OMNIVOICE');
  console.log('====================================================\n');

  for (const tc of TEST_CASES) {
    console.log(`\n▶️ [Test ${tc.id.toUpperCase()}]: "${tc.text}"`);

    try {
      // 1. Gọi API OmniVoice
      const t0 = Date.now();
      process.stdout.write('   1. Đang sinh giọng nói từ Colab... ');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: tc.text,
          voice_id: 'ngoc_huyen',
          speed: 1.0,
          postprocess_output: true,
          pad_duration: 0.1,
          fade_duration: 0.05
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const rawBuffer = Buffer.from(await res.arrayBuffer());
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      console.log(`Xong! (${elapsed}s, dung lượng: ${(rawBuffer.length / 1024).toFixed(1)} KB)`);

      // Lưu file thô để kiểm tra chất lượng ban đầu
      const rawFile = path.resolve(`./test_out_${tc.id}_raw.wav`);
      fs.writeFileSync(rawFile, rawBuffer);
      console.log(`   💾 File thô từ Colab: ${rawFile}`);

      // 2. Ép tốc độ qua FFmpeg atempo (tốc độ 1.25x)
      const testSpeed = 1.25;
      process.stdout.write(`   2. Đang ép tốc độ qua FFmpeg atempo (${testSpeed}x)... `);
      const atempoRes = await fetch(`${ATEMPO_URL}?speed=${testSpeed}`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: rawBuffer
      });

      if (!atempoRes.ok) {
        throw new Error(`Atempo HTTP ${atempoRes.status}: ${await atempoRes.text()}`);
      }

      const stretchedBuffer = Buffer.from(await atempoRes.arrayBuffer());
      const stretchedFile = path.resolve(`./test_out_${tc.id}_stretched.wav`);
      fs.writeFileSync(stretchedFile, stretchedBuffer);
      console.log(`Xong!`);
      console.log(`   💾 File sau khi ép tốc độ: ${stretchedFile}`);

      console.log(`   ✅ [Test ${tc.id.toUpperCase()}] HOÀN TẤT THÀNH CÔNG!`);
    } catch (err) {
      console.error(`\n   ❌ LỖI [Test ${tc.id}]:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 TẤT CẢ FILE ĐÃ ĐƯỢC XUẤT RA THƯ MỤC DỰ ÁN!');
  console.log('Bạn có thể mở trực tiếp các file test_out_*.wav để nghe.');
  console.log('====================================================\n');
}

runPipeline();
