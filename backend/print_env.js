console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("DIRECT_URL present:", !!process.env.DIRECT_URL);
console.log("DATABASE_URL value length:", process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);
console.log("DIRECT_URL value length:", process.env.DIRECT_URL ? process.env.DIRECT_URL.length : 0);
console.log("All Env Keys:", Object.keys(process.env).filter(k => k.includes("URL") || k.includes("DB") || k.includes("DATA")));
