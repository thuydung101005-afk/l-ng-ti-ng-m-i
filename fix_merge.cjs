const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /finalBlob = await mergeAudioClips\(audioClips\);/m;
const replacement = `finalBlob = await mergeAudioClips(validAudioClips);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed merge variable!");
} else {
    console.log("Merge variable regex not matched!");
}
