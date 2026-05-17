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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login'); // 'login' | 'register' | 'reset'
  const [recoveryToken, setRecoveryToken] = useState('');
  const [loginType, setLoginType] = useState('email'); // 'email' | 'code'
  const [accessCode, setAccessCode] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const plateFromUrl = queryParams.get('plate') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (view === 'login' && loginType === 'code') {
      try {
        const res = await fetch(`${API}/api/resident/login-by-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: accessCode.trim().toUpperCase() })
        });
        const data = await res.json();
        
        if (res.ok) {
          if (data.role === 'doorman') {
            localStorage.setItem('cd_token', data.token);
            localStorage.setItem('cd_user_id', data.userId || data.token);
            localStorage.setItem('cd_doorman_propertyId', data.propertyId);
            localStorage.setItem('cd_doorman_propertyName', data.propertyName);
            navigate('/portaria');
          } else if (data.role === 'admin') {
            localStorage.setItem('cd_token', data.token);
            localStorage.setItem('cd_user_id', data.userId || data.token);
            localStorage.setItem('cd_admin_email', data.adminEmail || '');
            localStorage.setItem('cd_admin_role', 'client');
            localStorage.setItem('cd_admin_propertyId', data.propertyId);
            localStorage.setItem('cd_admin_clientCode', data.clientCode || '');
            localStorage.setItem('cd_admin_propertyName', data.propertyName || '');
            navigate('/admin');
          } else if (data.unitId) {
            localStorage.setItem('residentUnitId', data.unitId);
            localStorage.setItem('residentName', data.unitName || 'Morador');
            localStorage.setItem('residentPropertyName', data.propertyName || '');
            localStorage.setItem('residentPropertyId', data.propertyId || '');
            localStorage.setItem('residentAccessCode', data.accessCode || accessCode || '');
            if (data.token) {
              localStorage.setItem('cd_token', data.token);
              localStorage.setItem('cd_user_id', data.userId || data.token);
            }
            navigate(`/morador/${data.unitId}`);
          } else {
            alert('Não foi possível identificar o destino do seu perfil.');
          }
        } else {
          alert(data.error || 'Código de acesso incorreto ou expirado.');
        }
      } catch (err) {
        console.error('Code login error:', err);
        alert('Erro ao tentar logar por código.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          identifier: identifier.trim(), 
          password: password.trim()
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('cd_token', data.token);
        localStorage.setItem('cd_user_id', data.user.id);
        
        if (view !== 'login' && plateFromUrl) {
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

        // Salvar chaves locais dependendo do perfil para persistência premium
        if (data.user.isSuperAdmin) {
          navigate('/master-admin');
        } else if (data.user.isAdmin) {
          localStorage.setItem('cd_admin_email', data.user.email || identifier || '');
          localStorage.setItem('cd_admin_role', 'client');
          localStorage.setItem('cd_admin_propertyId', data.user.propertyId || '');
          localStorage.setItem('cd_admin_clientCode', data.user.accessCode || '');
          localStorage.setItem('cd_admin_propertyName', data.user.propertyName || '');
          localStorage.setItem('cd_admin_name', data.user.name || '');
          navigate('/admin');
        } else if (data.user.isDoorman) {
          localStorage.setItem('cd_doorman_propertyId', data.user.propertyId || '');
          localStorage.setItem('cd_doorman_propertyName', data.user.propertyName || '');
          navigate('/portaria');
        } else if (data.user.isResident) {
          localStorage.setItem('residentUnitId', data.user.unitId || '');
          localStorage.setItem('residentName', data.user.name || 'Morador');
          localStorage.setItem('residentPropertyName', data.user.propertyName || '');
          localStorage.setItem('residentPropertyId', data.user.propertyId || '');
          localStorage.setItem('residentAccessCode', data.user.accessCode || '');
          navigate(`/morador/${data.user.unitId || data.user.id}`);
        } else {
          // Fallback padrão
          navigate(`/morador/${data.user.id}`);
        }
      } else {
        const errorMsg = data.details ? `Erro: ${data.error}\nDetalhes: ${data.details}` : (data.error || 'Erro ao processar solicitação.');
        alert(errorMsg);
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert('Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier) return alert('Digite seu e-mail ou celular para recuperar.');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Código de recuperação: ${data.debug_token}\n(Simulando envio por e-mail)`);
        setView('reset');
      } else {
        alert(data.error);
      }
    } catch { alert('Erro ao processar recuperação.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, token: recoveryToken, newPassword: password })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Senha redefinida com sucesso!');
        setView('login');
      } else {
        alert(data.error);
      }
    } catch { alert('Erro ao redefinir senha.'); }
    finally { setLoading(false); }
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

      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Logo />
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '24px' }}>
            {view === 'register' ? 'Crie sua conta' : (view === 'reset' ? 'Nova Senha' : 'Bem-vindo de volta')}
          </h1>
          <p style={{ color: '#64748B', marginTop: '8px' }}>
            {view === 'register' ? 'Comece a proteger sua residência hoje.' : (view === 'reset' ? 'Defina sua nova senha de acesso.' : 'Acesse o painel administrativo')}
          </p>
        </div>

        {view === 'reset' ? (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <input type="text" placeholder="Código de 6 dígitos" className="input-glass" value={recoveryToken} onChange={e => setRecoveryToken(e.target.value)} required />
            </div>
            <div className="input-group">
              <input type="password" placeholder="Nova Senha" className="input-glass" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Redefinindo...' : 'REDEFINIR SENHA'}
            </button>
            <button type="button" className="btn-link" onClick={() => setView('login')}>Voltar ao login</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Seletor de Tipo de Login (Apenas na Tela de Login) */}
            {view === 'login' && (
              <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '12px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setLoginType('email')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: loginType === 'email' ? '#FFF' : 'transparent',
                    color: loginType === 'email' ? '#1E293B' : '#64748B',
                    boxShadow: loginType === 'email' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Mail size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> E-mail / Celular
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType('code')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: loginType === 'code' ? '#FFF' : 'transparent',
                    color: loginType === 'code' ? '#1E293B' : '#64748B',
                    boxShadow: loginType === 'code' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <KeyRound size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Código de Acesso
                </button>
              </div>
            )}

            {view === 'register' && (
              <div className="input-group">
                <span className="input-icon"><User size={20} /></span>
                <input type="text" placeholder="Seu Nome Completo" className="input-glass" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            
            {view === 'login' && loginType === 'code' ? (
              <div className="input-group">
                <span className="input-icon"><KeyRound size={20} /></span>
                <input
                  type="text"
                  placeholder="Seu Código de Acesso (Ex: ABCD12)"
                  className="input-glass"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
            ) : (
              <>
                <div className="input-group">
                  <span className="input-icon">{identifier.includes('@') ? <Mail size={20} /> : <Phone size={20} />}</span>
                  <input type="text" placeholder="E-mail ou Celular" className="input-glass" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                </div>

                <div className="input-group">
                  <span className="input-icon"><Lock size={20} /></span>
                  <input type="password" placeholder="Senha" className="input-glass" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? 'Processando...' : (view === 'register' ? 'CRIAR MINHA CONTA' : 'ENTRAR NO PAINEL')}
              {!loading && <ArrowRight size={16} />}
            </button>

            {view === 'login' && loginType === 'email' && (
              <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                Esqueci minha senha
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <span style={{ color: '#64748B', fontSize: '14px' }}>
                {view === 'register' ? 'Já possui uma conta?' : 'Não possui uma conta?'}
              </span>
              <button 
                type="button" 
                className="btn-link" 
                onClick={() => setView(view === 'register' ? 'login' : 'register')}
                style={{ marginLeft: '8px', fontWeight: 700, color: 'var(--primary)' }}
              >
                {view === 'register' ? 'Faça login' : 'Cadastre-se grátis'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ position: 'absolute', bottom: '32px', textAlign: 'center', width: '100%', color: '#94A3B8', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Conexão Segura End-to-End
      </div>
    </div>
  );
}
