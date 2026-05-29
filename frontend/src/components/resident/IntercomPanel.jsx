import React, { useState, useEffect } from 'react';
import { Phone, Search, Building2, MessageSquare, Send, Volume2 } from 'lucide-react';
import { API } from '../../config';

export default function IntercomPanel({ propertyId, unitId, socketRef, unitName, onCall }) {
  const [block, setBlock] = useState('');
  const [number, setNumber] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [called, setCalled] = useState(null);

  // Vila / Intercom Status states
  const [availableUnits, setAvailableUnits] = useState([]);
  const [hasDoorman, setHasDoorman] = useState(false);
  const [loading, setLoading] = useState(false);

  // Intercom enabled setting toggle
  const [intercomEnabled, setIntercomEnabled] = useState(true);
  const [updatingIntercom, setUpdatingIntercom] = useState(false);

  const isVila = localStorage.getItem('residentIsVila') === 'true';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('cd_token');
        if (!token) return;
        const res = await fetch(`${API}/api/user/settings`, {
          headers: { 'Authorization': token }
        });
        if (res.ok) {
          const data = await res.json();
          setIntercomEnabled(data.intercomEnabled ?? true);
        }
      } catch (e) {
        console.error('Failed to fetch intercom settings:', e);
      }
    };
    fetchSettings();
  }, []);

  const toggleIntercom = async () => {
    setUpdatingIntercom(true);
    const newValue = !intercomEnabled;
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ intercomEnabled: newValue })
      });
      if (res.ok) {
        setIntercomEnabled(newValue);
      } else {
        alert('Erro ao atualizar configuração.');
      }
    } catch {
      alert('Erro ao conectar ao servidor.');
    } finally {
      setUpdatingIntercom(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchIntercomStatus();
    }
  }, [propertyId, unitId]);

  const fetchIntercomStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/intercom-status?excludeUnitId=${unitId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableUnits(data.availableUnits || []);
        setHasDoorman(data.hasDoorman || false);
      }
    } catch (e) {
      console.error('Error loading intercom status:', e);
    } finally {
      setLoading(false);
    }
  };

  const search = async () => {
    if (!block && !number) return;
    setSearching(true); setError(''); setResults([]);
    try {
      const p = new URLSearchParams();
      if (block) p.set('block', block);
      if (number) p.set('number', number);
      const r = await fetch(`${API}/api/properties/${propertyId}/search-unit?${p}`);
      if (r.ok) {
        const data = await r.json();
        setResults(data.filter(u => u.id !== unitId));
        if (data.filter(u => u.id !== unitId).length === 0) setError('Nenhuma unidade encontrada com esse endereço.');
      } else {
        const d = await r.json();
        setError(d.error || 'Não encontrado.');
      }
    } catch { setError('Erro de conexão.'); }
    setSearching(false);
  };

  const call = (neighbor) => {
    if (onCall) {
      onCall(neighbor);
      return;
    }
    if (!socketRef?.current) return;
    socketRef.current.emit('initiate_call', {
      unitId: neighbor.id, propertyId,
      callerName: unitName || 'Vizinho', photoBase64: null
    });
    setCalled(neighbor.id);
    setTimeout(() => setCalled(null), 5000);
  };

  return (
    <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
      <h4 style={{ fontWeight: 800, fontSize: '13px', color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Phone size={14} color="#3B82F6"/> Interfone Digital
      </h4>

      {/* Toggle para receber ou não chamadas de vizinhos */}
      <div style={{
        background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px',
        padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>Permitir chamadas de vizinhos</span>
          <span style={{ fontSize: '10px', color: '#64748B' }}>Permitir que outros apartamentos liguem para você</span>
        </div>
        <button
          onClick={toggleIntercom}
          disabled={updatingIntercom}
          style={{
            background: intercomEnabled ? '#10B981' : '#E2E8F0',
            border: 'none', width: '46px', height: '24px', borderRadius: '20px',
            position: 'relative', cursor: 'pointer', transition: 'all 0.3s',
            opacity: updatingIntercom ? 0.6 : 1, flexShrink: 0
          }}
        >
          <div style={{
            position: 'absolute', top: '2px',
            left: intercomEnabled ? '24px' : '2px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#FFF', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s'
          }} />
        </button>
      </div>

      {isVila ? (
        // --- Vila Mode: list available neighbors directly ---
        <div>
          <label style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Vizinhos Disponíveis para Chamada
          </label>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : availableUnits.length === 0 ? (
            <div style={{ padding: '24px 16px', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #E2E8F0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              Nenhum vizinho disponível no momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableUnits.map(n => {
                const residentNames = n.residents?.map(r => r.name).join(', ');
                return (
                  <div key={n.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={18} color="#3B82F6"/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>{n.name}</div>
                      {residentNames && (
                        <div style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={residentNames}>
                          👤 {residentNames}
                        </div>
                      )}
                    </div>
                    <button onClick={() => call(n)}
                      style={{ padding: '8px 14px', borderRadius: '10px', border: 'none',
                        background: called === n.id ? '#10B981' : 'linear-gradient(135deg,#10B981,#059669)',
                        color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                      <Phone size={13}/> {called === n.id ? 'Chamando...' : 'Chamar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // --- Standard Condo Mode: Block/Street Search ---
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>BLOCO / RUA</label>
              <input value={block} onChange={e => setBlock(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Ex: A ou Rua 1"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', background: '#F8FAFC' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Nº CASA/APTO</label>
              <input value={number} onChange={e => setNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Ex: 101"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', background: '#F8FAFC' }} />
            </div>
          </div>
          <button onClick={search} disabled={searching || (!block && !number)}
            style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px',
              opacity: (!block && !number) ? 0.5 : 1 }}>
            <Search size={14}/> {searching ? 'Buscando...' : 'Buscar Vizinho'}
          </button>

          {error && <p style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, textAlign: 'center', marginTop: '8px' }}>{error}</p>}

          {results.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map(n => (
                <div key={n.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color="#3B82F6"/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{n.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {n.block && `Bloco ${n.block} `}{n.street && `${n.street} `}{n.number && `Nº ${n.number}`}
                    </div>
                  </div>
                  <button onClick={() => call(n)}
                    style={{ padding: '8px 14px', borderRadius: '10px', border: 'none',
                      background: called === n.id ? '#10B981' : 'linear-gradient(135deg,#10B981,#059669)',
                      color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                    <Phone size={13}/> {called === n.id ? 'Chamando...' : 'Chamar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Falar com a Portaria (Condicional se hasDoorman for true) ── */}
      {hasDoorman && (
        <div style={{ width: '100%', marginTop: '16px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={15} color="#F59E0B"/>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>Portaria</span>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Botão de chamada de voz */}
            <button onClick={() => {
              if (onCall) {
                onCall({ _isDoorman: true, name: 'Portaria' });
              } else {
                if (!socketRef?.current) return;
                socketRef.current.emit('resident_call_doorman', { propertyId, unitId, callerName: unitName || 'Morador' });
              }
              setCalled('doorman'); setTimeout(() => setCalled(null), 5000);
            }} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
              background: called === 'doorman' ? '#F59E0B' : 'linear-gradient(135deg,#F59E0B,#D97706)',
              color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Volume2 size={15}/> {called === 'doorman' ? 'Chamando Portaria...' : 'Interfone com Porteiro'}
            </button>
            {/* Mensagem de texto para portaria */}
            <DoormanMessage socketRef={socketRef} propertyId={propertyId} unitName={unitName} unitId={unitId}/>
          </div>
        </div>
      )}
    </div>
  );
}

function DoormanMessage({ socketRef, propertyId, unitName, unitId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [authorizeEntry, setAuthorizeEntry] = useState(false);
  const send = () => {
    if (!text.trim() || !socketRef?.current) return;
    socketRef.current.emit('resident_message_doorman', { 
      propertyId, 
      unitId,
      message: text.trim(), 
      senderName: unitName || 'Morador',
      authorizeEntry: authorizeEntry 
    });
    setSent(true); setText(''); setAuthorizeEntry(false);
    setTimeout(() => setSent(false), 2500);
  };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed #E2E8F0', background: 'transparent', color: '#64748B', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
      <Send size={13}/> Enviar mensagem à portaria
    </button>
  );
  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Digite sua mensagem para a portaria..."
        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '64px', fontFamily: 'inherit', background: '#F8FAFC' }}/>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
        <input type="checkbox" checked={authorizeEntry} onChange={e => setAuthorizeEntry(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: authorizeEntry ? '#10B981' : '#64748B' }}>
          {authorizeEntry ? '✓ Acesso Antecipado Liberado!' : 'Liberar Acesso Antecipado'}
        </span>
      </label>

      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFF', color: '#64748B', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={send} disabled={!text.trim()} style={{ flex: 2, padding: '9px', borderRadius: '8px', border: 'none', background: sent ? '#10B981' : '#3B82F6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          {sent ? '✓ Enviado!' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
