import React, { useState, useEffect } from 'react';
import { Clock, User, RefreshCw, Calendar, MapPin, Phone, X, ChevronDown, ChevronUp, Bell, BellOff, Share2, Copy, Check } from 'lucide-react';

import { API } from '../config';

// Funções utilitárias mantidas (fmt, groupByDate, VisitorCard...)
// [Conteúdo omitido para brevidade, mas deve ser mantido no arquivo final]

function fmt(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  let ago = '';
  if (mins < 1) ago = 'Agora';
  else if (mins < 60) ago = `${mins}min atrás`;
  else if (hrs < 24) ago = `${hrs}h atrás`;
  else if (days === 1) ago = 'Ontem';
  else ago = `${days} dias atrás`;
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
    ago
  };
}

function groupByDate(visitors) {
  const groups = {};
  visitors.forEach(v => {
    const d = new Date(v.timestamp).toDateString();
    if (!groups[d]) groups[d] = [];
    groups[d].push(v);
  });
  return Object.entries(groups);
}

function VisitorCard({ v }) {
  const [expanded, setExpanded] = useState(false);
  const { date, time, weekday, ago } = fmt(v.timestamp);
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#FFF', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', background: '#F1F5F9', flexShrink: 0, border: '2px solid var(--border-subtle)', position: 'relative' }}>
          {v.photo
            ? <img src={v.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} style={{ opacity: 0.3 }} /></div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Visitante</span>
            <span style={{ fontSize: '11px', color: 'var(--primary)', background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>{ago}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Clock size={11} /> {time} • {weekday}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ opacity: 0.4 }} /> : <ChevronDown size={16} style={{ opacity: 0.4 }} />}
      </div>
      {expanded && v.photo && (
        <div style={{ padding: '0 16px 16px' }}>
          <img src={v.photo} alt="Visitante" style={{ width: '100%', borderRadius: '12px', maxHeight: '240px', objectFit: 'contain', background: '#000' }} />
        </div>
      )}
    </div>
  );
}

export function HistoryPanel({ unitId, propertyId }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/visitors/${unitId}?propertyId=${propertyId}`);
      if (res.ok) setVisitors(await res.json());
    } catch { setVisitors([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [unitId]);

  const groups = groupByDate(visitors);

  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>Histórico</h2>
      {loading ? <p>Carregando...</p> : groups.map(([dateKey, items]) => (
        <div key={dateKey} style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '12px' }}>{dateKey}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map(v => <VisitorCard key={v.id} v={v} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsPanel({ unitName, setUnitName, onSave, unitId, propertyId }) {
  const [enabled, setEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [inviteCode, setInviteCode] = useState('ABCD-123'); // Exemplo
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Buscar configurações do usuário do backend
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/user/settings`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      setEnabled(data.doorbellEnabled);
      setQuietStart(data.quietModeStart || '22:00');
      setQuietEnd(data.quietModeEnd || '07:00');
    } catch {}
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      await fetch(`${API}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ 
          doorbellEnabled: enabled, 
          quietModeStart: quietStart, 
          quietModeEnd: quietEnd 
        })
      });
      onSave(); // Salva nome localmente
      alert('Configurações salvas!');
    } catch {
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Horário de Funcionamento */}
      <section>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color="var(--primary)" /> Horário de Funcionamento
        </h3>
        <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Campainha Ativa</span>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Receber chamadas no celular</p>
            </div>
            <button 
              onClick={() => setEnabled(!enabled)}
              style={{ background: enabled ? '#10B981' : '#F1F5F9', border: 'none', width: '50px', height: '26px', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <div style={{ position: 'absolute', top: '3px', left: enabled ? '27px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#FFF', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s' }} />
            </button>
          </div>

          <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', display: 'block', marginBottom: '8px' }}>Modo Silencioso (Não incomodar)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none' }} />
              <span style={{ color: '#94A3B8' }}>até</span>
              <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Compartilhamento (Moradores da mesma casa) */}
      <section>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 size={20} color="#10B981" /> Compartilhar Acesso
        </h3>
        <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>Outras pessoas da sua casa podem se cadastrar usando este código:</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center', fontWeight: 900, fontSize: '20px', letterSpacing: '2px', color: '#3B82F6' }}>
              {inviteCode}
            </div>
            <button onClick={copyInvite} style={{ padding: '0 16px', borderRadius: '12px', border: 'none', background: copied ? '#10B981' : '#3B82F6', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
      </section>

      {/* Nome e Salvar */}
      <section>
        <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>NOME DA UNIDADE / CASA</label>
        <input type="text" value={unitName} onChange={e => setUnitName(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }} />
        
        <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </section>

    </div>
  );
}

export const DEFAULT_CATEGORIES = [
  { id: 'general', label: 'Geral', messages: ['Já abro!', 'Um momento', 'Não estou em casa'] }
];

