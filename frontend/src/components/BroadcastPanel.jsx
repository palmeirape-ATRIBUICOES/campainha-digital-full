import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, AlertTriangle, Clock, CheckCheck, Users } from 'lucide-react';

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

  const loadMessages = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/messages`);
      if (r.ok) setMessages(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (propertyId) loadMessages(); }, [propertyId]);

  const sendMessage = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/broadcast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, title: title || 'Aviso do Condomínio', body, priority })
      });
      if (r.ok) {
        setTitle(''); setBody(''); setPriority('normal');
        setSent(true); setTimeout(() => setSent(false), 3000);
        loadMessages();
      } else { const d = await r.json(); alert(d.error); }
    } catch { alert('Erro ao enviar mensagem.'); }
    setSending(false);
  };

  const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid #E2E8F0', fontSize:'14px', outline:'none', background:'#F8FAFC', fontFamily:'inherit' };

  return (
    <div style={{ padding:'20px 0' }}>
      <h3 style={{ fontSize:'18px', fontWeight:800, marginBottom:'4px' }}>📢 Comunicados</h3>
      <p style={{ fontSize:'12px', color:'#64748B', marginBottom:'20px' }}>Envie mensagens para todos os moradores do condomínio</p>

      {/* Composer */}
      <div style={{ background:'#FFF', border:'1px solid #E2E8F0', borderRadius:'16px', padding:'20px', marginBottom:'24px', boxShadow:'0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>TÍTULO</label>
          <input style={inputStyle} placeholder="Ex: Aviso importante sobre manutenção" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>MENSAGEM *</label>
          <textarea style={{ ...inputStyle, minHeight:'100px', resize:'vertical' }} placeholder="Digite sua mensagem para todos os moradores..." value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          <button onClick={() => setPriority('normal')} style={{ flex:1, padding:'10px', borderRadius:'10px', border: priority==='normal' ? '2px solid #3B82F6' : '1px solid #E2E8F0', background: priority==='normal' ? 'rgba(59,130,246,0.05)' : '#FFF', cursor:'pointer', fontWeight:600, fontSize:'13px', color: priority==='normal' ? '#3B82F6' : '#64748B', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            <MessageSquare size={14}/> Normal
          </button>
          <button onClick={() => setPriority('urgent')} style={{ flex:1, padding:'10px', borderRadius:'10px', border: priority==='urgent' ? '2px solid #EF4444' : '1px solid #E2E8F0', background: priority==='urgent' ? 'rgba(239,68,68,0.05)' : '#FFF', cursor:'pointer', fontWeight:600, fontSize:'13px', color: priority==='urgent' ? '#EF4444' : '#64748B', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            <AlertTriangle size={14}/> Urgente
          </button>
        </div>
        <button onClick={sendMessage} disabled={sending || !body.trim()} style={{ width:'100%', padding:'14px', borderRadius:'12px', border:'none', background: sent ? '#10B981' : 'linear-gradient(135deg,#3B82F6,#2563EB)', color:'#fff', fontWeight:700, fontSize:'15px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', opacity: sending || !body.trim() ? 0.6 : 1, transition:'all 0.3s', boxShadow:'0 8px 24px rgba(59,130,246,0.25)' }}>
          {sent ? <><CheckCheck size={18}/> Enviado com sucesso!</> : sending ? 'Enviando...' : <><Send size={18}/> Enviar para Todos os Moradores</>}
        </button>
      </div>

      {/* Histórico */}
      <h4 style={{ fontSize:'14px', fontWeight:700, marginBottom:'12px', color:'#64748B', display:'flex', alignItems:'center', gap:'8px' }}>
        <Clock size={14}/> Mensagens Enviadas ({messages.length})
      </h4>
      {loading ? <p style={{ textAlign:'center', color:'#64748B', padding:'20px' }}>Carregando...</p> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {messages.map(m => (
            <div key={m.id} style={{ background:'#FFF', border:'1px solid #E2E8F0', borderRadius:'14px', padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <span style={{ fontWeight:700, fontSize:'14px', display:'flex', alignItems:'center', gap:'6px' }}>
                  {m.priority === 'urgent' && <AlertTriangle size={14} color="#EF4444"/>}
                  {m.title}
                </span>
                <span style={{ fontSize:'11px', color:'#64748B' }}>{fmt(m.createdAt)}</span>
              </div>
              <p style={{ fontSize:'13px', color:'#475569', margin:0, lineHeight:1.6 }}>{m.body}</p>
              {m.readBy && m.readBy.length > 0 && (
                <div style={{ marginTop:'8px', fontSize:'11px', color:'#10B981', display:'flex', alignItems:'center', gap:'4px' }}>
                  <Users size={11}/> Lido por {m.readBy.length} morador{m.readBy.length !== 1 ? 'es' : ''}
                </div>
              )}
            </div>
          ))}
          {messages.length === 0 && <p style={{ textAlign:'center', color:'#94A3B8', padding:'24px', fontSize:'13px' }}>Nenhuma mensagem enviada ainda.</p>}
        </div>
      )}
    </div>
  );
}

