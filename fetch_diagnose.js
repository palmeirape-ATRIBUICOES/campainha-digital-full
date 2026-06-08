async function run() {
  console.log("Fetching production diagnostics...");
  try {
    const res = await fetch('https://campainha-digital.onrender.com/api/properties?email=nonexistent@test.com');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
run();
