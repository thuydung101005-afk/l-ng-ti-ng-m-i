const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state
const statesToAdd = `
  const [maxAutoFitSpeed, setMaxAutoFitSpeed] = useState(1.42);
`;
content = content.replace(/(const \[fixedSpeed, setFixedSpeed\] = useState\(1\.3\);)/, "$1\n" + statesToAdd);

// 2. Replace hardcoded 1.42 with maxAutoFitSpeed in handleAnalyzeScript
content = content.replace(/neededSpeed > 1\.42/g, 'neededSpeed > maxAutoFitSpeed');

// 3. Replace hardcoded 1.42 in processAudio logic
content = content.replace(/speedWithFullGap <= 1\.42/g, 'speedWithFullGap <= maxAutoFitSpeed');
content = content.replace(/<= 1\.42x\)/g, '<= ${maxAutoFitSpeed}x)');
content = content.replace(/> 1\.42x\)/g, '> ${maxAutoFitSpeed}x)');
content = content.replace(/neededSpeed <= 1\.42/g, 'neededSpeed <= maxAutoFitSpeed');
content = content.replace(/> 1\.42x/g, '> ${maxAutoFitSpeed}x');
content = content.replace(/\/ 1\.42\)\)/g, '/ maxAutoFitSpeed))');
content = content.replace(/targetSpeed: 1\.42,/g, 'targetSpeed: maxAutoFitSpeed,');
content = content.replace(/newNeededSpeed > 1\.42/g, 'newNeededSpeed > maxAutoFitSpeed');
content = content.replace(/newNeededSpeed = 1\.42/g, 'newNeededSpeed = maxAutoFitSpeed');

// 4. Update the UI to include the maxAutoFitSpeed input
const autoFitUI = `
                      <span className="text-sm font-semibold text-blue-900">Tính năng Autofit & AI Rewrite (Khuyên dùng)</span>
                      <span className="text-xs text-blue-700/80 mt-1">Hệ thống sẽ tự động đo lường và co giãn tốc độ để ép khít thoại vào video.</span>
                    </div>
                  </label>
                  
                  {autoFit && (
                    <div className="pl-8 mt-2 mb-4">
                      <div className="flex items-center space-x-3 bg-blue-50/50 p-2 rounded border border-blue-100">
                        <span className="text-sm font-medium text-blue-900">Ngưỡng ép tốc độ tối đa:</span>
                        <input 
                          type="number" 
                          step="0.05"
                          min="1.0"
                          max="2.0"
                          value={maxAutoFitSpeed}
                          onChange={(e) => setMaxAutoFitSpeed(Number(e.target.value))}
                          className="w-20 p-1 border border-blue-200 rounded focus:ring-blue-500 text-sm"
                          disabled={isProcessing}
                        />
                        <span className="text-xs text-gray-600">x (Vượt ngưỡng này AI sẽ tự rút gọn câu)</span>
                      </div>
                    </div>
                  )}
`;
content = content.replace(/<span className="text-sm font-semibold text-blue-900">Tính năng Autofit & AI Rewrite.*?<\/label>/s, autoFitUI);

fs.writeFileSync('src/App.tsx', content);
console.log('App patched with maxAutoFitSpeed!');
