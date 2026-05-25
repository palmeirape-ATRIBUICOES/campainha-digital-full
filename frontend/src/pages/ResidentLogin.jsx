import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Home, BellRing, Hash, Building2, Download, CheckCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';

import { API } from '../config';

export default function ResidentLogin() {
  const [loginType, setLoginType] = useState('code'); // 'code' | 'email'
  const [accessCode, setAccessCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('residentUnitId');
    if (saved) navigate(`/morador/${saved}`);

    const bip = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', bip);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', bip);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setInstalled(true); }
  };

  const saveAndNavigate = (data) => {
    localStorage.setItem('residentUnitId', data.unitId);
    localStorage.setItem('residentName', data.unitName || 'Morador');
    localStorage.setItem('residentPropertyName', data.propertyName || '');
    localStorage.setItem('residentPropertyId', data.propertyId || '');
    // Se o login for por código, o código já está no state, se for por email, vem no data
    localStorage.setItem('residentAccessCode', data.accessCode || accessCode || '');
    localStorage.setItem('cd_is_house_resident', data.isHouseResident ? 'true' : 'false');
    localStorage.setItem('cd_is_condo_resident', data.isCondoResident ? 'true' : 'false');
    localStorage.setItem('cd_is_dependent', data.isDependent ? 'true' : 'false');
    localStorage.setItem('cd_parent_user_id', data.parentUserId || '');
    if (data.token) {
      localStorage.setItem('cd_token', data.token);
      localStorage.setItem('cd_user_id', data.userId || data.token);
    }
    navigate(`/morador/${data.unitId}`);
  };

  const handleCodeLogin = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/resident/login-by-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: accessCode.trim().toUpperCase() })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.role === 'doorman') {
          localStorage.setItem('cd_doorman_propertyId', data.propertyId);
          localStorage.setItem('cd_doorman_propertyName', data.propertyName);
          navigate('/portaria');
        } else if (data.role === 'admin') {
          // Admin do condomínio logando pelo código de cliente
          localStorage.setItem('cd_admin_email', data.adminEmail || '');
          localStorage.setItem('cd_admin_role', 'client');
          localStorage.setItem('cd_admin_propertyId', data.propertyId);
          localStorage.setItem('cd_admin_clientCode', data.clientCode || '');
          localStorage.setItem('cd_admin_propertyName', data.propertyName || '');
          navigate('/admin');
        } else if (data.unitId) {
          saveAndNavigate(data);
        } else {
          setError('Ocorreu um erro inesperado.');
        }
      } else {
        setError(data.error || 'Código inválido. Verifique com o síndico.');
      }
    } catch { setError('Erro de conexão. Verifique sua internet.'); }
    finally { setLoading(false); }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/resident/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), accessCode: password })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.role === 'admin') {
          // Admin do condomínio logando por email/senha
          localStorage.setItem('cd_admin_email', data.adminEmail || identifier);
          localStorage.setItem('cd_admin_role', 'client');
          localStorage.setItem('cd_admin_propertyId', data.propertyId);
          localStorage.setItem('cd_admin_clientCode', data.clientCode || '');
          localStorage.setItem('cd_admin_propertyName', data.propertyName || '');
          localStorage.setItem('cd_admin_name', data.clientName || '');
          navigate('/admin');
        } else if (data.unitId) {
          saveAndNavigate(data);
        } else {
          setError('Ocorreu um erro inesperado.');
        }
      } else {
        setError(data.error || 'Credenciais incorretas.');
      }
    } catch { setError('Erro de conexão. Verifique sua internet.'); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const identifier = loginType === 'email' ? email : accessCode;
    if (!identifier) return setError('Digite seu e-mail ou código para recuperar.');
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Um código de recuperação foi gerado: ${data.debug_token}\n(Em produção, este código seria enviado para você)`);
        setLoginType('reset');
      } else {
        setError(data.error);
      }
    } catch { setError('Erro ao processar recuperação.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const identifier = email || accessCode;
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, token: accessCode, newPassword: password })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Senha redefinida com sucesso!');
        setLoginType('email');
      } else {
        setError(data.error);
      }
    } catch { setError('Erro ao redefinir senha.'); }
    finally { setLoading(false); }
  };


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle Background elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 60%)', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 60%)', filter: 'blur(80px)' }} />

      {/* Back link */}
      <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 10 }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, padding: '8px 16px', background: '#FFF', borderRadius: '100px', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
          <Home size={15} /> Voltar ao Site
        </Link>
      </div>

      {/* ── PWA Banner ── */}
      {installPrompt && !installed && (
        <div className="fade-in" style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 48px)', maxWidth: '420px', background: '#FFF', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 200, border: '1px solid var(--border-subtle)', boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3B82F6, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)' }}>
            <BellRing size={28} color="#FFF" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: '15px', margin: '0 0 4px', color: 'var(--text-main)' }}>Instale o App</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>Notificações instantâneas e acesso com 1 toque.</p>
          </div>
          <button onClick={handleInstall} style={{ background: 'var(--text-main)', color: '#FFF', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, transition: 'transform 0.2s' }}>
            <Download size={16} /> Obter
          </button>
        </div>
      )}

      {/* ── Premium Login Card ── */}
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px', zIndex: 1, position: 'relative', marginBottom: installPrompt ? '100px' : '0' }}>
        
        {/* Logo superior */}
        <div style={{ textAlign: 'center', marginBottom: '40px', zIndex: 1 }}>
        <div style={{ marginBottom: '24px' }}>
          <Logo size={42} />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1.5px', marginBottom: '8px' }}>
          Acesso Morador
        </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Conecte-se à sua campainha digital</p>
        </div>

        <div style={{ background: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '32px', padding: '8px', boxShadow: '0 24px 80px rgba(0,0,0,0.06)' }}>
          
          {/* Toggle Switches */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '24px', padding: '6px', marginBottom: '32px', position: 'relative' }}>
            <button onClick={() => { setLoginType('code'); setError(''); }}
              style={{ flex: 1, padding: '14px', borderRadius: '18px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: loginType === 'code' ? '#FFF' : 'transparent', color: loginType === 'code' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: loginType === 'code' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
              <Hash size={18} /> Código
            </button>
            <button onClick={() => { setLoginType('email'); setError(''); }}
              style={{ flex: 1, padding: '14px', borderRadius: '18px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: loginType === 'email' ? '#FFF' : 'transparent', color: loginType === 'email' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: loginType === 'email' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
              <Mail size={18} /> E-mail/Celular
            </button>
          </div>

          <div style={{ padding: '0 24px 32px' }}>
            {/* Erro */}
            {error && (
              <div className="fade-in" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '14px 16px', marginBottom: '24px', color: '#FCA5A5', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} /> {error}
              </div>
            )}

            {/* ── MODO CÓDIGO ── */}
            {loginType === 'code' && (
              <form onSubmit={handleCodeLogin} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(16,185,129,0.05)', borderRadius: '16px', border: '1px dashed rgba(16,185,129,0.2)' }}>
                  <Building2 size={24} color="#10B981" />
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Morador de condomínio ou vila? Digite seu <strong style={{ color: '#10B981' }}>código único</strong>.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CÓDIGO DE ACESSO</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="EX: A3F9C2"
                      style={{ width: '100%', background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', color: 'var(--primary)', fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '8px', textAlign: 'center', transition: 'all 0.2s', outline: 'none' }}
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value.toUpperCase())}
                      maxLength={50}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#000', border: 'none', padding: '20px', borderRadius: '16px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 12px 32px rgba(16,185,129,0.3)', transition: 'transform 0.2s', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Validando...' : <><Sparkles size={20} /> Entrar na Campainha</>}
                </button>
              </form>
            )}

            {/* ── MODO E-MAIL/CELULAR ── */}
            {loginType === 'email' && (
              <form onSubmit={handleEmailLogin} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>E-MAIL OU CELULAR</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '20px', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
                    <input type="text" placeholder="nome@email.com ou (11) 99999-9999" className="input-glass" style={{ paddingLeft: '56px' }} value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>SENHA</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '20px', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
                    <input type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input-glass" style={{ paddingLeft: '56px', paddingRight: '56px' }} value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', zIndex: 2 }}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '16px', borderRadius: '16px', marginTop: '8px' }}>
                  {loading ? 'Conectando...' : <><ArrowRight size={20} /> Entrar</>}
                </button>

                <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}>
                  Esqueci minha senha
                </button>
              </form>
            )}

            {/* ── MODO RESET ── */}
            {loginType === 'reset' && (
              <form onSubmit={handleResetPassword} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Digite o código recebido e sua nova senha.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>CÓDIGO (6 DÍGITOS)</label>
                  <input type="text" className="input-glass" value={accessCode} onChange={e => setAccessCode(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>NOVA SENHA</label>
                  <input type="password" className="input-glass" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '20px', borderRadius: '16px' }}>
                  {loading ? 'Alterando...' : 'Redefinir Senha'}
                </button>
                <button type="button" onClick={() => setLoginType('email')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>
                  Voltar ao login
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Admin Link */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '100px', background: '#FFF', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            Sou síndico / administrador <ArrowRight size={14} />
          </Link>
        </div>
      </div>

    </div>
  );
}

