const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("{autoFit && (\n                    <div className=\"pl-8 mt-4 border-t border-blue-100/50 pt-3\">", "{autoFit && (\n                  <>\n                    <div className=\"pl-8 mt-4 border-t border-blue-100/50 pt-3\">");

code = code.replace("                      </div>\n                    </div>\n                  )}", "                      </div>\n                    </div>\n                  </>\n                  )}");

fs.writeFileSync('src/App.tsx', code);
console.log("Added Fragments");
