import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Trash2, Home, Building2, TreePine, X, ShieldCheck, LogOut, ChevronRight, Settings, Camera, ScanLine, Clock, User, RefreshCw, Copy, Check, MessageCircle, CreditCard, Users, Send, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import UnitManager from '../components/UnitManager';
import BroadcastPanel from '../components/BroadcastPanel';
import ResidentManager from '../components/ResidentManager';

import { API } from '../config';


function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function HoverHelp({ text, children, style = {} }) {
  return (
    <span className="tooltip-wrapper" style={{ display: 'inline-flex', ...style }}>
      {children}
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    const fallbackCopy = (val) => {
      const textArea = document.createElement("textarea");
      textArea.value = val;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } 
      catch (err) { console.error('Fallback copy falhou', err); }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };
  return (
    <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: copied ? '#10B981' : 'var(--primary)', background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(0,229,255,0.1)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
      {copied ? <><Check size={12} /> COPIADO!</> : <><Copy size={12} /> COPIAR</>}
    </button>
  );
}

function WhatsAppButton({ code }) {
  const handleShare = () => {
    const msg = `Esse é o seu login de acesso à Campainha Digital! Só precisa baixar o app, entrar na aba Morador e colocar o seu código de acesso para poder atender aos visitantes.\n\n🔑 *Seu Código:* ${code}\n📱 *Link do App:* ${window.location.origin}/morador-login`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#fff', background: '#25D366', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
      <MessageCircle size={12} /> WHATSAPP
    </button>
  );
}

export default function AdminPanel() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('properties'); // 'properties' | 'history'
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [propertyType, setPropertyType]     = useState('');
  const [propertyName, setPropertyName]     = useState('');
  const [unitsList, setUnitsList]   = useState([{ name: '' }]);
  const [scanning, setScanning]     = useState(false);
  const [scannedId, setScannedId]   = useState('');
  const [visitors, setVisitors]     = useState([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Novos estados para Caixa Postal, Alertas de Portão e Grade Visual Interativa
  const [mailboxMessages, setMailboxMessages] = useState([]);
  const [loadingMailbox, setLoadingMailbox]   = useState(false);
  const [activeAlerts, setActiveAlerts]       = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText]             = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [showPaywall, setShowPaywall] = useState(false);
  const [loginError, setLoginError] = useState('');
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Auth guard: redirect if not logged in
    const adminEmail = localStorage.getItem('cd_admin_email');
    if (!adminEmail) {
      navigate('/auth');
      return;
    }
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const adminEmail = localStorage.getItem('cd_admin_email');
      if (!adminEmail) return;
      
      const url = `${API}/api/properties?email=${encodeURIComponent(adminEmail)}`;
      const res  = await fetch(url);
      
      if (!res.ok) {
        console.error('Failed to fetch properties:', res.status);
        setProperties([]);
        setOnboardingStep('type');
        return;
      }
      
      const data = await res.json();
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Invalid properties response:', data);
        setProperties([]);
        setOnboardingStep('type');
        return;
      }
      
      setProperties(data);

      // Auto-seleciona propriedade salva no login ou a primeira disponível
      const savedPropertyId = localStorage.getItem('cd_admin_propertyId');
      if (data.length === 0) {
        const savedType = localStorage.getItem('cd_property_type');
        if (savedType) {
          const mappedType = savedType === 'house' ? 'individual' : savedType;
          setPropertyType(mappedType);
          setPropertyName(mappedType === 'individual' ? 'Minha Casa' : '');
          setUnitsList([{ name: '' }]);
          setOnboardingStep(mappedType === 'individual' ? 'scan' : 'config');
        } else {
          setOnboardingStep('type');
        }
      } else {
        const toSelect = savedPropertyId && data.find(p => p.id === savedPropertyId)
          ? savedPropertyId
          : data[0].id;
        setSelectedProperty(toSelect);
      }
    } catch (err) { console.error('Fetch properties error:', err); }
    finally { setLoading(false); }
  };

  const fetchVisitors = async (propertyId) => {
    setLoadingVisitors(true);
    const adminEmail = localStorage.getItem('cd_admin_email');
    try {
      const url = adminEmail 
        ? `${API}/api/visitors/property/${propertyId}?adminEmail=${encodeURIComponent(adminEmail)}`
        : `${API}/api/visitors/property/${propertyId}`;
      const res  = await fetch(url);
      const data = await res.json();
      setVisitors(data);
    } catch { setVisitors([]); }
    finally { setLoadingVisitors(false); }
  };

  const fetchMailbox = async (propertyId) => {
    setLoadingMailbox(true);
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/mailbox`);
      if (res.ok) {
        const data = await res.json();
        setMailboxMessages(data);
      }
    } catch (e) {
      console.error('Mailbox fetch failed:', e);
    } finally {
      setLoadingMailbox(false);
    }
  };

  const fetchAlerts = async (propertyId) => {
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data);
      }
    } catch (e) {
      console.error('Alerts fetch failed:', e);
    }
  };

  const resolveAlert = async (alertId) => {
    if (!selectedProperty) return;
    try {
      const res = await fetch(`${API}/api/properties/${selectedProperty}/alerts/${alertId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAlerts(selectedProperty);
      }
    } catch (e) {
      console.error('Failed to resolve alert:', e);
    }
  };

  const resolveMailboxMessage = async (msgId, currentStatus) => {
    if (!selectedProperty) return;
    const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    try {
      const res = await fetch(`${API}/api/properties/${selectedProperty}/mailbox/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchMailbox(selectedProperty);
      }
    } catch (e) {
      console.error('Failed to resolve mailbox message:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && selectedProperty) fetchVisitors(selectedProperty);
    if (activeTab === 'mailbox' && selectedProperty) fetchMailbox(selectedProperty);
    if (activeTab === 'control_panel' && selectedProperty) fetchAlerts(selectedProperty);
  }, [activeTab, selectedProperty]);

  // Polling automático para alertas de segurança e solicitações de portão na Grade Visual
  useEffect(() => {
    if (!selectedProperty) return;
    
    // Roda a cada 4 segundos se a aba ativa for o painel de controle
    const interval = setInterval(() => {
      fetchAlerts(selectedProperty);
    }, 4000);

    // Roda uma vez imediatamente
    fetchAlerts(selectedProperty);

    return () => clearInterval(interval);
  }, [selectedProperty, activeTab]);

  const startScan = async () => {
    setScanning(true);
    // Simulating scanning a QR code from a plate
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      
      // Simulation: after 3 seconds, it "finds" a QR code
      setTimeout(() => {
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        setScanning(false);
        const mockScannedId = Math.random().toString(36).substring(2, 10).toUpperCase();
        setScannedId(mockScannedId);
        handleSubmit(mockScannedId);
      }, 3000);
    } catch { 
      setScanning(false); 
      alert('Câmera não disponível. Usando ID de teste para demonstração.');
      const mockScannedId = 'TEST-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setScannedId(mockScannedId);
      handleSubmit(mockScannedId);
    }
  };

  const selectType = (type) => {
    setPropertyType(type);
    setPropertyName(type === 'individual' ? 'Minha Casa' : '');
    setUnitsList([{ name: '' }]);
    setOnboardingStep(type === 'individual' ? 'scan' : 'config');
  };

  const handleUnitChange = (i, v) => { const u = [...unitsList]; u[i].name = v; setUnitsList(u); };
  const addUnit    = () => setUnitsList(prev => [...prev, { name: '' }]);
  const removeUnit = (i) => { if (unitsList.length > 1) setUnitsList(unitsList.filter((_, idx) => idx !== i)); };

  const handleSubmit = async (idFromScanner) => {
    const finalId = idFromScanner || scannedId;
    const units = propertyType !== 'individual' ? unitsList.filter(u => u.name.trim()) : [];
    const adminEmail = localStorage.getItem('cd_admin_email');
    const adminPassword = localStorage.getItem('cd_admin_password');
    
    try {
      const res = await fetch(`${API}/api/properties`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: finalId,
          type: propertyType === 'individual' ? 'individual' : 'collective', 
          name: propertyName, 
          clientName: localStorage.getItem('cd_admin_name') || '',
          units,
          adminEmail,
          adminPassword
        })
      });
      if (res.ok) { 
        // Clear password from local storage after using it
        localStorage.removeItem('cd_admin_password');
        
        // Se for individual, vai para o pagamento. Se for coletivo, vai direto pro painel.
        if (propertyType === 'individual' || propertyType === 'house') {
          setOnboardingStep('pay');
        } else {
          setOnboardingStep(null);
          fetchProperties();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao ativar placa.');
        setOnboardingStep('scan');
      }
    } catch (err) { console.error(err); }
  };

  const deleteProperty = async (id) => {
    if (!window.confirm('Excluir esta placa?')) return;
    const adminEmail = localStorage.getItem('cd_admin_email');
    try { 
      const url = adminEmail 
        ? `${API}/api/properties/${id}?adminEmail=${encodeURIComponent(adminEmail)}`
        : `${API}/api/properties/${id}`;
      await fetch(url, { method: 'DELETE' }); 
      fetchProperties(); 
    } catch {}
  };

  const downloadQR = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = `QR_${name}.png`; a.click(); };

  // ── Onboarding ─────────────────────────────────────────────────────────────
  if (onboardingStep === 'scan') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <div style={{ display: 'inline-flex', padding: '20px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '24px', border: '1px solid var(--border-subtle)', marginBottom: '32px' }}>
          <ScanLine size={56} color="#10B981" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Ativar Placa</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px' }}>
          Agora escaneie o <strong style={{ color: 'var(--text-main)' }}>QR Code da sua placa física</strong> para finalizar a ativação.
        </p>
        {scanning ? (
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '2px solid #10B981', marginBottom: '24px', position: 'relative' }}>
            <video ref={videoRef} style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }} playsInline muted />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translateX(-50%) translateY(-50%)', width: '200px', height: '200px', border: '2px solid #10B981', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
          </div>
        ) : (
          <button onClick={startScan} className="btn-primary" style={{ width: '100%', padding: '18px', fontSize: '18px', marginBottom: '16px', background: '#10B981' }}>
            <Camera size={24} /> Escanear Agora
          </button>
        )}
        <button onClick={() => setOnboardingStep('pay')} style={{ display: 'block', margin: '24px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Voltar ao Pagamento</button>
      </div>
    </div>
  );

  if (onboardingStep === 'type') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Qual seu tipo de imóvel?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Isso define como sua campainha será configurada.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { val: 'individual', icon: Home,      label: 'Casa Simples',   desc: '1 placa, 1 morador',          color: '#10B981' },
            { val: 'village',   icon: TreePine,   label: 'Vila de Casas',  desc: '1 placa, várias casas',       color: '#F59E0B' },
            { val: 'condo',     icon: Building2,  label: 'Condomínio',     desc: '1 placa, vários apartamentos', color: 'var(--primary)' }
          ].map(t => (
            <button key={t.val} onClick={() => selectType(t.val)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${t.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <t.icon size={26} color={t.color} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '16px', display: 'block' }}>{t.label}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t.desc}</span>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>
        <button onClick={() => setOnboardingStep('scan')} style={{ display: 'block', margin: '24px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
      </div>
    </div>
  );

  if (onboardingStep === 'config') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            {propertyType === 'individual' ? 'Confirme sua casa' : 'Configure as unidades'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {propertyType === 'individual' ? 'Dê um nome à sua propriedade.' : 'Adicione cada casa ou apartamento.'}
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              {propertyType === 'individual' ? 'Nome da sua casa' : 'Nome do condomínio / vila'}
            </label>
            <input type="text" className="input-glass" placeholder="Ex: Residencial Solar" value={propertyName} onChange={e => setPropertyName(e.target.value)} style={{ width: '100%' }} />
          </div>
          {propertyType !== 'individual' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
                {propertyType === 'village' ? 'Casas da vila' : 'Apartamentos'}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                {unitsList.map((u, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>{i + 1}</span>
                    <input type="text" className="input-glass" placeholder={propertyType === 'village' ? `Casa ${i + 1}` : `Apto ${i + 1}`} value={u.name} onChange={e => handleUnitChange(i, e.target.value)} style={{ flex: 1 }} />
                    <button onClick={() => removeUnit(i)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '10px', borderRadius: '8px', cursor: 'pointer', opacity: unitsList.length === 1 ? 0.3 : 1 }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button onClick={addUnit} style={{ marginTop: '12px', width: '100%', background: 'transparent', border: '1px dashed var(--primary)', color: 'var(--primary)', padding: '12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Plus size={16} /> Adicionar {propertyType === 'village' ? 'Casa' : 'Apartamento'} ({unitsList.length} adicionado{unitsList.length !== 1 ? 's' : ''})
              </button>
            </div>
          )}
          <button onClick={() => setOnboardingStep('scan')} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', marginTop: '24px' }}>
            Prosseguir para Ativação <ChevronRight size={20} />
          </button>
        </div>
        <button onClick={() => setOnboardingStep('type')} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
      </div>
    </div>
  );

  if (onboardingStep === 'pay') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '20px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '24px', border: '1px solid var(--border-subtle)', marginBottom: '32px' }}>
          <CreditCard size={56} color="var(--primary)" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Quase lá!</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px' }}>
          Sua placa foi ativada com sucesso. Como você está no plano <strong style={{ color: 'var(--text-main)' }}>Casa Simples</strong>, escolha como deseja prosseguir:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button onClick={() => { setOnboardingStep(null); fetchProperties(); }} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="#10B981" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '16px', display: 'block' }}>Teste Grátis por 15 dias</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Experimente todos os recursos sem custo.</span>
            </div>
          </button>

          <button onClick={() => { alert('Redirecionando para o checkout Pix (R$ 39,90)...'); setOnboardingStep(null); fetchProperties(); }} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))', border: '1px solid var(--primary)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#000" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '16px', display: 'block' }}>Ativar Plano Anual</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Taxa única de <strong style={{ color: 'var(--primary)' }}>R$ 39,90/ano</strong></span>
            </div>
          </button>
        </div>

        <p style={{ marginTop: '32px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Você poderá mudar de ideia ou cancelar a qualquer momento nas configurações.
        </p>
      </div>
    </div>
  );

  // ── Dashboard Principal ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', paddingBottom: '60px' }}>


      {/* Paywall removido - condomínios gerenciam unidades diretamente */}


      {/* Trial Countdown / Upgrade Banner */}
      {properties.find(p => p.id === selectedProperty)?.type === 'individual' && properties.find(p => p.id === selectedProperty)?.nextPaymentDate && (
        <div style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1)', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} />
            {Math.ceil((new Date(properties.find(p => p.id === selectedProperty).nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24)) > 0 ? (
              <span>Você está no período de teste: <strong style={{ color: '#FFF' }}>{Math.ceil((new Date(properties.find(p => p.id === selectedProperty).nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24))} dias restantes</strong></span>
            ) : (
              <span>Seu período de teste expirou!</span>
            )}
          </div>
          <button onClick={() => alert('Redirecionando para pagamento Pix (R$ 39,90)...')} style={{ background: '#fff', color: '#3B82F6', border: 'none', padding: '6px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>
            ASSINAR AGORA (R$ 39,90/ANO)
          </button>
        </div>
      )}

      <header style={{ background: 'var(--bg-surface-elevated)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={32} />
        </div>
        <button onClick={() => {
          [
            'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
            'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
            'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
            'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
            'cd_admin_name', 'cd_admin_password', 'cd_property_type'
          ].forEach(k => localStorage.removeItem(k));
          navigate('/');
        }} style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          <LogOut size={18} /> Sair
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 24px', gap: '0', overflowX: 'auto' }}>
        {[
          { key: 'properties', label: '🏠 Propriedades', desc: 'Gerencie placas físicas e downloads de QR Codes.' },
          { key: 'units',      label: '🏢 Unidades', desc: 'Cadastre e edite os blocos, ruas e casas da vila.' },
          { key: 'people',     label: '👥 Pessoas', desc: 'Gerencie e vincule moradores aos códigos de acesso.' },
          { key: 'mailbox',    label: '📬 Caixa Postal', desc: 'Veja as mensagens de suporte enviadas pelos moradores.' },
          { key: 'control_panel', label: '🎮 Painel de Controle', desc: 'Visualização interativa das unidades em tempo real.' },
          { key: 'broadcast',  label: '📢 Comunicados', desc: 'Envie avisos gerais para todos os moradores de uma vez.' },
          { key: 'history',    label: '📋 Histórico', desc: 'Lista de visitas completas com foto e data/hora.' }
        ].filter(tab => {
          const isIndividual = properties.some(p => p.type === 'individual');
          if (isIndividual && ['units', 'people', 'broadcast', 'mailbox', 'control_panel'].includes(tab.key)) return false;
          return true;
        }).map(tab => (
          <HoverHelp key={tab.key} text={tab.desc}>
            <button onClick={() => setActiveTab(tab.key)} style={{ padding: '14px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          </HoverHelp>
        ))}
      </div>

      <main className="container fade-in" style={{ marginTop: '32px' }}>

        {/* ── ABA: PROPRIEDADES ── */}
        {activeTab === 'properties' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Minhas Propriedades</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gerencie placas e unidades</p>
              </div>
              {!properties.some(p => p.type === 'individual') && (
                <HoverHelp text="Cadastre uma nova placa física de campainha virtual">
                  <button className="btn-primary" onClick={() => {
                    if (properties.length >= 1) { setShowPaywall(true); }
                    else { setOnboardingStep('scan'); }
                  }} style={{ padding: '12px 24px' }}>
                    <Plus size={20} /> Nova Placa
                  </button>
                </HoverHelp>
              )}
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px' }}>Carregando...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {properties.map(p => (
                  <div key={p.id} className="premium-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{p.name}</h3>
                        <span style={{ fontSize: '12px', padding: '4px 10px', background: p.type === 'individual' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: p.type === 'individual' ? '#10B981' : 'var(--primary)', borderRadius: '100px', fontWeight: 600 }}>
                          {p.type === 'individual' ? 'Casa Única' : `${p.units.length} unidades`}
                        </span>
                      </div>
                      {p.type !== 'individual' && (
                        <button onClick={() => deleteProperty(p.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                      )}
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'center', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                      <img src={p.qrCodeUrl} alt="QR" style={{ width: '140px', height: 'auto' }} />
                    </div>

                    <HoverHelp text="Baixa o QR Code em PNG de alta resolução para impressão física" style={{ width: '100%' }}>
                      <button className="btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '13px', marginBottom: '16px' }} onClick={() => downloadQR(p.qrCodeUrl, p.name)}>
                        <Download size={16} /> Baixar QR Code
                      </button>
                    </HoverHelp>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                        Códigos de Acesso — compartilhe com o morador:
                      </span>
                      {p.units.map(u => (
                        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', marginBottom: '6px' }}>
                          <div style={{ flex: 1, paddingRight: '12px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{u.name}</span>
                            <code style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 800, letterSpacing: '2px', background: 'rgba(0,229,255,0.08)', padding: '3px 8px', borderRadius: '4px' }}>{u.accessCode || '---'}</code>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <HoverHelp text="Copia o código do morador para colar">
                              <CopyButton text={u.accessCode || ''} />
                            </HoverHelp>
                            <HoverHelp text="Envia o código de morador diretamente via WhatsApp">
                              <WhatsAppButton code={u.accessCode || ''} />
                            </HoverHelp>
                          </div>
                        </div>
                      ))}
                    </div>

                    <HoverHelp text="Acessa a galeria fotográfica e de horários das visitas desta propriedade" style={{ width: '100%' }}>
                      <button
                        onClick={() => { setSelectedProperty(p.id); setActiveTab('history'); }}
                        style={{ marginTop: '12px', width: '100%', background: 'rgba(59,130,246,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Clock size={14} /> Ver Histórico de Visitantes
                      </button>
                    </HoverHelp>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ABA: UNIDADES ── */}
        {activeTab === 'units' && selectedProperty && (
          <UnitManager propertyId={selectedProperty} adminEmail={localStorage.getItem('cd_admin_email')} onRefresh={fetchProperties} />
        )}
        {activeTab === 'units' && !selectedProperty && properties.length > 0 && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Selecione uma propriedade na aba Propriedades primeiro.</p>
          </div>
        )}

        {/* ── ABA: PESSOAS ── */}
        {activeTab === 'people' && selectedProperty && (
          <ResidentManager propertyId={selectedProperty} property={properties.find(p => p.id === selectedProperty)} adminEmail={localStorage.getItem('cd_admin_email')} onRefresh={fetchProperties} />
        )}

        {/* ── ABA: MENSAGENS ── */}
        {activeTab === 'broadcast' && selectedProperty && (
          <BroadcastPanel propertyId={selectedProperty} adminEmail={localStorage.getItem('cd_admin_email')} />
        )}

        {/* ── ABA: CAIXA POSTAL (MAILBOX) ── */}
        {activeTab === 'mailbox' && selectedProperty && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Caixa Postal da Vila</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Mensagens e solicitações de moradores enviadas ao síndico</p>
              </div>
              <button className="btn-secondary" style={{ padding: '10px 16px', fontSize: '13px' }} onClick={() => fetchMailbox(selectedProperty)}>
                <RefreshCw size={16} /> Atualizar Inbox
              </button>
            </div>

            {loadingMailbox ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px' }}>Carregando caixa postal...</p>
            ) : mailboxMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FFF', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                <Send size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>Sua Caixa Postal está vazia!</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>Nenhum morador enviou mensagens ou solicitações de suporte ainda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mailboxMessages.map(msg => (
                  <div key={msg.id} style={{ background: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '100px' }}>
                          🏢 {msg.unit?.name || 'Unidade'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {fmtDate(msg.createdAt)}
                        </span>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, background: msg.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: msg.status === 'resolved' ? '#10B981' : '#D97706' }}>
                          {msg.status === 'resolved' ? 'RESOLVIDO' : 'PENDENTE'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>{msg.subject}</h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{msg.body}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <HoverHelp text={msg.status === 'resolved' ? 'Reabrir chamado' : 'Marcar solicitação como concluída'}>
                        <button
                          onClick={() => resolveMailboxMessage(msg.id, msg.status)}
                          style={{
                            background: msg.status === 'resolved' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            border: 'none',
                            color: msg.status === 'resolved' ? '#EF4444' : '#10B981',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {msg.status === 'resolved' ? 'Reabrir' : 'Concluir'}
                        </button>
                      </HoverHelp>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: PAINEL DE CONTROLE / GRADE VISUAL (CONTROL_PANEL) ── */}
        {activeTab === 'control_panel' && selectedProperty && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Dashboard Central</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Grade visual de unidades com alertas e acionamento Sonoff em tempo real</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={alertTypeFilter} onChange={e => setAlertTypeFilter(e.target.value)} className="input-glass" style={{ padding: '8px 12px', fontSize: '13px', width: 'auto' }}>
                  <option value="all">🔍 Todos os Status</option>
                  <option value="active">⚠️ Somente Alertas Ativos</option>
                </select>
                <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => fetchAlerts(selectedProperty)}>
                  <RefreshCw size={14} /> Recarregar
                </button>
              </div>
            </div>

            {/* Mock do Dispositivo Físico Sonoff no Dashboard */}
            <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', marginBottom: '32px', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={24} color="var(--primary)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Rele Sonoff Dual / eWelink 
                    <span style={{ fontSize: '10px', background: '#10B981', color: '#FFF', padding: '2px 6px', borderRadius: '100px', fontWeight: 800 }}>MOCK ONLINE</span>
                  </h4>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '4px 0 0' }}>Dispositivo de contato seco associado ao portão social e de veículos.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <HoverHelp text="Mimetiza o acionamento elétrico do portão de pedestres via eWelink">
                  <button onClick={() => alert('[Sonoff] Comando de abertura portão SOCIAL enviado com sucesso!')} style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🔓 Abrir Social
                  </button>
                </HoverHelp>
                <HoverHelp text="Mimetiza o acionamento do portão de veículos">
                  <button onClick={() => alert('[Sonoff] Comando de abertura portão VEÍCULOS enviado com sucesso!')} style={{ background: 'var(--primary)', color: '#FFF', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🚗 Abrir Veículos
                  </button>
                </HoverHelp>
              </div>
            </div>

            {/* Agrupamento e Renderização de Unidades por Subdivisão (Bloco/Rua) */}
            {(() => {
              const currentProperty = properties.find(p => p.id === selectedProperty);
              if (!currentProperty) return <p>Carregando unidades...</p>;

              // Agrupa unidades
              const grouped = {};
              currentProperty.units.forEach(u => {
                const blockKey = u.block ? `Bloco ${u.block}` : (u.street ? `Rua ${u.street}` : 'Geral');
                if (!grouped[blockKey]) grouped[blockKey] = [];
                grouped[blockKey].push(u);
              });

              const blockKeys = Object.keys(grouped).sort();

              if (blockKeys.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Nenhuma unidade cadastrada. Adicione unidades na aba Unidades.</p>
                  </div>
                );
              }

              return blockKeys.map(blockKey => {
                const unitsInBlock = grouped[blockKey];
                
                // Filtra se a busca pedir apenas alertas ativos
                const filteredUnits = alertTypeFilter === 'active' 
                  ? unitsInBlock.filter(u => activeAlerts.some(a => a.unitId === u.id))
                  : unitsInBlock;

                if (filteredUnits.length === 0) return null;

                return (
                  <div key={blockKey} style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '8px', color: 'var(--text-main)' }}>
                      🏢 {blockKey} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>({filteredUnits.length} unidade{filteredUnits.length !== 1 ? 's' : ''})</span>
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                      {filteredUnits.map(u => {
                        const unitAlerts = activeAlerts.filter(a => a.unitId === u.id);
                        const hasAlert = unitAlerts.length > 0;
                        const mainAlert = unitAlerts[0];
                        
                        let cardClass = '';
                        let alertBadge = null;

                        if (hasAlert) {
                          if (mainAlert.type === 'package') {
                            cardClass = 'pulse-alert-yellow';
                            alertBadge = '📦 ENCOMENDA';
                          } else if (mainAlert.type === 'release') {
                            cardClass = 'pulse-alert-green';
                            alertBadge = '🔑 LIBERAÇÃO';
                          } else {
                            cardClass = 'pulse-alert-green';
                            alertBadge = '⚠️ ALERTA!';
                          }
                        }

                        return (
                          <HoverHelp key={u.id} text={hasAlert ? `${mainAlert.title}: ${mainAlert.description || ''} (Clique para resolver)` : `Status normal da unidade ${u.name}`}>
                            <div
                              onClick={() => {
                                if (hasAlert) {
                                  setSelectedMessage(mainAlert);
                                }
                              }}
                              style={{
                                background: '#FFF',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '12px',
                                padding: '16px 12px',
                                textAlign: 'center',
                                cursor: hasAlert ? 'pointer' : 'default',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '100px',
                                transition: 'all 0.2s',
                                boxShadow: hasAlert ? 'none' : '0 2px 6px rgba(0,0,0,0.01)'
                              }}
                              className={cardClass}
                            >
                              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>{u.name}</span>
                              {u.number && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Nº {u.number}</span>}
                              
                              {alertBadge && (
                                <span style={{
                                  marginTop: '8px',
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  background: mainAlert.type === 'package' ? '#F59E0B' : '#10B981',
                                  color: '#FFF',
                                  padding: '2px 6px',
                                  borderRadius: '100px',
                                  letterSpacing: '0.5px'
                                }}>
                                  {alertBadge}
                                </span>
                              )}
                            </div>
                          </HoverHelp>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}

            {/* Modal de Alerta Ativo */}
            {selectedMessage && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(4px)' }}>
                <div style={{ background: '#FFF', borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                  <button onClick={() => setSelectedMessage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: selectedMessage.type === 'package' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedMessage.type === 'package' ? <Zap size={24} color="#F59E0B" /> : <ShieldCheck size={24} color="#10B981" />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{selectedMessage.title}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Unidade {selectedMessage.unit?.name || 'Morador'}</p>
                    </div>
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                    {selectedMessage.description || 'Nenhuma descrição adicional.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedMessage.type === 'release' && (
                      <button
                        onClick={() => {
                          alert('[eWelink/Sonoff] Comando de liberação de portão disparado!');
                          resolveAlert(selectedMessage.id);
                          setSelectedMessage(null);
                        }}
                        style={{ width: '100%', background: '#10B981', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        🔑 AUTORIZAR E ABRIR PORTÃO
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        resolveAlert(selectedMessage.id);
                        setSelectedMessage(null);
                      }}
                      style={{ width: '100%', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✅ MARCAR COMO RESOLVIDO
                    </button>
                    
                    <button
                      onClick={() => setSelectedMessage(null)}
                      style={{ width: '100%', background: '#F1F5F9', color: 'var(--text-muted)', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA: HISTÓRICO ── */}
        {activeTab === 'history' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Histórico de Visitantes</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Registro de todas as visitas com foto e horário</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {properties.length > 1 && (
                  <select value={selectedProperty || ''} onChange={e => setSelectedProperty(e.target.value)} className="input-glass" style={{ padding: '10px 16px', fontSize: '14px' }}>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <button className="btn-secondary" style={{ padding: '10px 16px', fontSize: '13px' }} onClick={() => selectedProperty && fetchVisitors(selectedProperty)}>
                  <RefreshCw size={16} /> Atualizar
                </button>
              </div>
            </div>

            {loadingVisitors ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px' }}>Carregando histórico...</p>
            ) : visitors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <User size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Nenhum visitante registrado ainda.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>As visitas aparecerão aqui assim que alguém tocar a campainha.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {visitors.map(v => (
                  <div key={v.id} className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ height: '160px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {v.photo
                        ? <img src={v.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <User size={48} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                      }
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
                        <Clock size={11} /> {fmtDate(v.timestamp)}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                        {properties.find(p => p.id === selectedProperty)?.units.find(u => u.id === v.unitId)?.name || 'Unidade'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
