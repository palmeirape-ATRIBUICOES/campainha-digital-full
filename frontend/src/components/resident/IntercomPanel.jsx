import React, { useState } from 'react';
import { Phone, Search, Building2, MessageSquare, Send, Volume2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function IntercomPanel({ propertyId, unitId, socketRef, unitName }) {
  const [block, setBlock] = useState('');
  const [number, setNumber] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [called, setCalled] = useState(null);

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

      {/* ── Falar com a Portaria ── */}
      <div style={{ width: '100%', marginTop: '16px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={15} color="#F59E0B"/>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>Portaria</span>
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Botão de chamada de voz */}
          <button onClick={() => {
            if (!socketRef?.current) return;
            socketRef.current.emit('resident_call_doorman', { propertyId, unitId, callerName: unitName || 'Morador' });
            setCalled('doorman'); setTimeout(() => setCalled(null), 5000);
          }} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
            background: called === 'doorman' ? '#F59E0B' : 'linear-gradient(135deg,#F59E0B,#D97706)',
            color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Volume2 size={15}/> {called === 'doorman' ? 'Chamando Portaria...' : 'Interfone com Porteiro'}
          </button>
          {/* Mensagem de texto para portaria */}
          <DoormanMessage socketRef={socketRef} propertyId={propertyId} unitName={unitName}/>
        </div>
      </div>
    </div>
  );
}

function DoormanMessage({ socketRef, propertyId, unitName }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const send = () => {
    if (!text.trim() || !socketRef?.current) return;
    socketRef.current.emit('resident_message_doorman', { propertyId, message: text.trim(), senderName: unitName || 'Morador' });
    setSent(true); setText('');
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
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFF', color: '#64748B', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={send} disabled={!text.trim()} style={{ flex: 2, padding: '9px', borderRadius: '8px', border: 'none', background: sent ? '#10B981' : '#3B82F6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          {sent ? '✓ Enviado!' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
