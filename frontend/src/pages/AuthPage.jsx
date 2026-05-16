import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Home, Phone, Smartphone, KeyRound, Sparkles, ChevronLeft } from 'lucide-react';
import Logo from '../components/Logo';
import { API } from '../config';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // Email ou Celular
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const plateFromUrl = queryParams.get('plate') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
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
        
        if (!isLogin && plateFromUrl) {
          try {
            await fetch(`${API}/api/auth/scan-plate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plateCode: plateFromUrl, userId: data.user.id })
            });
          } catch (e) {
            console.error('Error linking plate:', e);
          }
        }

        if (data.user.isSuperAdmin) navigate('/master-admin');
        else if (data.user.isAdmin) navigate('/admin');
        else if (data.user.isDoorman) navigate('/portaria');
        else navigate(`/morador/${data.user.id}`);
      } else {
        const errorMsg = data.details ? `Erro: ${data.error}\nDetalhes: ${data.details}` : (data.error || 'Erro ao processar solicitação.');
        alert(errorMsg);
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
      
      {/* Aurora Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>

      <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 10 }}>
         <Link to="/" style={{ color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, padding: '10px 18px', background: '#FFF', borderRadius: '100px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <ChevronLeft size={16} /> Voltar
         </Link>
      </div>

      <div className="glass-panel animate-fade-up" style={{ width: '100%', maxWidth: '440px', padding: '48px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '32px', boxShadow: '0 40px 100px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.8)', position: 'relative', zIndex: 1 }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ marginBottom: '24px' }}>
            <Logo size={48} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1.5px', color: '#0F172A', marginBottom: '8px' }}>
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p style={{ fontSize: '15px', color: '#64748B' }}>
            {isLogin ? 'Acesse o painel administrativo' : 'Comece a proteger sua residência hoje.'}
          </p>
          {plateFromUrl && !isLogin && (
            <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', color: '#047857', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <ShieldCheck size={18} /> Placa Detectada: {plateFromUrl}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '20px', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Nome Completo" 
                className="input-glass"
                style={{ paddingLeft: '52px' }}
                value={name}
                onChange={e => setName(e.target.value)}
                required 
              />
            </div>
          )}
          
          <div style={{ position: 'relative' }}>
            <Smartphone size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '20px', color: '#94A3B8' }} />
            <input 
              type="text" 
              placeholder="E-mail ou Celular" 
              className="input-glass"
              style={{ paddingLeft: '52px' }}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '20px', color: '#94A3B8' }} />
            <input 
              type="password" 
              placeholder="Senha" 
              className="input-glass"
              style={{ paddingLeft: '52px' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '20px', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Código de Convite (Opcional)" 
                className="input-glass"
                style={{ paddingLeft: '52px', background: '#F1F5F9', border: '1px dashed #CBD5E1' }}
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ padding: '18px', marginTop: '12px', borderRadius: '16px', fontSize: '16px', fontWeight: 800, gap: '12px', boxShadow: '0 20px 40px rgba(59,130,246,0.2)' }}
            disabled={loading}
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar no Painel' : 'Criar minha conta')} 
            {!loading && (isLogin ? <ArrowRight size={20} /> : <Sparkles size={20} />)}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: '15px', color: '#64748B' }}>
            {isLogin ? 'Não possui uma conta?' : 'Já tem uma conta?'}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 800, marginLeft: '8px', cursor: 'pointer', fontSize: '15px' }}
            >
              {isLogin ? 'Cadastre-se grátis' : 'Fazer login'}
            </button>
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ position: 'absolute', bottom: '32px', textAlign: 'center', width: '100%', color: '#94A3B8', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Conexão Segura End-to-End
      </div>
    </div>
  );
}
