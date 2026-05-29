import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminPanel from './pages/AdminPanel';
import VisitorCall from './pages/VisitorCall';
import ResidentDashboard from './pages/ResidentDashboard';
import AuthPage from './pages/AuthPage';
import ResidentLogin from './pages/ResidentLogin';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';

import MasterAdminDashboard from './pages/MasterAdminDashboard';
import PorteiroLogin from './pages/PorteiroLogin';
import PorteiroDashboard from './pages/PorteiroDashboard';
import VilaAdminDashboard from './pages/VilaAdminDashboard';

// ─── Proteção de rota: redireciona para login se não autenticado ──────────────
function PrivateRoute({ children }) {
  const token = localStorage.getItem('cd_token');
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}

// ─── Rota raiz inteligente: detecta sessão salva e redireciona ────────────────
function RootRedirect() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cd_token');
    if (!token) {
      setChecked(true);
      return;
    }

    // Determina para onde redirecionar com base no perfil salvo
    const isSuperAdmin  = localStorage.getItem('cd_is_super_admin') === 'true';
    const isVilaAdmin   = localStorage.getItem('cd_vila_property_id');
    const isAdmin       = localStorage.getItem('cd_admin_role') === 'client';
    const isDoorman     = localStorage.getItem('cd_admin_role') === 'doorman' || localStorage.getItem('cd_doorman_propertyId');
    const unitId        = localStorage.getItem('residentUnitId');
    const userId        = localStorage.getItem('cd_user_id');

    if (isSuperAdmin) {
      navigate('/master-admin', { replace: true });
    } else if (isVilaAdmin) {
      navigate('/vila-admin', { replace: true });
    } else if (isAdmin || isDoorman) {
      navigate('/admin', { replace: true });
    } else if (unitId || userId) {
      navigate(`/morador/${unitId || userId}`, { replace: true });
    } else {
      // Token existe mas sem informação de destino – vai para auth para revalidar
      setChecked(true);
    }
  }, [navigate]);

  // Enquanto verifica, mostra nada (evita flash da landing page)
  if (!checked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid #E2E8F0', borderTopColor: '#3B82F6',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Não logado — mostra a landing page normalmente
  return <LandingPage />;
}

// ─── Rota de Auth: se já logado, redireciona direto ──────────────────────────
function AuthRedirect() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cd_token');
    if (!token) {
      setChecked(true);
      return;
    }

    const isSuperAdmin  = localStorage.getItem('cd_is_super_admin') === 'true';
    const isVilaAdmin   = localStorage.getItem('cd_vila_property_id');
    const isAdmin       = localStorage.getItem('cd_admin_role') === 'client';
    const isDoorman     = localStorage.getItem('cd_admin_role') === 'doorman' || localStorage.getItem('cd_doorman_propertyId');
    const unitId        = localStorage.getItem('residentUnitId');
    const userId        = localStorage.getItem('cd_user_id');

    if (isSuperAdmin) {
      navigate('/master-admin', { replace: true });
    } else if (isVilaAdmin) {
      navigate('/vila-admin', { replace: true });
    } else if (isAdmin || isDoorman) {
      navigate('/admin', { replace: true });
    } else if (unitId || userId) {
      navigate(`/morador/${unitId || userId}`, { replace: true });
    } else {
      setChecked(true);
    }
  }, [navigate]);

  if (!checked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid #E2E8F0', borderTopColor: '#3B82F6',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <AuthPage />;
}

// ─── Detector de Erros On-Screen (Para Desenvolvimento e Diagnóstico) ──────
function DebugConsole() {
  const [errors, setErrors] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleNewError = (msg, stack = '') => {
      setErrors(prev => {
        // Evita duplicatas idênticas seguidas
        if (prev.length > 0 && prev[prev.length - 1].message === msg) return prev;
        const newErr = {
          id: Date.now() + '-' + Math.random(),
          message: msg,
          stack: stack,
          timestamp: new Date().toLocaleTimeString('pt-BR')
        };
        return [...prev.slice(-9), newErr]; // Limita aos 10 últimos
      });
    };

    const onError = (e) => {
      handleNewError(e.message || 'Erro de Execução', e.error?.stack || '');
    };

    const onUnhandledRejection = (e) => {
      const reason = e.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : '';
      handleNewError(`Promessa Rejeitada: ${msg}`, stack);
    };

    const onCustomError = (e) => {
      if (e.detail) {
        handleNewError(e.detail.message, e.detail.stack || '');
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('app-debug-error', onCustomError);

    // Intercepta console.error para exibir também na tela
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      const msg = args.map(arg => {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
      }).join(' ');
      
      const stack = new Error().stack || '';
      window.dispatchEvent(new CustomEvent('app-debug-error', { 
        detail: { message: msg, stack } 
      }));
    };

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('app-debug-error', onCustomError);
      console.error = originalConsoleError;
    };
  }, []);

  const handleCopy = () => {
    const text = errors.map(e => `[${e.timestamp}] ${e.message}\n${e.stack}`).join('\n\n');
    
    const fallbackCopy = () => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (err) {
        document.body.removeChild(textArea);
        console.error('Falha no fallback de copia:', err);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  if (errors.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 999999, fontFamily: 'monospace' }}>
      {/* Botão Flutuante (Badge de Aviso) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: '#FFF',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'pulse-error 1.5s infinite'
          }}
        >
          <span>🐞</span> {errors.length} Erro{errors.length !== 1 ? 's' : ''} Detectado{errors.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* Janela de Console flutuante */}
      {isOpen && (
        <div style={{
          width: '360px',
          maxHeight: '420px',
          background: '#0F172A',
          border: '2px solid #EF4444',
          borderRadius: '20px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          color: '#E2E8F0',
          fontSize: '11px',
          backdropFilter: 'blur(10px)',
          borderBottomLeftRadius: '0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #1E293B', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 800, color: '#EF4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🐞</span> DETECTOR DE FALHAS
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button 
                onClick={handleCopy}
                style={{ 
                  background: copied ? '#10B981' : 'rgba(255,255,255,0.06)', 
                  border: copied ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.1)', 
                  color: '#FFF', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontSize: '10px', 
                  fontWeight: 700,
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button 
                onClick={() => setErrors([])}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}
              >
                Limpar
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', marginLeft: '6px' }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {errors.map(err => (
              <div key={err.id} style={{ background: '#020617', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #EF4444', border: '1px solid rgba(239,68,68,0.15)', borderLeftWidth: '4px' }}>
                <div style={{ color: '#FCA5A5', fontWeight: 800, marginBottom: '6px', fontSize: '11.5px', lineHeight: 1.4 }}>{err.message}</div>
                {err.stack && (
                  <pre style={{ margin: 0, overflowX: 'auto', color: '#94A3B8', fontSize: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '100px', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '6px' }}>
                    {err.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
                <div style={{ fontSize: '9px', color: '#64748B', marginTop: '6px', textAlign: 'right', fontWeight: 600 }}>🕐 {err.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-error {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Rota raiz com detecção automática de sessão */}
          <Route path="/"               element={<RootRedirect />} />

          {/* Auth com verificação de sessão já existente */}
          <Route path="/auth"           element={<AuthRedirect />} />

          {/* Compat */}
          <Route path="/morador-login"  element={<Navigate to="/auth" replace />} />
          <Route path="/portaria-login" element={<Navigate to="/auth" replace />} />

          {/* Painéis protegidos */}
          <Route path="/admin"          element={<AdminPanel />} />
          <Route path="/master-admin"   element={<MasterAdminDashboard />} />
          <Route path="/portaria"       element={<PorteiroDashboard />} />
          <Route path="/morador/:id"    element={<ResidentDashboard />} />
          <Route path="/vila-admin"     element={<VilaAdminDashboard />} />

          {/* Públicas */}
          <Route path="/chamada/:id"    element={<VisitorCall />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failure" element={<PaymentFailure />} />

          {/* Fallback — não redireciona para landing para evitar loop em PWA */}
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <DebugConsole />
    </>
  );
}

export default App;
