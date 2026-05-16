// Configuração central da URL do backend
// Em produção (GitHub Pages), usa o servidor Render.
// Em desenvolvimento local, usa localhost.
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:3001' : 'https://campainha-digital.onrender.com');

export default API;
