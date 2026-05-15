import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Home, Phone, Smartphone, KeyRound } from 'lucide-react';
import Logo from '../components/Logo';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // Email ou Celular
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          identifier: identifier.trim(), 
          password: password.trim(),
          inviteCode: inviteCode.trim()
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('cd_token', data.token);
        localStorage.setItem('cd_user_id', data.user.id);
        
        // Redirecionamento unificado baseado nos módulos
        if (data.user.isSuperAdmin) navigate('/master-admin');
        else if (data.user.isAdmin) navigate('/admin');
        else if (data.user.isDoorman) navigate('/portaria');
        else navigate(`/morador/${data.user.id}`); // Dashboard de residente
      } else {
        alert(data.error || 'Erro ao processar solicitação.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#F8FAFC' }}>
      
      <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 10 }}>
         <Link to="/" style={{ color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <Home size={16} /> Voltar ao Início
         </Link>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px', background: '#FFF', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Logo size={42} />
          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-1px', marginTop: '20px', color: '#0F172A' }}>
            {isLogin ? 'Acessar Conta' : 'Criar Nova Conta'}
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B' }}>
            {isLogin ? 'Use seu celular ou e-mail cadastrado' : 'Simples, rápido e intuitivo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Seu Nome Completo" 
                style={{ padding: '14px 16px 14px 48px', width: '100%', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }} 
                value={name}
                onChange={e => setName(e.target.value)}
                required 
              />
            </div>
          )}
          
          <div style={{ position: 'relative' }}>
            <Smartphone size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: '#94A3B8' }} />
            <input 
              type="text" 
              placeholder="Celular ou E-mail" 
              style={{ padding: '14px 16px 14px 48px', width: '100%', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }} 
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: '#94A3B8' }} />
            <input 
              type="password" 
              placeholder="Sua Senha" 
              style={{ padding: '14px 16px 14px 48px', width: '100%', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Código de Convite (Opcional)" 
                style={{ padding: '14px 16px 14px 48px', width: '100%', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', background: '#F8FAFC' }} 
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ padding: '16px', marginTop: '8px', borderRadius: '12px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            disabled={loading}
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar Agora' : 'Criar Conta')} 
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: '14px', color: '#64748B' }}>
            {isLogin ? 'Ainda não tem acesso?' : 'Já possui uma conta?'}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 800, marginLeft: '6px', cursor: 'pointer' }}
            >
              {isLogin ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
