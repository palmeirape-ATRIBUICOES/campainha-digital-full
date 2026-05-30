const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\thiag\\OneDrive\\Área de Trabalho\\campainha digital\\frontend\\src\\pages\\PorteiroDashboard.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("=== SCANNING PORTEIRODASHBOARD.JSX LINES ===");

lines.forEach((line, index) => {
  if (line.includes('alert') || line.includes('Alert') || line.includes('package') || line.includes('Package') || line.includes('booking') || line.includes('Booking') || line.includes('reserva') || line.includes('Reserva')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
