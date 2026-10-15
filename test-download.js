async function run() {
  const res = await fetch('http://localhost:3000/api/proxy-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: "https://www.google.com/favicon.ico" })
  });
  console.log(res.status);
  const buf = await res.arrayBuffer();
  console.log(buf.byteLength);
}
run();
