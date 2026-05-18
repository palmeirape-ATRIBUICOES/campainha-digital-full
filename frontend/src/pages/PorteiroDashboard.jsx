import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, Building2, Phone, Search, KeyRound, CheckCircle2, MessageSquare, Send, X, ShieldCheck, Sun, Moon } from 'lucide-react';
import Logo from '../components/Logo';

import { API } from '../config';

export default function PorteiroDashboard() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [authorizedEntry, setAuthorizedEntry] = useState(null);
  const [msgUnit, setMsgUnit] = useState(null);   // unitId sendo enviada msg
  const [msgText, setMsgText] = useState('');     // texto da mensagem
  const [msgSent, setMsgSent] = useState(false);  // feedback de enviado
  const [residentMsg, setResidentMsg] = useState(null); // Mensagem recebida do morador
  const [incomingCall, setIncomingCall] = useState(null); // Chamada recebida do morador
  const [preAuthorized, setPreAuthorized] = useState({}); // { unitId: true }
  
  // Acesso via código de visitante
  const [validatedCode, setValidatedCode] = useState(null);
  const [visitorCodeInput, setVisitorCodeInput] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  // ─── Suporte a Modo Noturno (Dark Mode) ───
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('cd_dark_mode') === 'true');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('cd_dark_mode', 'true');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('cd_dark_mode', 'false');
    }
  }, [darkMode]);

  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    const role = localStorage.getItem('cd_admin_role');
    const adminEmail = localStorage.getItem('cd_admin_email');
    const singlePropertyId = localStorage.getItem('cd_doorman_propertyId');

    if (!singlePropertyId && !adminEmail && role !== 'master') {
      navigate('/portaria-login');
      return;
    }

    const fetchData = async () => {
      try {
        let url = `${API}/api/properties`;
        if (role !== 'master') {
          url += `?email=${encodeURIComponent(adminEmail || '')}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setProperties(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const s = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = s;
    
    if (singlePropertyId) {
      s.emit('register_doorman', { propertyId: singlePropertyId });
    } else {
      // For master doormen, we might need a global register or register for all
      properties.forEach(p => s.emit('register_doorman', { propertyId: p.id }));
    }

    s.on('entry_authorized', ({ unitId, visitorId, timestamp }) => {
      let uName = 'Morador';
      setProperties(prev => {
        prev.forEach(p => {
          const unit = p.units?.find(u => u.id === unitId);
          if (unit) uName = `${p.name} - ${unit.name}`;
        });
        return prev;
      });
      setAuthorizedEntry({ unitName: uName, timestamp });
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      setTimeout(() => setAuthorizedEntry(null), 15000);
    });

    s.on('resident_message', ({ message, senderName, timestamp, authorizeEntry, unitId }) => {
      setResidentMsg({ message, senderName, timestamp, authorizeEntry, unitId });
      if (authorizeEntry && unitId) {
        setPreAuthorized(prev => ({ ...prev, [unitId]: true }));
      }
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      setTimeout(() => setResidentMsg(null), 20000); 
    });

    s.on('incoming_resident_call', ({ callerName, unitId }) => {
      setIncomingCall({ callerName, unitId });
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      setTimeout(() => setIncomingCall(null), 20000);
    });

    s.on('incoming_visitor_code', ({ propertyId, visitorName, unitName, code, timestamp }) => {
      const singlePropertyId = localStorage.getItem('cd_doorman_propertyId');
      if (!singlePropertyId || singlePropertyId === propertyId) {
        setValidatedCode({ visitorName, unitName, code, timestamp });
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
        setTimeout(() => setValidatedCode(null), 20000);
      }
    });

    return () => s.disconnect();
  }, [navigate, properties]);

  const handleValidateCode = async (e) => {
    e.preventDefault();
    if (!visitorCodeInput.trim()) return;
    const singlePropertyId = localStorage.getItem('cd_doorman_propertyId') || (properties[0] && properties[0].id);
    if (!singlePropertyId) {
      alert('Selecione uma vila/condomínio primeiro.');
      return;
    }
    setValidatingCode(true);
    setCodeError('');
    try {
      const res = await fetch(`${API}/api/properties/${singlePropertyId}/validate-visitor-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: visitorCodeInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setValidatedCode({
          visitorName: data.visitorName,
          unitName: data.unitName,
          code: visitorCodeInput.trim(),
          timestamp: new Date()
        });
        setVisitorCodeInput('');
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      } else {
        setCodeError(data.error || 'Código inválido ou expirado.');
      }
    } catch {
      setCodeError('Erro ao conectar com o servidor.');
    }
    setValidatingCode(false);
  };

  const sendMessage = (unit) => {
    if (!msgText.trim() || !socketRef.current) return;
    socketRef.current.emit('doorman_message', {
      unitId: unit.id,
      propertyId: unit.propertyId,
      message: msgText.trim(),
      senderName: 'Portaria'
    });
    setMsgSent(true);
    setTimeout(() => { setMsgSent(false); setMsgUnit(null); setMsgText(''); }, 2000);
  };

  const callUnit = (unit) => {
    if (!socketRef.current) return;
    socketRef.current.emit('doorman_call', {
      unitId: unit.id,
      propertyId: unit.propertyId,
      callerName: 'Portaria'
    });
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando painel de controle...</div>;

  const allUnits = properties.flatMap(p => (p.units || []).map(u => ({ ...u, propertyName: p.name, propertyId: p.id })));
  const filteredUnits = allUnits.filter(u => {
    const blockMatch = !search || (u.block || '').toLowerCase().includes(search.toLowerCase()) || (u.street || '').toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase()) || u.propertyName.toLowerCase().includes(search.toLowerCase());
    const numberMatch = !searchNumber || (u.number || '').toLowerCase() === searchNumber.toLowerCase();
    return blockMatch && numberMatch;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', transition: 'var(--transition-fast)' }}>
      <header style={{ padding: '20px 40px', background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={28} showText={false} />
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Painel da Portaria</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Botão de Modo Noturno */}
          <button onClick={() => setDarkMode(!darkMode)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '100px', transition: 'all 0.2s' }}>
            {darkMode ? <><Sun size={16} color="#F59E0B" /> Modo Claro</> : <><Moon size={16} color="#3B82F6" /> Modo Noturno</>}
          </button>

          <button onClick={() => {
            [
              'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
              'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
              'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
              'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
              'cd_admin_name', 'cd_admin_password', 'cd_property_type'
            ].forEach(k => localStorage.removeItem(k));
            document.body.classList.remove('dark-theme');
            navigate('/');
          }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
            <LogOut size={16}/> Sair
          </button>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Alerta de Acesso por Código Validado */}
        {validatedCode && (
          <div style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', padding: '24px', borderRadius: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(139,92,246,0.25)', animation: 'pulse 2s infinite' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Visitante Pré-Autorizado!</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Visitante: <strong>{validatedCode.visitorName}</strong> para a unidade <strong>{validatedCode.unitName}</strong> (Código: {validatedCode.code}).</p>
            </div>
            <button onClick={() => setValidatedCode(null)} style={{ background: '#FFF', border: 'none', color: '#6D28D9', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
              Confirmar Entrada
            </button>
          </div>
        )}

        {/* Painel de Validação de Código de Visitante */}
        <div style={{ marginBottom: '32px', background: '#FFF', borderRadius: '24px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={18} color="#8B5CF6"/> Validar Código de Acesso do Visitante
          </h3>
          <form onSubmit={handleValidateCode} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', display: 'block' }}>CÓDIGO DE 6 DÍGITOS</label>
              <input 
                type="text" 
                maxLength={6}
                placeholder="Ex: 582491" 
                value={visitorCodeInput} 
                onChange={e => setVisitorCodeInput(e.target.value.replace(/[^0-9]/g, ''))} 
                style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 800, letterSpacing: '4px', borderRadius: '14px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} 
              />
            </div>
            <button 
              type="submit" 
              disabled={validatingCode || visitorCodeInput.length !== 6}
              style={{ padding: '16px 32px', height: '56px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#FFF', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)', opacity: visitorCodeInput.length === 6 ? 1 : 0.6 }}
            >
              {validatingCode ? 'Validando...' : 'Validar Acesso'}
            </button>
          </form>
          {codeError && (
            <p style={{ color: '#EF4444', fontSize: '13px', fontWeight: 600, marginTop: '10px', margin: '10px 0 0' }}>✗ {codeError}</p>
          )}
        </div>

        {/* Alerta de Acesso Liberado */}
        {authorizedEntry && (
          <div style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', padding: '24px', borderRadius: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(16,185,129,0.25)', animation: 'pulse 2s infinite' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Acesso Liberado!</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Morador de <strong>{authorizedEntry.unitName}</strong> autorizou a entrada.</p>
            </div>
          </div>
        )}

        {/* Notificação de Mensagem Recebida do Morador */}
        {residentMsg && (
          <div style={{ background: '#FFF', border: '2px solid #3B82F6', padding: '20px', borderRadius: '20px', marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 8px 24px rgba(59,130,246,0.15)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#1E293B' }}>Mensagem de: {residentMsg.senderName}</h2>
              <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>"{residentMsg.message}"</p>
              {residentMsg.authorizeEntry && (
                <div style={{ marginTop: '8px', background: '#DCFCE7', color: '#166534', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, display: 'inline-block' }}>
                  🔓 ACESSO ANTECIPADO LIBERADO
                </div>
              )}
              <div style={{ marginTop: '12px' }}>
                <button onClick={() => setResidentMsg(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: '#FFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Ciente</button>
              </div>
            </div>
          </div>
        )}

        {/* Notificação de Chamada Recebida do Morador */}
        {incomingCall && (
          <div style={{ background: '#FFF', border: '2px solid #F59E0B', padding: '20px', borderRadius: '20px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(245,158,11,0.15)', animation: 'pulse 2s infinite' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#1E293B' }}>Chamada de: {incomingCall.callerName}</h2>
              <p style={{ margin: 0, color: '#64748B', fontSize: '13px' }}>O morador está interfonando para a portaria.</p>
            </div>
            <button onClick={() => setIncomingCall(null)} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#10B981', color: '#FFF', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>Atender</button>
          </div>
        )}

        {/* Busca por Endereço */}
        <div style={{ marginBottom: '40px', background: '#FFF', borderRadius: '24px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={18} color="#3B82F6"/> Chamar Unidade por Endereço</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', display: 'block' }}>BLOCO / RUA</label>
              <input type="text" placeholder="Ex: Bloco A" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', display: 'block' }}>Nº CASA/APTO</label>
              <input type="text" placeholder="Ex: 101" value={searchNumber} onChange={e => setSearchNumber(e.target.value)} style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '0' }}>Digite o bloco/rua e número para localizar a unidade. Ou veja todas abaixo.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {filteredUnits.map(unit => (
            <div key={`${unit.propertyId}-${unit.id}`} style={{ background: '#FFF', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', marginBottom: '8px' }}>{unit.propertyName}</div>
                {preAuthorized[unit.id] && (
                  <div className="blink" style={{ background: '#10B981', color: '#fff', padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12}/> ACESSO LIBERADO
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>{unit.name}</h3>
              {(unit.block || unit.street || unit.number) && (
                <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={13}/> {unit.block && `Bloco ${unit.block}`} {unit.street && `${unit.street}`} {unit.number && `Nº ${unit.number}`}
                </p>
              )}
              {/* Botões de ação */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: msgUnit === unit.id ? '12px' : '0' }}>
                <button onClick={() => callUnit(unit)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg,#10B981,#059669)', border: 'none', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
                  <Phone size={15} /> Interfone
                </button>
                <button onClick={() => { setMsgUnit(msgUnit === unit.id ? null : unit.id); setMsgText(''); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: msgUnit === unit.id ? '#F1F5F9' : 'linear-gradient(135deg,#3B82F6,#2563EB)', border: 'none', color: msgUnit === unit.id ? '#64748B' : '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  {msgUnit === unit.id ? <><X size={14}/>Fechar</> : <><MessageSquare size={15}/>Mensagem</>}
                </button>
              </div>
              {/* Área de mensagem inline */}
              {msgUnit === unit.id && (
                <div style={{ marginTop: '0' }}>
                  <textarea
                    placeholder="Digite sua mensagem para o morador..."
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '72px', fontFamily: 'inherit', background: '#F8FAFC' }}
                  />
                  <button onClick={() => sendMessage(unit)} disabled={!msgText.trim()} style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '10px', background: msgSent ? '#10B981' : '#3B82F6', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', opacity: msgText.trim() ? 1 : 0.5 }}>
                    {msgSent ? '✓ Mensagem Enviada!' : <><Send size={14}/>Enviar</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>


      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          100% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
        }
        @keyframes blink {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .blink { animation: blink 1s infinite; }
      `}</style>
    </div>
  );
}

