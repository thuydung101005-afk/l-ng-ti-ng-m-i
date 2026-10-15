const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /targetSpeed: speed,/g;
const replacement = `targetSpeed: targetSpeedForRewrite,`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Updated targetSpeed in payload!");
} else {
    console.log("Could not find regex match!");
}
