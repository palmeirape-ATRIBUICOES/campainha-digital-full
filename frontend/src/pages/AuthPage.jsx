import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Home, Phone, Smartphone, KeyRound, Sparkles, ChevronLeft, TreePine, Building2 } from 'lucide-react';
import Logo from '../components/Logo';
import { API } from '../config';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Com HashRouter, react-router-dom popula location.search corretamente
  // Ex: URL /#/auth?mode=register => location.search = '?mode=register'
  const queryParams = new URLSearchParams(location.search);
  const modeFromUrl = queryParams.get('mode') || '';
  const plateFromUrl = queryParams.get('plate') || '';

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Se URL contém mode=register, começa direto na tela de cadastro (passo 1 do wizard)
  const [view, setView] = useState(modeFromUrl === 'register' ? 'register' : 'login');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [loginType, setLoginType] = useState('email');
  const [accessCode, setAccessCode] = useState('');
  const [residenceType, setResidenceType] = useState('house');
  const [signUpStep, setSignUpStep] = useState(1);
  const [planType, setPlanType] = useState('trial');

  useEffect(() => {
    // Redireciona retornos do Mercado Pago (query params podem vir na URL real ou no hash)
    const rawSearch = window.location.search;
    const hashSearch = (() => {
      const h = window.location.hash;
      const qi = h.indexOf('?');
      return qi >= 0 ? h.slice(qi) : '';
    })();
    const allParams = new URLSearchParams(rawSearch || hashSearch);
    const status = allParams.get('status') || allParams.get('collection_status');
    const extRef = allParams.get('external_reference');

    if (extRef && (status === 'approved' || status === 'pending')) {
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate(`/payment-success?status=${status}&external_reference=${extRef}`);
    } else if (extRef && status === 'rejected') {
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/payment-failure');
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (view === 'register' && signUpStep < 3) {
        e.preventDefault();
        if (signUpStep === 1) {
          if (!name.trim() || !identifier.trim() || !password.trim()) {
            alert('Por favor, preencha todos os campos do cadastro.');
            return;
          }
          setSignUpStep(2);
        } else if (signUpStep === 2) {
          setSignUpStep(3);
        }
      }
    }
  };

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
            localStorage.setItem('cd_is_house_resident', data.isHouseResident ? 'true' : 'false');
            localStorage.setItem('cd_is_condo_resident', data.isCondoResident ? 'true' : 'false');
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

    if (view === 'register' && signUpStep < 3) {
      setLoading(false);
      if (signUpStep === 1) {
        if (!name.trim() || !identifier.trim() || !password.trim()) {
          alert('Por favor, preencha todos os campos.');
          return;
        }
        setSignUpStep(2);
      } else if (signUpStep === 2) {
        setSignUpStep(3);
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
          password: password.trim(),
          isHouseResident: residenceType === 'house',
          isCondoResident: residenceType === 'condo' || residenceType === 'village',
          planType
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('cd_user_contact', data.user.email || data.user.phone || identifier || '');
        if (data.initPoint) {
          localStorage.setItem('cd_token', data.token);
          localStorage.setItem('cd_user_id', data.user.id);
          localStorage.setItem('residentUnitId', data.user.unitId || '');
          localStorage.setItem('residentName', data.user.name || '');
          localStorage.setItem('residentPropertyName', data.user.propertyName || '');
          localStorage.setItem('residentPropertyId', data.user.propertyId || '');
          localStorage.setItem('residentAccessCode', data.user.accessCode || '');
          localStorage.setItem('cd_is_house_resident', data.user.isHouseResident ? 'true' : 'false');
          localStorage.setItem('cd_is_condo_resident', data.user.isCondoResident ? 'true' : 'false');
          
          window.location.href = data.initPoint;
          return;
        }

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
          localStorage.setItem('cd_is_house_resident', data.user.isHouseResident ? 'true' : 'false');
          localStorage.setItem('cd_is_condo_resident', data.user.isCondoResident ? 'true' : 'false');
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
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '24px', lineHeight: 1.2 }}>
            {view === 'register' 
              ? (signUpStep === 1 ? 'Crie sua conta' : (signUpStep === 2 ? 'Onde você mora?' : 'Escolha o plano'))
              : (view === 'reset' ? 'Nova Senha' : 'Bem-vindo de volta')
            }
          </h1>
          <p style={{ color: '#64748B', marginTop: '8px', fontSize: '14px' }}>
            {view === 'register'
              ? (signUpStep === 1 ? 'Comece a proteger sua residência hoje.' : (signUpStep === 2 ? 'Selecione o tipo de imóvel para o seu painel.' : 'Selecione sua ativação (15 dias grátis ou anual)'))
              : (view === 'reset' ? 'Defina sua nova senha de acesso.' : 'Acesse o painel da sua campainha digital')
            }
          </p>

          {/* Step Indicator Dot bar (only for signup) */}
          {view === 'register' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: signUpStep >= 1 ? 'var(--primary)' : '#E2E8F0', transition: 'all 0.3s' }} />
              <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: signUpStep >= 2 ? 'var(--primary)' : '#E2E8F0', transition: 'all 0.3s' }} />
              <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: signUpStep >= 3 ? 'var(--primary)' : '#E2E8F0', transition: 'all 0.3s' }} />
            </div>
          )}
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
            
            {/* ── TELA DE LOGIN ── */}
            {view === 'login' && (
              <>
                {/* Seletor de Tipo de Login (Apenas na Tela de Login) */}
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

                {loginType === 'code' ? (
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

                <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                  {loading ? 'Processando...' : 'ENTRAR NO PAINEL'}
                  {!loading && <ArrowRight size={16} />}
                </button>

                {loginType === 'email' && (
                  <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                    Esqueci minha senha
                  </button>
                )}
              </>
            )}

            {/* ── TELA DE CADASTRO (MULTI-PASSO WIZARD) ── */}
            {view === 'register' && signUpStep === 1 && (
              <>
                <div className="input-group">
                  <span className="input-icon"><User size={20} /></span>
                  <input type="text" placeholder="Seu Nome Completo" className="input-glass" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKeyDown} required />
                </div>
                
                <div className="input-group">
                  <span className="input-icon">{identifier.includes('@') ? <Mail size={20} /> : <Phone size={20} />}</span>
                  <input type="text" placeholder="E-mail ou Celular" className="input-glass" value={identifier} onChange={e => setIdentifier(e.target.value)} onKeyDown={handleKeyDown} required />
                </div>

                <div className="input-group">
                  <span className="input-icon"><Lock size={20} /></span>
                  <input type="password" placeholder="Senha de acesso" className="input-glass" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} required />
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    if (!name.trim() || !identifier.trim() || !password.trim()) {
                      alert('Por favor, preencha todos os campos do cadastro.');
                      return;
                    }
                    setSignUpStep(2);
                  }}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
                >
                  Próximo Passo <ArrowRight size={16} />
                </button>
              </>
            )}

            {view === 'register' && signUpStep === 2 && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Casa Option */}
                <div 
                  onClick={() => { setResidenceType('house'); setSignUpStep(3); }}
                  style={{
                    padding: '24px',
                    borderRadius: '20px',
                    border: residenceType === 'house' ? '2.5px solid #2563EB' : '1px solid #E2E8F0',
                    background: residenceType === 'house' ? '#F0F9FF' : '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    transition: 'all 0.25s',
                    boxShadow: residenceType === 'house' ? '0 8px 24px rgba(37,99,235,0.08)' : '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  className="hover-scale"
                >
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '18px', 
                    background: residenceType === 'house' ? 'rgba(37,99,235,0.1)' : '#F8FAFC', 
                    color: '#2563EB', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid rgba(37,99,235,0.1)'
                  }}>
                    <Home size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Sou Morador de Casa</h4>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.4 }}>Para casas de rua, condomínios horizontais ou individuais.</p>
                  </div>
                </div>

                {/* Condomínio Option */}
                <div 
                  onClick={() => { setResidenceType('condo'); setSignUpStep(3); }}
                  style={{
                    padding: '24px',
                    borderRadius: '20px',
                    border: residenceType === 'condo' ? '2.5px solid #10B981' : '1px solid #E2E8F0',
                    background: residenceType === 'condo' ? '#ECFDF5' : '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    transition: 'all 0.25s',
                    boxShadow: residenceType === 'condo' ? '0 8px 24px rgba(16,185,129,0.08)' : '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  className="hover-scale"
                >
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '18px', 
                    background: residenceType === 'condo' ? 'rgba(16,185,129,0.1)' : '#F8FAFC', 
                    color: '#10B981', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid rgba(16,185,129,0.1)'
                  }}>
                    <Building2 size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Sou Morador de Condomínio</h4>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.4 }}>Para apartamentos de edifícios, prédios ou vilas fechadas.</p>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setSignUpStep(1)} 
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '12px' }}
                >
                  ← Voltar para dados cadastrais
                </button>
              </div>
            )}

            {view === 'register' && signUpStep === 3 && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 15 Days Free Trial Card */}
                <div 
                  onClick={() => setPlanType('trial')}
                  style={{
                    padding: '20px',
                    borderRadius: '20px',
                    border: planType === 'trial' ? '2.5px solid #10B981' : '1px solid #E2E8F0',
                    background: planType === 'trial' ? '#F0FDF4' : '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s',
                    boxShadow: planType === 'trial' ? '0 4px 16px rgba(16,185,129,0.06)' : 'none'
                  }}
                  className="hover-scale"
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '14px', 
                    background: planType === 'trial' ? 'rgba(16,185,129,0.15)' : '#F8FAFC', 
                    color: '#10B981', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Testar Grátis</h4>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '100px' }}>15 DIAS TRIAL</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.3 }}>Acesso total e completo a todas as funções por 15 dias sem compromisso.</p>
                  </div>
                </div>

                {/* Annual Plan Card */}
                <div 
                  onClick={() => setPlanType('annual')}
                  style={{
                    padding: '20px',
                    borderRadius: '20px',
                    border: planType === 'annual' ? '2.5px solid #2563EB' : '1px solid #E2E8F0',
                    background: planType === 'annual' ? '#F0F9FF' : '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s',
                    boxShadow: planType === 'annual' ? '0 4px 16px rgba(37,99,235,0.06)' : 'none'
                  }}
                  className="hover-scale"
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '14px', 
                    background: planType === 'annual' ? 'rgba(37,99,235,0.15)' : '#F8FAFC', 
                    color: '#2563EB', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Plano Anual</h4>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB' }}>R$ 39,90 / ano</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.3 }}>Menos de R$ 3,33 por mês. Campainha ativa garantida pelo ano inteiro.</p>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                  {loading ? 'Processando...' : 'FINALIZAR E IR PARA O PAINEL'}
                  {!loading && <ArrowRight size={16} />}
                </button>

                <button 
                  type="button" 
                  onClick={() => setSignUpStep(2)} 
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  ← Voltar para tipo de moradia
                </button>
              </div>
            )}

            {/* Toggle view link (only displayed on step 1 of registration, or on login screen) */}
            {(view === 'login' || (view === 'register' && signUpStep === 1)) && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>
                  {view === 'register' ? 'Já possui uma conta?' : 'Não possui uma conta?'}
                </span>
                <button 
                  type="button" 
                  className="btn-link" 
                  onClick={() => {
                    setView(view === 'register' ? 'login' : 'register');
                    setSignUpStep(1);
                  }}
                  style={{ marginLeft: '8px', fontWeight: 700, color: 'var(--primary)' }}
                >
                  {view === 'register' ? 'Faça login' : 'Cadastre-se grátis'}
                </button>
              </div>
            )}

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
