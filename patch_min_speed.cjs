const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state
const statesToAdd = `
  const [minAutoFitSpeed, setMinAutoFitSpeed] = useState(1.0);
`;
content = content.replace(/(const \[maxAutoFitSpeed, setMaxAutoFitSpeed\] = useState\(1\.42\);)/, "$1\n" + statesToAdd);

// 2. Replace hardcoded 1.3 logic in AutoFit 
// Instead of simple string replace, I will use regex targeting specific blocks.

content = content.replace(/let idealDuration = actualDuration1x \/ 1\.3;/g, 'let idealDuration = actualDuration1x / minAutoFitSpeed;');
content = content.replace(/1\.3x/g, '${minAutoFitSpeed}x');
content = content.replace(/neededSpeed = 1\.3;/g, 'neededSpeed = minAutoFitSpeed;');
content = content.replace(/if \(newNeededSpeed < 1\.3\) newNeededSpeed = 1\.3;/g, 'if (newNeededSpeed < minAutoFitSpeed) newNeededSpeed = minAutoFitSpeed;');

// 3. Update the UI block for maxAutoFitSpeed to include minAutoFitSpeed
const autoFitUI = `
                      <span className="text-sm font-semibold text-blue-900">Tính năng Autofit & AI Rewrite (Khuyên dùng)</span>
                      <span className="text-xs text-blue-700/80 mt-1">Hệ thống sẽ tự động đo lường và co giãn tốc độ để ép khít thoại vào video.</span>
                    </div>
                  </label>
                  
                  {autoFit && (
                    <div className="pl-8 mt-2 mb-4 space-y-2">
                      <div className="flex items-center space-x-3 bg-blue-50/50 p-2 rounded border border-blue-100">
                        <span className="text-sm font-medium text-blue-900">Ngưỡng TỐI THIỂU:</span>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0.5"
                          max="2.0"
                          value={minAutoFitSpeed}
                          onChange={(e) => setMinAutoFitSpeed(Number(e.target.value))}
                          className="w-20 p-1 border border-blue-200 rounded focus:ring-blue-500 text-sm"
                          disabled={isProcessing}
                        />
                        <span className="text-xs text-gray-600">x (Ưu tiên đọc ở tốc độ này)</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-red-50/50 p-2 rounded border border-red-100">
                        <span className="text-sm font-medium text-red-900">Ngưỡng TỐI ĐA:</span>
                        <input 
                          type="number" 
                          step="0.05"
                          min="1.0"
                          max="2.0"
                          value={maxAutoFitSpeed}
                          onChange={(e) => setMaxAutoFitSpeed(Number(e.target.value))}
                          className="w-20 p-1 border border-red-200 rounded focus:ring-red-500 text-sm"
                          disabled={isProcessing}
                        />
                        <span className="text-xs text-gray-600">x (Vượt ngưỡng này AI sẽ tự rút gọn câu)</span>
                      </div>
                    </div>
                  )}
`;
content = content.replace(/<span className="text-sm font-semibold text-blue-900">Tính năng Autofit & AI Rewrite.*?<\/div>\s*<\/div>\s*\)}/s, autoFitUI);

// Fix the backticks substitution that got literalized: 
// The regexes \`1.3x\` got replaced by \`\${minAutoFitSpeed}x\` which is actually what we want inside a template literal.

fs.writeFileSync('src/App.tsx', content);
console.log('App patched with minAutoFitSpeed!');
