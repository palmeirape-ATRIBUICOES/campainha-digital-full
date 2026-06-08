async function run() {
  console.log("Checking database connection status on Render...");
  try {
    const res = await fetch('https://campainha-digital.onrender.com/api/properties?email=nonexistent@test.com');
    console.log("Status Code:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
run();
