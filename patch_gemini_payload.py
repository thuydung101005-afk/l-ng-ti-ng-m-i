import re

with open('src/hooks/useDubbingEngine.ts', 'r', encoding='utf-8') as f:
    engine_content = f.read()

# Replace the fetch body for gemini rewrite
# We will match the entire fetch call to be safe
pattern = r"const res = await fetch\('/api/gemini/rewrite', \{.*?body: JSON\.stringify\(\{ prompt: .*?\}\).*?\}\);"

replacement = """const res = await fetch('/api/gemini/rewrite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    text: cleanText,
                                    targetChars: targetChars,
                                    previousText: previousText,
                                    nextText: nextText,
                                    clientGeminiKeysStr: geminiApiKeysStr,
                                    attempt: 1
                                })
                            });"""

engine_content = re.sub(pattern, replacement, engine_content, flags=re.DOTALL)

with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("Gemini payload fixed successfully!")
