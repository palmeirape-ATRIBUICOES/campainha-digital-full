const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\thiag\\OneDrive\\Área de Trabalho\\campainha digital\\frontend\\src\\pages\\PorteiroDashboard.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("=== SCANNING PORTEIRO UNIT SELECTION AND ACTIONS ===");

lines.forEach((line, index) => {
  if (line.includes('selectedUnit') || line.includes('Interfone') || line.includes('Mensagem') || line.includes('Sonoff') || line.includes('relé') || line.includes('rele')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
