import React, { useState, useEffect, useRef } from 'react';
import { Clock, User, RefreshCw, Calendar, MapPin, Phone, X, ChevronDown, ChevronUp } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}>
        {/* Foto */}
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0, border: '2px solid var(--border-subtle)', position: 'relative' }}>
          {v.photo
            ? <img src={v.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} style={{ opacity: 0.3 }} /></div>}
          {/* Indicador de câmera */}
          <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '10px', height: '10px', borderRadius: '50%', background: v.photo ? '#10B981' : '#6B7280', border: '2px solid var(--bg-deep)' }} />
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Visitante</span>
            <span style={{ fontSize: '11px', color: 'var(--primary)', background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>{ago}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Clock size={11} /> {time} • {weekday}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ opacity: 0.4, flexShrink: 0 }} /> : <ChevronDown size={16} style={{ opacity: 0.4, flexShrink: 0 }} />}
      </div>

      {/* Foto ampliada */}
      {expanded && v.photo && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', maxHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={v.photo} alt="Visitante ampliado" style={{ width: '100%', maxHeight: '240px', objectFit: 'contain' }} />
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '8px' }}>
              <Calendar size={12} /> {date}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '8px' }}>
              <Clock size={12} /> {time}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryPanel({ unitId }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all | today | withPhoto

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/visitors/${unitId}`);
      setVisitors(await r.json());
    } catch { setVisitors([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [unitId]);

  const filtered = visitors.filter(v => {
    if (filter === 'today') {
      const d = new Date(v.timestamp);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }
    if (filter === 'withPhoto') return !!v.photo;
    return true;
  });

  const groups = groupByDate(filtered);

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Histórico de Visitas</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>
            {visitors.length} visita{visitors.length !== 1 ? 's' : ''} registrada{visitors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Stats */}
      {visitors.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: visitors.length, color: 'var(--primary)' },
            { label: 'Hoje', value: visitors.filter(v => new Date(v.timestamp).toDateString() === new Date().toDateString()).length, color: '#10B981' },
            { label: 'Com Foto', value: visitors.filter(v => v.photo).length, color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[{ k: 'all', l: 'Todos' }, { k: 'today', l: 'Hoje' }, { k: 'withPhoto', l: 'Com Foto' }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === f.k ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: filter === f.k ? '#000' : 'var(--text-muted)', transition: 'all 0.2s' }}>
            {f.l}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid rgba(0,229,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'mesh-pulse 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <User size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Nenhuma visita encontrada</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>As visitas aparecem aqui após a campainha ser tocada.</p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groups.map(([dateKey, items]) => {
            const d = new Date(dateKey);
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            const label = dateKey === today ? 'Hoje' : dateKey === yesterday ? 'Ontem' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
            return (
              <div key={dateKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((v, i) => <VisitorCard key={v.id || i} v={v} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const DEFAULT_CATEGORIES = [
  { id: 'water',    label: '💧 Marcador de Água', messages: ['Pode entrar para anotar', 'Deixe o aviso na porta', 'Volto em 10 minutos'] },
  { id: 'energy',   label: '⚡ Light / Energia',  messages: ['Pode entrar para verificar', 'Não autorizo o corte hoje', 'Aguarde um momento'] },
  { id: 'delivery', label: '📦 Entregador',        messages: ['Deixe na porta, obrigado!', 'Pode deixar com o vizinho', 'Já abro o portão'] },
  { id: 'general',  label: '💬 Geral',             messages: ['Volto já!', 'Não estou em casa', 'Um momento, por favor', 'Pode deixar recado'] },
];

export function SettingsPanel({ unitName, setUnitName, onSave }) {
  const [activeCategory, setActiveCategory] = useState('general');
  const [savedMessages, setSavedMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cd_quick_msgs') || 'null') || DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
  });
  const [customMsg, setCustomMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const saveAll = () => {
    localStorage.setItem('cd_quick_msgs', JSON.stringify(savedMessages));
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addCustom = () => {
    if (!customMsg.trim()) return;
    setSavedMessages(prev => prev.map(c => c.id === activeCategory ? { ...c, messages: [...c.messages, customMsg.trim()] } : c));
    setCustomMsg('');
  };

  const removeMsg = (catId, idx) => {
    setSavedMessages(prev => prev.map(c => c.id === catId ? { ...c, messages: c.messages.filter((_, i) => i !== idx) } : c));
  };

  const activeC = savedMessages.find(c => c.id === activeCategory);

  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Configurações</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Personalize sua campainha</p>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>NOME DE EXIBIÇÃO</label>
        <input type="text" className="input-glass" value={unitName} onChange={e => setUnitName(e.target.value)} style={{ width: '100%', marginBottom: '12px' }} />
        <button className="btn-primary" onClick={saveAll} style={{ width: '100%', padding: '12px', fontSize: '14px', background: saved ? '#10B981' : undefined, transition: 'background 0.3s' }}>
          {saved ? '✓ Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>📨 Mensagens Rápidas</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>Respostas prontas que aparecem na campainha quando alguém tocar</p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {savedMessages.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.id)}
              style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: activeCategory === c.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: activeCategory === c.id ? '#000' : 'var(--text-muted)', transition: 'all 0.2s' }}>
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {activeC?.messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 14px' }}>
              <span style={{ fontSize: '13px' }}>"{msg}"</span>
              <button onClick={() => removeMsg(activeCategory, i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 6px' }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="text" className="input-glass" placeholder="Nova mensagem..." value={customMsg}
            onChange={e => setCustomMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} style={{ flex: 1, fontSize: '13px' }} />
          <button onClick={addCustom} className="btn-primary" style={{ padding: '10px 16px', fontSize: '13px', width: 'auto', flexShrink: 0 }}>+ Add</button>
        </div>
      </div>
    </div>
  );
}
