const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\thiag\\OneDrive\\Área de Trabalho\\campainha digital\\frontend\\src\\pages\\ResidentDashboard.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("=== SCANNING NAVBAR AND HAMBURGER ===");
lines.forEach((line, index) => {
  if (line.includes('const NavBar') || line.includes('const HamburgerMenu') || line.includes('return (') && index > 1900) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
