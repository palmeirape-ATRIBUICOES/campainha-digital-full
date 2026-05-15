import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Home, Building2, House, TreePine } from 'lucide-react';
import Logo from '../components/Logo';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // step 1: dados pessoais, step 2: tipo de imóvel
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [adminRole, setAdminRole] = useState(''); // 'sindico' | 'admin_vila'
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const emailInput = (formData.get('email') || '').trim();
    const authInput = (formData.get('authInput') || '').trim();

    if (!emailInput || !authInput) {
      alert('Preencha todos os campos.');
      return;
    }

    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: authInput, clientCode: authInput })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('cd_admin_email', data.email);
        if (data.role === 'master') {
          localStorage.setItem('cd_admin_role', 'master');
          navigate('/master-admin');
        } else if (data.role === 'doorman') {
          localStorage.setItem('cd_admin_role', 'doorman');
          localStorage.setItem('cd_doorman_propertyId', data.propertyId);
          localStorage.setItem('cd_doorman_propertyName', data.propertyName);
          navigate('/portaria');
        } else {
          // Admin de condomínio — salva propertyId e clientCode para carregar painel correto
          localStorage.setItem('cd_admin_role', 'client');
          if (data.propertyId) localStorage.setItem('cd_admin_propertyId', data.propertyId);
          if (data.clientCode) localStorage.setItem('cd_admin_clientCode', data.clientCode);
          if (data.propertyName) localStorage.setItem('cd_admin_propertyName', data.propertyName);
          navigate('/admin');
        }
      } else {
        alert(data.error || 'Credenciais inválidas. Verifique seu e-mail e código de acesso.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    }
  };

  const handleRegisterStep1 = (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    localStorage.setItem('cd_admin_name', name);
    localStorage.setItem('cd_admin_email', email);
    localStorage.setItem('cd_admin_password', password);
    setStep(2);
  };

  const handleRegisterStep2 = () => {
    if (!propertyType) return;
    localStorage.setItem('cd_admin_role', adminRole || 'client');
    localStorage.setItem('cd_property_type', propertyType);
    navigate('/admin');
  };

  const propertyTypes = [
    { value: 'house', icon: House, label: 'Casa Simples', desc: '1 QR Code para 1 residência', color: '#10B981' },
    { value: 'village', icon: TreePine, label: 'Vila de Casas', desc: '1 QR Code para várias casas', color: '#F59E0B' },
    { value: 'condo', icon: Building2, label: 'Condomínio', desc: '1 QR Code para vários apartamentos', color: 'var(--primary)' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden', background: '#F8FAFC' }}>
      
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0 }}></div>
      
      <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 10 }}>
         <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <Home size={16} /> Voltar ao Início
         </Link>
      </div>

      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '440px', padding: '48px 40px', zIndex: 1, position: 'relative' }}>
        
        {/* LOGIN */}
        {isLogin && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ marginBottom: '24px' }}>
                 <Logo size={42} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px', color: 'var(--text-main)' }}>Acessar Painel</h2>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>Entre com seu e-mail e código único de cliente.</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Mail size={20} className="text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', pointerEvents: 'none' }} />
                <input type="email" name="email" placeholder="Seu e-mail" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} required />
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <Lock size={20} className="text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', pointerEvents: 'none' }} />
                <input type="password" name="authInput" placeholder="Código Único de Acesso" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} required />
              </div>
              <button type="submit" className="btn-primary w-full" style={{ padding: '16px', marginTop: '12px', fontSize: '16px' }}>
                Acessar Sistema <ArrowRight size={20} />
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-muted" style={{ fontSize: '14px' }}>
                Ainda não tem conta?
                <button onClick={() => { setIsLogin(false); setStep(1); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, marginLeft: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  Cadastre-se aqui
                </button>
              </p>
              <Link to="/morador-login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                Sou morador, quero receber chamadas →
              </Link>
            </div>
          </>
        )}

        {/* REGISTER STEP 1 - Personal Data */}
        {!isLogin && step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: '#FFF', borderRadius: '20px', border: '1px solid var(--border-subtle)', marginBottom: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                 <User size={40} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px', color: 'var(--text-main)' }}>Criar Conta</h2>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>Primeiro, seus dados pessoais. Depois escolha o tipo de imóvel.</p>
            </div>

            <form onSubmit={handleRegisterStep1} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <User size={20} className="text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', pointerEvents: 'none' }} />
                <input type="text" placeholder="Seu nome completo" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <Mail size={20} className="text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', pointerEvents: 'none' }} />
                <input type="email" placeholder="Seu e-mail" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <Lock size={20} className="text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', pointerEvents: 'none' }} />
                <input type="password" placeholder="Crie uma senha" className="input-glass" style={{ paddingLeft: '48px', width: '100%' }} value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary w-full" style={{ padding: '16px', marginTop: '12px', fontSize: '16px' }}>
                Continuar <ArrowRight size={20} />
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={() => setIsLogin(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                ← Já tenho conta, fazer login
              </button>
            </div>
          </>
        )}

        {/* REGISTER STEP 2 - Property Type */}
        {!isLogin && step === 2 && (
          <>
             <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px', color: 'var(--text-main)' }}>Qual seu papel?</h2>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>Selecione seu perfil e tipo de imóvel.</p>
            </div>

            {/* Seleção de Papel */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              {[
                { val: 'sindico', label: 'Síndico / Admin', desc: 'Gerencio condomínio', icon: '🏢' },
                { val: 'admin_vila', label: 'Administrador', desc: 'Gerencio vila de casas', icon: '🏘️' },
              ].map(r => (
                <button key={r.val} onClick={() => setAdminRole(r.val)} style={{ flex: 1, padding: '16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', background: adminRole === r.val ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', border: `2px solid ${adminRole === r.val ? '#3B82F6' : 'var(--border-subtle)'}`, transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{r.icon}</div>
                  <strong style={{ color: 'var(--text-main)', fontSize: '13px', display: 'block' }}>{r.label}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{r.desc}</span>
                </button>
              ))}
            </div>

            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>TIPO DE IMÓVEL</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {propertyTypes.map(pt => (
                <button
                  key={pt.value}
                  onClick={() => setPropertyType(pt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '20px', borderRadius: '16px', cursor: 'pointer',
                    background: propertyType === pt.value ? `${pt.color}15` : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${propertyType === pt.value ? pt.color : 'var(--border-subtle)'}`,
                    transition: 'all 0.2s', textAlign: 'left', width: '100%'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${pt.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <pt.icon size={24} color={pt.color} />
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '16px', display: 'block' }}>{pt.label}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{pt.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={handleRegisterStep2} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', opacity: propertyType ? 1 : 0.5 }} disabled={!propertyType}>
              Finalizar Cadastro <ArrowRight size={20} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                ← Voltar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
