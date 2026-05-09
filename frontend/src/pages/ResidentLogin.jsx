import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Home, BellRing, Hash, Building2, Download, CheckCircle, Eye, EyeOff } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ResidentLogin() {
  const [loginType, setLoginType] = useState('code'); // 'code' | 'email'
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail]       = useState('');
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
      if (res.ok && data.unitId) saveAndNavigate(data);
      else setError(data.error || 'Código inválido.');
    } catch { setError('Erro de conexão. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/resident/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accessCode: password })
      });
      const data = await res.json();
      if (res.ok && data.unitId) saveAndNavigate(data);
      else setError(data.error || 'Credenciais incorretas.');
    } catch { setError('Erro de conexão. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden' }}>

      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '20%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'mesh-pulse 18s infinite alternate' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'mesh-pulse 22s infinite alternate-reverse' }} />

      {/* Back link */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
          <Home size={15} /> Início
        </Link>
      </div>

      {/* ── PWA Banner ── */}
      {installPrompt && !installed && (
        <div style={{ position: 'fixed', bottom: '0', left: '0', right: '0', background: 'linear-gradient(135deg, rgba(0,10,20,0.98), rgba(0,20,40,0.98))', borderTop: '1px solid var(--primary)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 200, backdropFilter: 'blur(20px)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary), #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BellRing size={26} color="#000" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: '15px', margin: 0 }}>Instalar Campainha Digital</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Receba chamadas como app nativo — mesmo com a tela bloqueada</p>
          </div>
          <button onClick={handleInstall} style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <Download size={16} /> Instalar
          </button>
        </div>
      )}

      {installed && (
        <div style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(16,185,129,0.9)', color: '#000', padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 700, zIndex: 200, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={16} /> App instalado com sucesso!
        </div>
      )}

      {/* ── Card principal ── */}
      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', zIndex: 1, position: 'relative', marginBottom: installPrompt ? '100px' : '0' }}>

        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(16,185,129,0.08)', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.2)', marginBottom: '20px', boxShadow: '0 0 40px rgba(16,185,129,0.1)' }}>
            <BellRing size={36} color="#10B981" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>Minha Campainha</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>Acesse para receber chamadas do seu portão</p>
        </div>

        {/* Selector de tipo de login */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '28px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '6px', border: '1px solid var(--border-subtle)' }}>
          <button onClick={() => { setLoginType('code'); setError(''); }}
            style={{ padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', background: loginType === 'code' ? 'rgba(16,185,129,0.15)' : 'transparent', color: loginType === 'code' ? '#10B981' : 'var(--text-muted)', boxShadow: loginType === 'code' ? '0 0 0 1px rgba(16,185,129,0.3)' : 'none' }}>
            <Hash size={15} /> Código de Acesso
          </button>
          <button onClick={() => { setLoginType('email'); setError(''); }}
            style={{ padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', background: loginType === 'email' ? 'rgba(0,229,255,0.12)' : 'transparent', color: loginType === 'email' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: loginType === 'email' ? '0 0 0 1px rgba(0,229,255,0.3)' : 'none' }}>
            <Mail size={15} /> E-mail e Senha
          </button>
        </div>

        {/* Erro */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#EF4444', fontSize: '13px', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── MODO CÓDIGO ── (Condomínio / Vila) */}
        {loginType === 'code' && (
          <form onSubmit={handleCodeLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Building2 size={18} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Para <strong style={{ color: '#fff' }}>condomínios e vilas</strong>: insira o código único que o síndico ou proprietário lhe forneceu.
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <Hash size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Ex: A3F9C2"
                className="input-glass"
                style={{ paddingLeft: '48px', width: '100%', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '18px', fontWeight: 800, textAlign: 'center' }}
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }} disabled={loading}>
              {loading ? 'Verificando...' : <><ArrowRight size={20} /> Entrar com Código</>}
            </button>
          </form>
        )}

        {/* ── MODO E-MAIL ── (Casa simples) */}
        {loginType === 'email' && (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input type="email" placeholder="Seu e-mail" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input type={showPass ? 'text' : 'password'} placeholder="Código de acesso" className="input-glass" style={{ paddingLeft: '48px', paddingRight: '48px', width: '100%' }} value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '16px' }} disabled={loading}>
              {loading ? 'Conectando...' : <><ShieldCheck size={20} /> Acessar</>}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <Link to="/auth" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '12px', display: 'block' }}>
            Sou síndico / administrador →
          </Link>
        </div>
      </div>
    </div>
  );
}
