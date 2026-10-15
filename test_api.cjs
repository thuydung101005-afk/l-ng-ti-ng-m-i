fetch('http://localhost:3000/api/gemini/rewrite-batch', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        items: [{
            id: 0,
            text: "Xin chào các bạn",
            targetChars: 10,
            targetDuration: 1.5,
            targetSpeed: 1.5
        }],
        clientGeminiKeysStr: "sk-ant-api03-xxxx" // wait, DeepSeek uses sk-... Wait I don't have a deepseek key.
    })
}).then(r => r.text()).then(console.log).catch(console.error);
