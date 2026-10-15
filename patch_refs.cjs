const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /let buffer1 = await runTTS\(cleanText, renderSpeed1, i, exportIdRef, forceRefetch\);/,
    `let exportIdRef1: { current: string | null } = { current: null };
                  let buffer1 = await runTTS(cleanText, renderSpeed1, i, exportIdRef1, forceRefetch);`
);

content = content.replace(
    /let buffer2 = await runTTS\(cleanText, renderSpeed2, i, exportIdRef, false\);/,
    `let exportIdRef2: { current: string | null } = { current: null };
                      let buffer2 = await runTTS(cleanText, renderSpeed2, i, exportIdRef2, false);`
);

content = content.replace(
    /let bufferC1 = await runTTS\(cleanText, 1\.65, i, exportIdRef, false\);/,
    `let exportIdRefC1: { current: string | null } = { current: null };
                          let bufferC1 = await runTTS(cleanText, 1.65, i, exportIdRefC1, false);`
);

content = content.replace(
    /let bufferC2a = await runTTS\(cleanText, renderSpeedC2a, i, exportIdRef, false\);/,
    `let exportIdRefC2a: { current: string | null } = { current: null };
                              let bufferC2a = await runTTS(cleanText, renderSpeedC2a, i, exportIdRefC2a, false);`
);

content = content.replace(
    /let bufferFallback = await runTTS\(cleanText, 1\.85, i, exportIdRef, false\);/,
    `let exportIdRefFallback: { current: string | null } = { current: null };
                                  let bufferFallback = await runTTS(cleanText, 1.85, i, exportIdRefFallback, false);`
);

fs.writeFileSync(path, content);
console.log('Success');
