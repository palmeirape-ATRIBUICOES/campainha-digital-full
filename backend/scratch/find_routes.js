const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '..', 'server.js');
const content = fs.readFileSync(serverJsPath, 'utf8');

console.log("=== API ROUTES DEFINED IN SERVER.JS ===");
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('app.get(') || line.includes('app.post(') || line.includes('app.put(') || line.includes('app.delete(') || line.includes('router.get(') || line.includes('router.post(') || line.includes('router.put(') || line.includes('router.delete(')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
