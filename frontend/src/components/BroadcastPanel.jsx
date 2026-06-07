import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, AlertTriangle, Clock, CheckCheck, Users, Paperclip } from 'lucide-react';

import { API } from '../config';

function fmt(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

export default function BroadcastPanel({ propertyId, adminEmail }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para segmentação
  const [units, setUnits] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [residents, setResidents] = useState([]);
  const [targetType, setTargetType] = useState('all'); // all | block | unit | resident
  const [targetValue, setTargetValue] = useState('');

  // Estados para mídias
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState(''); // image | video
  const [fileLoading, setFileLoading] = useState(false);

  const loadUnits = async () => {
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/units`);
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
        
        // Extrai blocos únicos e não nulos
        const uniqueBlocks = Array.from(new Set(data.map(u => u.block).filter(Boolean))).sort();
        setBlocks(uniqueBlocks);
        
        // Extrai moradores únicos das unidades
        const residentMap = {};
        data.forEach(u => {
          (u.residents || []).forEach(r => {
            residentMap[r.id] = r;
          });
        });
        setResidents(Object.values(residentMap).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch {}
  };

  const loadMessages = async () => {
    if (propertyId === 'demo-vila-id') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/messages`);
      if (r.ok) setMessages(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (propertyId === 'demo-vila-id') {
      setMessages([
        {
          id: 'demo-bcast-initial',
          title: '🚨 Manutenção dos Portões',
          body: 'Prezados moradores, os portões de acesso do Bloco 1 passarão por manutenção preventiva nesta quarta-feira das 9h às 11h.',
          priority: 'urgent',
          targetType: 'all',
          createdAt: new Date(Date.now() - 3600000 * 2),
          readBy: ['demo-r-b1-101', 'demo-r-b2-302', 'demo-r-b1-204']
        }
      ]);
      setLoading(false);
    } else if (propertyId) {
      loadMessages();
      loadUnits();
    }
  }, [propertyId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('O arquivo é muito grande. O limite máximo é de 20MB.');
      return;
    }

    setFileLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaUrl(event.target.result);
      if (file.type.startsWith('video/')) {
        setMediaType('video');
      } else {
        setMediaType('image');
      }
      setFileLoading(false);
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
      setFileLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!body.trim()) return;
    setSending(true);

    if (propertyId === 'demo-vila-id') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.4;
        audio.play().catch(() => {});
      } catch {}

      const newMsg = {
        id: 'demo-bcast-' + Date.now(),
        title: title || 'Aviso do Condomínio',
        body,
        priority,
        targetType,
        targetValue,
        mediaUrl,
        mediaType,
        createdAt: new Date(),
        readBy: ['demo-r-b1-101', 'demo-r-b2-302', 'demo-r-b1-204', 'demo-r-b2-405']
      };
      setMessages(prev => [newMsg, ...prev]);

      const event = new CustomEvent('demo-broadcast-sent', { detail: newMsg });
      window.dispatchEvent(event);

      setTitle(''); setBody(''); setPriority('normal');
      setTargetType('all'); setTargetValue('');
      setMediaUrl(''); setMediaType('');
      setSent(true); setTimeout(() => setSent(false), 3000);
      setSending(false);
      return;
    }

    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/broadcast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminEmail, 
          title: title || 'Aviso do Condomínio', 
          body, 
          priority,
          targetType,
          targetValue: targetType === 'all' ? '' : targetValue,
          mediaUrl,
          mediaType
        })
      });
      if (r.ok) {
        setTitle(''); setBody(''); setPriority('normal');
        setTargetType('all'); setTargetValue('');
        setMediaUrl(''); setMediaType('');
        setSent(true); setTimeout(() => setSent(false), 3000);
        loadMessages();
      } else { const d = await r.json(); alert(d.error); }
    } catch { alert('Erro ao enviar mensagem.'); }
    setSending(false);
  };

  const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid var(--border-subtle)', fontSize:'14px', outline:'none', background:'var(--bg-deep)', color:'var(--text-main)', fontFamily:'inherit' };

  return (
    <div style={{ padding:'20px 0', color:'var(--text-main)' }}>
      <h3 style={{ fontSize:'18px', fontWeight:800, marginBottom:'4px' }}>📢 Comunicados</h3>
      <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'20px' }}>Envie mensagens segmentadas com mídias para os moradores do condomínio</p>

      {/* Composer */}
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'16px', padding:'20px', marginBottom:'24px', boxShadow:'0 4px 12px rgba(0,0,0,0.03)' }}>
        
        {/* Filtros de Destinatário */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text-muted)', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>ENVIAR PARA</label>
            <select value={targetType} onChange={e => { setTargetType(e.target.value); setTargetValue(''); }} style={inputStyle}>
              <option value="all">Todos os Moradores</option>
              <option value="block">Por Bloco</option>
              <option value="unit">Por Apartamento / Unidade</option>
              <option value="resident">Por Morador Específico</option>
            </select>
          </div>

          {targetType !== 'all' && (
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text-muted)', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>
                {targetType === 'block' ? 'SELECIONE O BLOCO' : targetType === 'unit' ? 'SELECIONE A UNIDADE' : 'SELECIONE O MORADOR'}
              </label>
              <select value={targetValue} onChange={e => setTargetValue(e.target.value)} style={inputStyle}>
                <option value="">-- Selecione o Destinatário --</option>
                {targetType === 'block' && blocks.map(b => (
                  <option key={b} value={b}>Bloco {b}</option>
                ))}
                {targetType === 'unit' && units.map(u => (
                  <option key={u.id} value={u.id}>{u.name} {u.block ? `(Bloco ${u.block})` : ''}</option>
                ))}
                {targetType === 'resident' && residents.map(r => (
                  <option key={r.id} value={r.id}>{r.name} {r.email ? `(${r.email})` : '(Sem e-mail)'}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text-muted)', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>TÍTULO</label>
          <input style={inputStyle} placeholder="Ex: Aviso importante sobre manutenção" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        
        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text-muted)', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>MENSAGEM *</label>
          <textarea style={{ ...inputStyle, minHeight:'100px', resize:'vertical' }} placeholder="Digite sua mensagem aqui..." value={body} onChange={e => setBody(e.target.value)} />
        </div>

        {/* Anexo de Mídia */}
        <div style={{ marginBottom:'18px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text-muted)', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>FOTO OU VÍDEO ANEXO</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input type="file" accept="image/*,video/*" id="broadcast-file" onChange={handleFileChange} style={{ display: 'none' }} />
            <label htmlFor="broadcast-file" style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Paperclip size={14} /> Anexar Foto ou Vídeo
            </label>
            {fileLoading && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lendo arquivo...</span>}
            {mediaUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>✓ Arquivo {mediaType === 'video' ? 'Vídeo' : 'Foto'} anexado</span>
                <button onClick={() => { setMediaUrl(''); setMediaType(''); }} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>Remover</button>
              </div>
            )}
          </div>
          {mediaUrl && (
            <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: '120px', maxWidth: '200px', display: 'flex', justifyContent: 'center', background: 'var(--bg-deep)' }}>
              {mediaType === 'video' ? (
                <video src={mediaUrl} controls style={{ width: '100%', maxHeight: '120px', objectFit: 'contain' }} />
              ) : (
                <img src={mediaUrl} alt="Preview" style={{ width: '100%', maxHeight: '120px', objectFit: 'contain' }} />
              )}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          <button onClick={() => setPriority('normal')} style={{ flex:1, padding:'10px', borderRadius:'10px', border: priority==='normal' ? '2px solid #3B82F6' : '1px solid var(--border-subtle)', background: priority==='normal' ? 'rgba(59,130,246,0.05)' : 'var(--bg-surface)', cursor:'pointer', fontWeight:600, fontSize:'13px', color: priority==='normal' ? '#3B82F6' : 'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            <MessageSquare size={14}/> Normal
          </button>
          <button onClick={() => setPriority('urgent')} style={{ flex:1, padding:'10px', borderRadius:'10px', border: priority==='urgent' ? '2px solid #EF4444' : '1px solid var(--border-subtle)', background: priority==='urgent' ? 'rgba(239,68,68,0.05)' : 'var(--bg-surface)', cursor:'pointer', fontWeight:600, fontSize:'13px', color: priority==='urgent' ? '#EF4444' : 'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            <AlertTriangle size={14}/> Urgente
          </button>
        </div>

        <button 
          onClick={sendMessage} 
          disabled={sending || !body.trim() || (targetType !== 'all' && !targetValue) || fileLoading} 
          style={{ width:'100%', padding:'14px', borderRadius:'12px', border:'none', background: sent ? '#10B981' : 'linear-gradient(135deg,#3B82F6,#2563EB)', color:'#fff', fontWeight:700, fontSize:'15px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', opacity: (sending || !body.trim() || (targetType !== 'all' && !targetValue) || fileLoading) ? 0.6 : 1, transition:'all 0.3s', boxShadow:'0 8px 24px rgba(59,130,246,0.25)' }}
        >
          {sent ? <><CheckCheck size={18}/> Enviado com sucesso!</> : sending ? 'Enviando...' : <><Send size={18}/> Enviar Comunicado</>}
        </button>
      </div>

      {/* Histórico */}
      <h4 style={{ fontSize:'14px', fontWeight:700, marginBottom:'12px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'8px' }}>
        <Clock size={14}/> Mensagens Enviadas ({messages.length})
      </h4>
      {loading ? <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px' }}>Carregando...</p> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {messages.map(m => (
            <div key={m.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'14px', padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <span style={{ fontWeight:700, fontSize:'14px', display:'flex', alignItems:'center', gap:'6px' }}>
                  {m.priority === 'urgent' && <AlertTriangle size={14} color="#EF4444"/>}
                  {m.title}
                </span>
                <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{fmt(m.createdAt)}</span>
              </div>
              <p style={{ fontSize:'13px', color:'var(--text-main)', margin:0, lineHeight:1.6 }}>{m.body}</p>
              
              {/* Mídia Anexada */}
              {m.mediaUrl && (
                <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: '180px', display: 'flex', justifyContent: 'flex-start', background: 'var(--bg-deep)' }}>
                  {m.mediaType === 'video' ? (
                    <video src={m.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }} />
                  ) : (
                    <img src={m.mediaUrl} alt="Anexo" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }} />
                  )}
                </div>
              )}

              {/* Informações Extras de Segmentação e Leitura */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                <span>
                  🎯 Destinatário:{' '}
                  {m.targetType === 'block' ? `Bloco ${m.targetValue}` :
                   m.targetType === 'unit' ? `Unidade ${units.find(u => u.id === m.targetValue)?.name || m.targetValue}` :
                   m.targetType === 'resident' ? `Morador ${residents.find(r => r.id === m.targetValue)?.name || m.targetValue}` :
                   'Todos'}
                </span>
                {m.readBy && m.readBy.length > 0 && (
                  <div style={{ color:'#10B981', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Users size={11}/> Lido por {m.readBy.length} morador{m.readBy.length !== 1 ? 'es' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'24px', fontSize:'13px' }}>Nenhuma mensagem enviada ainda.</p>}
        </div>
      )}
    </div>
  );
}
