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
    const isAdmin       = localStorage.getItem('cd_admin_role') === 'client';
    const isDoorman     = localStorage.getItem('cd_doorman_propertyId');
    const unitId        = localStorage.getItem('residentUnitId');
    const userId        = localStorage.getItem('cd_user_id');

    if (isSuperAdmin) {
      navigate('/master-admin', { replace: true });
    } else if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isDoorman) {
      navigate('/portaria', { replace: true });
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
    const isAdmin       = localStorage.getItem('cd_admin_role') === 'client';
    const isDoorman     = localStorage.getItem('cd_doorman_propertyId');
    const unitId        = localStorage.getItem('residentUnitId');
    const userId        = localStorage.getItem('cd_user_id');

    if (isSuperAdmin) {
      navigate('/master-admin', { replace: true });
    } else if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isDoorman) {
      navigate('/portaria', { replace: true });
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

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
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

        {/* Públicas */}
        <Route path="/chamada/:id"    element={<VisitorCall />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />

        {/* Fallback — não redireciona para landing para evitar loop em PWA */}
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
