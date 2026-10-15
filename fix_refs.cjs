const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    /const speakingRateSamples = useRef<number\[\]>\(\[\]\);/g,
    'const speakingRateSamplesGrouped = useRef<number[]>([]);\n  const speakingRateSamplesSingle = useRef<number[]>([]);'
);

code = code.replace(
    /speakingRateSamples\.current = \[\];/g,
    'speakingRateSamplesGrouped.current = [];\n    speakingRateSamplesSingle.current = [];'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed refs");
