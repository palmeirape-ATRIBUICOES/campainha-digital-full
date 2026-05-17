import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/morador-login" element={<Navigate to="/auth" />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/master-admin" element={<MasterAdminDashboard />} />
        <Route path="/chamada/:id" element={<VisitorCall />} />
        <Route path="/morador/:id" element={<ResidentDashboard />} />
        <Route path="/portaria-login" element={<Navigate to="/auth" />} />
        <Route path="/portaria" element={<PorteiroDashboard />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
