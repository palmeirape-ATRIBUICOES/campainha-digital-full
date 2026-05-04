import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate auth success and redirect to admin
    navigate('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Decorative Glow */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(0,0,0,0) 70%)', zIndex: -1 }}></div>
      
      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '16px' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.imgur.com/your-logo.png'; }} />
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="text-muted">
            {isLogin ? 'Acesse seu painel para gerenciar suas placas.' : 'Inicie agora mesmo a transformação da sua segurança.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <User size={20} className="text-muted" style={{ position: 'absolute', top: '14px', left: '16px' }} />
              <input type="text" placeholder="Nome Completo" className="input-glass" style={{ paddingLeft: '48px' }} required />
            </div>
          )}
          
          <div style={{ position: 'relative' }}>
            <Mail size={20} className="text-muted" style={{ position: 'absolute', top: '14px', left: '16px' }} />
            <input type="email" placeholder="E-mail" className="input-glass" style={{ paddingLeft: '48px' }} required />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} className="text-muted" style={{ position: 'absolute', top: '14px', left: '16px' }} />
            <input type="password" placeholder="Senha" className="input-glass" style={{ paddingLeft: '48px' }} required />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', marginTop: '8px' }}>
            {isLogin ? 'Entrar' : 'Cadastrar'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p className="text-muted" style={{ fontSize: '14px' }}>
            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontWeight: 600, marginLeft: '8px', cursor: 'pointer', fontSize: '14px' }}
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
