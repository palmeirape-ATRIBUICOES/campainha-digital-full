import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Home, BellRing, User, CreditCard, CheckCircle, Download, Smartphone } from 'lucide-react';

export default function ResidentLogin() {
  const [mode, setMode] = useState('login'); // login | register | payment | success
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Check if already logged in
    const savedUnit = localStorage.getItem('residentUnitId');
    if (savedUnit) {
      navigate(`/morador/${savedUnit}`);
    }

    // PWA Install
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/resident/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accessCode: password })
      });
      const data = await res.json();
      if (res.ok && data.unitId) {
        localStorage.setItem('residentUnitId', data.unitId);
        localStorage.setItem('residentName', data.unitName || 'Morador');
        localStorage.setItem('residentPropertyName', data.propertyName || '');
        navigate(`/morador/${data.unitId}`);
      } else {
        setError(data.error || 'Credenciais incorretas.');
      }
    } catch { setError('Erro de conexão.'); }
    finally { setLoading(false); }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!name || !email) return;
    setMode('payment');
  };

  const handlePayment = () => {
    // Simulate payment success
    setMode('success');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden', background: 'var(--bg-deep)' }}>
      
      <div style={{ position: 'absolute', top: '20%', right: '15%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 60%)', filter: 'blur(60px)', animation: 'mesh-pulse 18s infinite alternate ease-in-out', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0, 229, 255, 0.1) 0%, transparent 60%)', filter: 'blur(60px)', animation: 'mesh-pulse 22s infinite alternate-reverse ease-in-out', zIndex: 0 }}></div>
      
      <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 10 }}>
         <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <Home size={16} /> Início
         </Link>
      </div>

      {/* PWA Install Banner */}
      {installPrompt && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(16,185,129,0.2))', border: '1px solid var(--primary)', borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 100, backdropFilter: 'blur(16px)', maxWidth: '420px', width: 'calc(100% - 48px)' }}>
           <Smartphone size={28} color="var(--primary)" />
           <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>Instalar App</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Receba chamadas como app nativo</p>
           </div>
           <button onClick={handleInstall} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', width: 'auto' }}>Instalar</button>
        </div>
      )}

      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '440px', padding: '48px 40px', zIndex: 1, position: 'relative' }}>
        
        {/* === LOGIN MODE === */}
        {mode === 'login' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '24px', boxShadow: '0 0 40px rgba(16, 185, 129, 0.1)' }}>
                 <BellRing size={40} color="#10B981" />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>Minha Campainha</h2>
              <p className="text-muted" style={{ fontSize: '14px', lineHeight: 1.5 }}>Entre com seu e-mail e código de acesso para receber chamadas.</p>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#EF4444', fontSize: '13px', fontWeight: 600 }}>{error}</div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="email" placeholder="Seu e-mail" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="text" placeholder="Código de acesso" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '16px' }} disabled={loading}>
                {loading ? 'Conectando...' : 'Entrar'} <ArrowRight size={20} />
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Ainda não tem conta?
                <button onClick={() => { setMode('register'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, marginLeft: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  Cadastre-se e assine
                </button>
              </p>
              <Link to="/auth" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                Sou administrador / síndico →
              </Link>
            </div>
          </>
        )}

        {/* === REGISTER MODE === */}
        {mode === 'register' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: '20px', border: '1px solid rgba(0, 229, 255, 0.2)', marginBottom: '24px' }}>
                 <ShieldCheck size={40} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>Criar Conta</h2>
              <p className="text-muted" style={{ fontSize: '14px', lineHeight: 1.5 }}>Cadastre-se para ativar sua campainha digital e começar a receber chamadas.</p>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="text" placeholder="Seu nome completo" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="email" placeholder="Seu melhor e-mail" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="password" placeholder="Crie uma senha" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '16px' }}>
                Continuar para Pagamento <ArrowRight size={20} />
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                ← Já tenho conta, fazer login
              </button>
            </div>
          </>
        )}

        {/* === PAYMENT MODE === */}
        {mode === 'payment' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '24px' }}>
                 <CreditCard size={40} color="#F59E0B" />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>Assinatura Anual</h2>
              <p className="text-muted" style={{ fontSize: '14px', lineHeight: 1.5 }}>Ative sua campainha digital com uma única assinatura por ano.</p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Plano Casa Única</span>
                <div>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#10B981' }}>R$ 99</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ano</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#10B981" /> Atendimento remoto ilimitado</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#10B981" /> Foto automática do visitante</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#10B981" /> Monitoramento em modo furtivo</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#10B981" /> Placa QR Code inclusa</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#10B981" /> Suporte prioritário</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handlePayment} style={{ background: '#10B981', color: '#000', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
                <CreditCard size={20} /> Pagar com PIX
              </button>
              <button onClick={handlePayment} className="btn-secondary" style={{ padding: '14px', fontSize: '14px' }}>
                Pagar com Cartão de Crédito
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
              Possui condomínio? <strong style={{ color: 'var(--primary)' }}>Descontos especiais para múltiplas unidades.</strong>
            </p>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                ← Voltar ao cadastro
              </button>
            </div>
          </>
        )}

        {/* === SUCCESS MODE === */}
        {mode === 'success' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', marginBottom: '24px', boxShadow: '0 0 60px rgba(16, 185, 129, 0.2)' }}>
                 <CheckCircle size={48} color="#10B981" />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px', color: '#10B981' }}>Pagamento Confirmado!</h2>
              <p className="text-muted" style={{ fontSize: '14px', lineHeight: 1.5 }}>Sua campainha digital está ativada. Agora configure sua placa e comece a receber chamadas.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/admin" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
                  Configurar Minha Placa <ArrowRight size={20} />
                </button>
              </Link>

              {installPrompt && (
                <button onClick={handleInstall} className="btn-secondary" style={{ padding: '14px', fontSize: '14px' }}>
                  <Download size={18} /> Instalar App no Celular
                </button>
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '24px' }}>
              Seu código de acesso será gerado ao criar a placa.
            </p>
          </>
        )}

      </div>
    </div>
  );
}
