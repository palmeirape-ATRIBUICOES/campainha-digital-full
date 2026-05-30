import React, { useState } from 'react';
import { Bell, ChevronDown, ChevronUp, AlertTriangle, MessageSquare, X } from 'lucide-react';

function fmt(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Agora';
  if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
  return d.toLocaleDateString('pt-BR');
}

export default function MessagesPanel({ messages, unreadCount, onClear }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);

  if (messages.length === 0) return null;

  return (
    <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
      {/* Cabeçalho colapsável */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: expanded ? '14px 14px 0 0' : '14px',
          background: unreadCount > 0 ? 'linear-gradient(135deg,#3B82F6,#2563EB)' : '#FFF',
          border: `1px solid ${unreadCount > 0 ? '#2563EB' : '#E2E8F0'}`,
          color: unreadCount > 0 ? '#FFF' : '#1E293B', cursor: 'pointer',
          transition: 'all 0.2s', boxShadow: unreadCount > 0 ? '0 4px 16px rgba(59,130,246,0.3)' : '0 1px 4px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={18} />
          <span style={{ fontWeight: 700, fontSize: '14px' }}>Mensagens do Condomínio</span>
          {unreadCount > 0 && (
            <span style={{ background: '#FFF', color: '#3B82F6', borderRadius: '99px', padding: '2px 8px', fontSize: '11px', fontWeight: 800 }}>
              {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>

      {/* Lista de mensagens */}
      {expanded && (
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
          {messages.slice(0, 10).map((m, i) => (
            <button key={m.id || i} onClick={() => setSelected(selected === i ? null : i)}
              style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: selected === i ? '#F0F7FF' : 'transparent', border: 'none',
                borderBottom: i < messages.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {m.priority === 'urgent'
                  ? <AlertTriangle size={16} color="#EF4444"/>
                  : <MessageSquare size={16} color="#3B82F6"/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>{m.title}</span>
                  <span style={{ fontSize: '10px', color: '#94A3B8', whiteSpace: 'nowrap', marginLeft: '8px' }}>{fmt(m.createdAt)}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5,
                  overflow: selected === i ? 'visible' : 'hidden',
                  display: selected === i ? 'block' : '-webkit-box',
                  WebkitLineClamp: selected === i ? 'none' : 2,
                  WebkitBoxOrient: 'vertical' }}>
                  {m.body}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal de mensagem selecionada */}
      {selected !== null && messages[selected] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: '0' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#FFF', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxHeight: '70vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '16px', margin: 0 }}>{messages[selected].title}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>{messages[selected].body}</p>
            
            {/* Renderizar anexo de mídia (foto ou vídeo) */}
            {messages[selected].mediaUrl && (
              <div style={{ marginBottom: '16px', width: '100%' }}>
                {messages[selected].mediaUrl.startsWith('data:video/') || messages[selected].mediaUrl.includes('.mp4') ? (
                  <video src={messages[selected].mediaUrl} controls style={{ width: '100%', maxHeight: '280px', borderRadius: '12px', objectFit: 'contain', background: '#000', border: '1px solid #E2E8F0' }} />
                ) : (
                  <img src={messages[selected].mediaUrl} alt="Anexo de Comunicado" style={{ width: '100%', maxHeight: '280px', borderRadius: '12px', objectFit: 'contain', background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
                )}
              </div>
            )}

            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{fmt(messages[selected].createdAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
