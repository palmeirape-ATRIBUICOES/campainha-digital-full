import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Home } from 'lucide-react';
import Logo from '../components/Logo';

export default function PorteiroLogin() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/api/doorman/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, doormanCode: code })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('cd_doorman_email', email);
        localStorage.setItem('cd_doorman_propertyId', data.propertyId);
        localStorage.setItem('cd_doorman_propertyName', data.propertyName);
        navigate('/portaria');
      } else {
        alert(data.error || 'Erro ao fazer login.');
      }
    } catch (err) {
      alert('Erro de conexão ao tentar logar.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden', background: '#F8FAFC' }}>
      
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0 }}></div>
      
      <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 10 }}>
         <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <Home size={16} /> Voltar ao Início
         </Link>
      </div>

      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '440px', padding: '48px 40px', zIndex: 1, position: 'relative' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ marginBottom: '24px' }}>
             <Logo size={42} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px', color: 'var(--text-main)' }}>Acesso Portaria</h2>
          <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>Painel exclusivo para controle e comunicação da portaria.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Mail size={20} className="text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', pointerEvents: 'none' }} />
            <input type="email" placeholder="E-mail da Portaria" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ position: 'relative', width: '100%' }}>
            <Lock size={20} className="text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', pointerEvents: 'none' }} />
            <input type="password" placeholder="Código Único de Portaria" className="input-glass" style={{ paddingLeft: '48px', width: '100%', letterSpacing: '2px', textTransform: 'uppercase' }} value={code} onChange={e => setCode(e.target.value.toUpperCase())} required />
          </div>
          <button type="submit" className="btn-primary w-full" style={{ padding: '16px', marginTop: '12px', fontSize: '16px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)' }}>
            Acessar Sistema <ArrowRight size={20} />
          </button>
        </form>

      </div>
    </div>
  );
}
