const apiKey = "aiv_demo_key"; // I don't have a key, so it will fail with 401
async function run() {
  const res = await fetch('http://localhost:3000/api/aivoices/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice_id: "bac-nu-1", script_text: "Xin chào", speed: 1.0, apiKey })
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
