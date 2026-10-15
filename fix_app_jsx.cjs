const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The block I wrongly added
const wrongBlock = `                    </label>
                    </div>
                    </div>
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

// What it should have been
const restoreBlock = `                    </label>
                  </div>`;

if (code.includes(wrongBlock)) {
    code = code.replace(wrongBlock, restoreBlock);
    console.log("Restored broken JSX");
} else {
    console.log("Could not find wrong block");
}

const correctInjectionPoint = `                          <span className="text-xs text-blue-700/80 mt-1">Tích hợp AI (Gemini/Grok): Thay vì ép tốc độ đọc quá nhanh, AI sẽ nhận diện các câu quá dài và tự động viết lại ngắn gọn nhưng vẫn giữ nguyên ý nghĩa, đảm bảo thoại luôn mượt mà.</span>
                        </div>
                      </label>
                    </div>`;

const newBlock = `                          <span className="text-xs text-blue-700/80 mt-1">Tích hợp AI (Gemini/Grok): Thay vì ép tốc độ đọc quá nhanh, AI sẽ nhận diện các câu quá dài và tự động viết lại ngắn gọn nhưng vẫn giữ nguyên ý nghĩa, đảm bảo thoại luôn mượt mà.</span>
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 border-t border-blue-100/50 pt-3">
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

if (code.includes(correctInjectionPoint)) {
    code = code.replace(correctInjectionPoint, newBlock);
    console.log("Injected UI correctly");
} else {
    console.log("Could not find new injection point");
}

fs.writeFileSync('src/App.tsx', code);
