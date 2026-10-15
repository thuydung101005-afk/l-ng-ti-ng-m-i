const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const uiBlock = `                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-blue-900 block">Số tiến trình đồng thời (Concurrency)</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number" 
                            min="1"
                            max="20"
                            value={concurrency}
                            onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
                            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            disabled={isProcessing}
                          />
                          <span className="text-xs text-blue-700/80">Số luồng xử lý song song. Tăng lên để render nhanh hơn.</span>
                        </div>
                      </div>
                    </div>`;

if (code.includes('AI Tự động rút gọn câu (Tốc độ &gt; 1.5)')) {
    code = code.replace(/<\/label>\s+<\/div>/, "</label>\n                    </div>" + "\n" + uiBlock);
    fs.writeFileSync('src/App.tsx', code);
    console.log("UI added!");
} else {
    console.log("Could not find UI injection point");
}
