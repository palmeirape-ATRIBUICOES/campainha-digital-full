// Configuração central da URL do backend
// Em produção (GitHub Pages), usa o servidor Render.
// Em desenvolvimento local, usa localhost.
const hostname = window.location.hostname;
const isLocalhost = 
  hostname === 'localhost' || 
  hostname === '127.0.0.1' || 
  hostname.startsWith('192.168.') || 
  hostname.startsWith('10.') || 
  hostname.startsWith('172.') || 
  hostname.endsWith('.local');

export const API = import.meta.env.VITE_API_URL || (isLocalhost ? `http://${hostname}:3001` : 'https://campainha-digital.onrender.com');

export default API;
