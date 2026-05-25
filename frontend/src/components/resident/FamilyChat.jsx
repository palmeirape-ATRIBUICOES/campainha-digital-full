import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, ArrowLeft, User, CheckCheck } from 'lucide-react';
import { API } from '../../config';

export default function FamilyChat({ userId, userName, socket }) {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    setLoadingContacts(true);
    try {
      const r = await fetch(`${API}/api/family-messages/${userId}/contacts`);
      if (r.ok) setContacts(await r.json());
    } catch {}
    setLoadingContacts(false);
  }, [userId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openConversation = async (contact) => {
    setActiveContact(contact);
    setLoadingMsgs(true);
    try {
      const r = await fetch(`${API}/api/family-messages/${userId}/conversation/${contact.id}`);
      if (r.ok) {
        setMessages(await r.json());
        // Marca mensagens desse contato como lidas na lista
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unreadCount: 0 } : c));
      }
    } catch {}
    setLoadingMsgs(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Recebe mensagens em tempo real
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (
        (msg.senderId === activeContact?.id && msg.receiverId === userId) ||
        (msg.senderId === userId && msg.receiverId === activeContact?.id)
      ) {
        setMessages(prev => [...prev, msg]);
      } else {
        // Atualiza contador de não-lidas na lista de contatos
        setContacts(prev => prev.map(c =>
          c.id === msg.senderId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
        ));
      }
    };
    socket.on('family_message', handler);
    return () => socket.off('family_message', handler);
  }, [socket, activeContact, userId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeContact || sending) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/api/family-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId, receiverId: activeContact.id, content: newMsg.trim() })
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages(prev => [...prev, msg]);
        setNewMsg('');
      }
    } catch {}
    setSending(false);
  };

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // ── Tela de conversa ──────────────────────────────────────────────────────
  if (activeContact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', maxWidth: '520px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fff', borderBottom: '1px solid #E2E8F0', borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
          <button onClick={() => { setActiveContact(null); setMessages([]); }} style={{ background: '#F1F5F9', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="#475569" />
          </button>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{activeContact.name}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Morador da residência</p>
          </div>
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#F8FAFC' }}>
          {loadingMsgs ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', paddingTop: '40px' }}>Carregando mensagens...</p>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '60px', color: '#94A3B8' }}>
              <MessageCircle size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Nenhuma mensagem ainda</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Diga oi! 👋</p>
            </div>
          ) : messages.map(m => {
            const isMine = m.senderId === userId;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMine ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#fff',
                  color: isMine ? '#fff' : '#1E293B',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: isMine ? '0 4px 12px rgba(99,102,241,0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
                  border: isMine ? 'none' : '1px solid #E2E8F0'
                }}>
                  <p style={{ margin: '0 0 4px', lineHeight: 1.4 }}>{m.content}</p>
                  <p style={{ margin: 0, fontSize: '10px', opacity: 0.65, textAlign: 'right', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {isMine && <CheckCheck size={12} />}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: '#fff', borderTop: '1px solid #E2E8F0', borderRadius: '0 0 20px 20px', flexShrink: 0 }}>
          <input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder={`Mensagem para ${activeContact.name}...`}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', background: '#F8FAFC', fontWeight: 500 }}
          />
          <button
            type="submit"
            disabled={!newMsg.trim() || sending}
            style={{ padding: '12px 16px', borderRadius: '14px', border: 'none', background: newMsg.trim() ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#E2E8F0', color: newMsg.trim() ? '#fff' : '#94A3B8', cursor: newMsg.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    );
  }

  // ── Lista de contatos ─────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 4px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={22} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.5px' }}>
            Mensagens da Família
            {totalUnread > 0 && (
              <span style={{ marginLeft: '8px', background: '#EF4444', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '20px' }}>
                {totalUnread}
              </span>
            )}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Converse com os moradores da sua residência
          </p>
        </div>
      </div>

      {loadingContacts ? (
        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', padding: '40px 0' }}>Carregando...</p>
      ) : contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)', borderRadius: '20px', color: 'var(--text-muted)' }}>
          <MessageCircle size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Nenhum morador cadastrado</p>
          <p style={{ fontSize: '12px', margin: 0 }}>
            Cadastre dependentes em <strong>Moradores & Acessos</strong> para conversar com eles aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => openConversation(contact)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '18px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>{contact.name[0].toUpperCase()}</span>
                </div>
                {contact.unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: -3, right: -3, width: '18px', height: '18px', borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: '9px', fontWeight: 800 }}>{contact.unreadCount}</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {contact.name}
                  {contact.unreadCount > 0 && (
                    <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>• nova mensagem</span>
                  )}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, fontWeight: 500 }}>
                  {contact.clientCode ? `Código: ${contact.clientCode}` : 'Morador principal'}
                </p>
              </div>
              <div style={{ color: '#CBD5E1', flexShrink: 0 }}>›</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
