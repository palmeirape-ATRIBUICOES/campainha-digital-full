const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\thiag\\OneDrive\\Área de Trabalho\\campainha digital\\frontend\\src\\pages\\ResidentDashboard.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("=== SEARCHING ALERTS IN RESIDENTDASHBOARD.JSX ===");
lines.forEach((line, index) => {
  if (line.includes('alerts') || line.includes('Alert') || line.includes('package') || line.includes('Package')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
