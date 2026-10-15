const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexToExtractGetRegression = /\s*\/\/ \-\-\-\- Dự đoán trước, dùng NORMAL_SPEED làm baseline \-\-\-\-\s*const WINDOW_SIZE = 15;\s*const getRegression = \([\s\S]*?return \{ intercept, slope, mad, medianDuration \};\s*\};\s*/;

const extractedMatch = code.match(regexToExtractGetRegression);
if (extractedMatch) {
    code = code.replace(regexToExtractGetRegression, '\n              // ---- Dự đoán trước, dùng NORMAL_SPEED làm baseline ----\n');
    
    // Insert getRegression before makeQueueProcessor
    const insertPointRegex = /const makeQueueProcessor = \(indexList: number\[\]\) => \{/;
    code = code.replace(insertPointRegex, extractedMatch[0].trim() + '\n\n      ' + 'const makeQueueProcessor = (indexList: number[]) => {');
} else {
    console.log("Could not extract getRegression");
}

const innerLogicRegex = /const isGroupedSentence = smartGroup && sub\.text\.includes\(', '\);\s*const rateSamplesRef = isGroupedSentence \? speakingRateSamplesGrouped : speakingRateSamplesSingle;\s*const wordCount = cleanText\.trim\(\)\.split\(\/\\s\+\/\)\.length;\s*const rateStats = getRegression\(rateSamplesRef\.current\);\s*let renderSpeedToUse = RENDER_SPEED;\s*if \(wordCount <= 4 \|\| targetDuration <= 1\.0\) \{[\s\S]*?\} else if \(autoFit && rateStats\) \{\s*const \{ intercept, slope, mad, medianDuration \} = rateStats;\s*const estimatedDuration = intercept \+ slope \* wordCount;/;

const innerLogicReplacement = `const isGroupedSentence = smartGroup && sub.text.includes(', ');
              const rateSamplesRef = isGroupedSentence ? speakingRateSamplesGrouped : speakingRateSamplesSingle;
              const wordCount = cleanText.trim().split(/\\s+/).length;
              
              const ownStats = getRegression(rateSamplesRef.current);
              const rateStats = ownStats ?? getRegression([...speakingRateSamplesGrouped.current, ...speakingRateSamplesSingle.current]);

              let renderSpeedToUse = RENDER_SPEED;

              const worstCaseMinDuration = MIN_FIXED_OVERHEAD + wordCount * MIN_SEC_PER_WORD_AT_MAX_SPEED;
              const isTight = targetDuration < worstCaseMinDuration * IMMEDIATE_SAFE_FACTOR;

              if (wordCount < IMMEDIATE_SAFE_MIN_WORDS && isTight) {
                 renderSpeedToUse = MID_RENDER_SPEED;
                 addLog(\`  ⚡ Câu \${i + 1} ngắn và khung thời gian chật (\${targetDuration.toFixed(2)}s). Render ở \${MID_RENDER_SPEED}x.\`, 'info');
              } else if (autoFit && rateStats) {
                 const { intercept, slope, mad, medianDuration } = rateStats;
                 const estimatedDuration = Math.max(0.2, intercept + slope * wordCount);`;

code = code.replace(innerLogicRegex, innerLogicReplacement);


const updateSamplesRegex = /const expected = existingReg\.intercept \+ existingReg\.slope \* wordCount;\s*if \(Math\.abs\(normalizedDurationForSample \- expected\) \/ expected < 0\.5\) \{/;

const updateSamplesReplacement = `const expected = Math.max(0.2, existingReg.intercept + existingReg.slope * wordCount);
                  if (Math.abs(normalizedDurationForSample - expected) / expected < 0.5) {`;

code = code.replace(updateSamplesRegex, updateSamplesReplacement);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed inner loop and getRegression position");
