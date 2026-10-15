const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const badText = `            addLog(\`  • Câu \${p.index} — dư \${p.overflow.toFixed                <select`;
const goodText = `            addLog(\`  • Câu \${p.index} — dư \${p.overflow.toFixed(2)}s (gap \${p.gap.toFixed(2)}s): "\${p.text}"\`, 'warning');
        });
        addLog(\`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`, 'warning');
      }

      addLog(\`🎉 Hoàn thành! Bạn có thể nghe thử hoặc tải xuống bên dưới.\`, 'success');

    } catch (err: any) {
      addLog(\`❌ Quá trình bị lỗi: \${err.message}\`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Config */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              VClip Auto Dub
            </h1>
            <p className="text-gray-500 mt-2">
              Công cụ lồng tiếng phim song song tự động. Biến SRT thành audio ghép chuẩn thời gian chạy ngay trên trình duyệt của bạn.
            </p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-medium tracking-tight">Cấu hình</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nguồn Giọng Đọc (TTS Provider)</label>
                <select`;

if (content.includes(badText)) {
  content = content.replace(badText, goodText);
  fs.writeFileSync(path, content);
  console.log('Success restore');
} else {
  console.log('Bad text not found');
}
