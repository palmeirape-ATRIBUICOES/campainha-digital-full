const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\thiag\\OneDrive\\Área de Trabalho\\campainha digital\\frontend\\src\\pages\\ResidentDashboard.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("=== SCANNING RESIDENTDASHBOARD.JSX LINES ===");

lines.forEach((line, index) => {
  if (line.includes('return (') || line.includes('function ResidentDashboard') || line.includes('className="sidebar"') || line.includes('className="tabs"') || line.includes('const render') || line.includes('tab ===')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
