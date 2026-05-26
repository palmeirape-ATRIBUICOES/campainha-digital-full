import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Bell, Home, MessageSquare, Settings, LogOut, Users, Send, Megaphone,
  ChevronRight, RefreshCw, Hash, CheckCircle2, X, AlertCircle
} from 'lucide-react';
import { API } from '../config';
import Logo from '../components/Logo';

export default function VilaAdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('messages');
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null); // null = broadcast view
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vilaName, setVilaName] = useState('');
  const [houseCount, setHouseCount] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  const adminId = localStorage.getItem('cd_token');
  const propertyId = localStorage.getItem('cd_vila_property_id');
  const adminName = localStorage.getItem('cd_vila_admin_name') || 'Admin';

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!adminId || !propertyId) {
      navigate('/auth');
    }
  }, []);

  // ── Socket.io ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!propertyId) return;
    const s = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = s;
    s.on('connect', () => s.emit('join_room', { room: `vila_${propertyId}` }));
    s.on('vila_message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => s.disconnect();
  }, [propertyId]);

  // ── Fetch property + messages ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!propertyId) return;
    try {
      const [propRes, msgRes] = await Promise.all([
        fetch(`${API}/api/vila/${propertyId}`),
        fetch(`${API}/api/vila/${propertyId}/messages`)
      ]);
      if (propRes.ok) {
        const p = await propRes.json();
        setProperty(p);
        setUnits(p.units || []);
        setVilaName(p.name || '');
        setHouseCount(p.vilaHouseCount || p.units?.length || 1);
      }
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch (err) { console.error('[Vila]', err); }
  }, [propertyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUnit]);

  // ── Send message ─────────────────────────────────────────────────────
  const sendMessage = async (isBroadcast = false) => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await fetch(`${API}/api/vila/${propertyId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: adminId,
          senderName: adminName,
          content: msgText.trim(),
          unitId: isBroadcast ? null : selectedUnit?.id,
          isFromAdmin: true
        })
      });
      setMsgText('');
    } catch (err) { console.error(err); }
    setSending(false);
  };

  // ── Save settings ────────────────────────────────────────────────────
  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/vila/${propertyId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': adminId },
        body: JSON.stringify({ name: vilaName, vilaHouseCount: parseInt(houseCount) })
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Configurações salvas! As campanhas foram atualizadas.' });
        fetchData();
      } else {
        const d = await res.json();
        setFeedback({ type: 'error', text: d.error || 'Erro ao salvar.' });
      }
    } catch { setFeedback({ type: 'error', text: 'Erro de conexão.' }); }
    setSaving(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  // ── Logout ───────────────────────────────────────────────────────────
  const logout = () => {
    ['cd_token', 'cd_user_id', 'cd_vila_property_id', 'cd_vila_admin_name', 'cd_login_type']
      .forEach(k => localStorage.removeItem(k));
    navigate('/auth');
  };

  // ── Computed messages for current view ───────────────────────────────
  const visibleMessages = messages.filter(m =>
    selectedUnit
      ? (m.unitId === selectedUnit.id || m.unitId === null)
      : true  // admin sees all
  );

  // ── Unread per unit ───────────────────────────────────────────────────
  const unreadByUnit = (unitId) =>
    messages.filter(m => m.unitId === unitId && !m.isFromAdmin && !m.read).length;

  const totalUnread = messages.filter(m => !m.isFromAdmin && !m.read).length;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#F0F4F8' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: '260px', background: 'linear-gradient(180deg, #0F2027 0%, #1a3a4a 100%)',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)'
      }}>
        {/* Logo + Name */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Logo size={28} />
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Admin de Vila</div>
            <div style={{ fontSize: '16px', color: '#FFF', fontWeight: 800, marginTop: '4px' }}>{property?.name || 'Carregando...'}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{adminName}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {[
            { id: 'messages', icon: MessageSquare, label: 'Mensagens', badge: totalUnread },
            { id: 'units', icon: Home, label: 'Campanhas', badge: units.length },
            { id: 'settings', icon: Settings, label: 'Configurações' }
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: tab === item.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: tab === item.id ? '#FFF' : 'rgba(255,255,255,0.5)',
              fontWeight: 700, fontSize: '14px', marginBottom: '4px',
              transition: 'all 0.2s', textAlign: 'left', position: 'relative'
            }}>
              <item.icon size={18} />
              {item.label}
              {item.badge > 0 && (
                <span style={{
                  marginLeft: 'auto', background: item.id === 'messages' ? '#F97316' : 'rgba(255,255,255,0.15)',
                  color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '2px 7px',
                  borderRadius: '20px', minWidth: '20px', textAlign: 'center'
                }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={logout} style={{
            width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
            background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', fontWeight: 700,
            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px'
          }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ── MENSAGENS ── */}
        {tab === 'messages' && (
          <div style={{ display: 'flex', flex: 1, height: '100vh' }}>

            {/* Unit list */}
            <div style={{ width: '280px', background: '#FFF', borderRight: '1px solid #E2E8F0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conversas</div>
              </div>

              {/* Broadcast */}
              <button onClick={() => setSelectedUnit(null)} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                border: 'none', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left', width: '100%',
                background: selectedUnit === null ? '#EFF6FF' : 'transparent'
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#F97316,#EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Megaphone size={18} color="#FFF" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>📢 Aviso Geral</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Envia para toda a vila</div>
                </div>
              </button>

              {/* Individual units */}
              {units.map(unit => {
                const unread = unreadByUnit(unit.id);
                const lastMsg = [...messages].filter(m => m.unitId === unit.id).pop();
                return (
                  <button key={unit.id} onClick={() => setSelectedUnit(unit)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                    border: 'none', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left', width: '100%',
                    background: selectedUnit?.id === unit.id ? '#EFF6FF' : 'transparent'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                      <Bell size={18} color="#FFF" />
                      {unread > 0 && (
                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#EF4444', borderRadius: '50%', fontSize: '9px', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{unread}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{unit.name}</div>
                      {lastMsg && (
                        <div style={{ fontSize: '11px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lastMsg.isFromAdmin ? 'Você: ' : ''}{lastMsg.content}
                        </div>
                      )}
                      {unit.residents?.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>● {unit.residents.length} morador(es)</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
              {/* Header */}
              <div style={{ padding: '20px 28px', background: '#FFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedUnit === null ? (
                  <>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,#F97316,#EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Megaphone size={20} color="#FFF" />
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>📢 Aviso Geral</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>Mensagem enviada para todos os moradores da vila</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={20} color="#FFF" />
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>{selectedUnit.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>
                        {selectedUnit.residents?.length > 0
                          ? selectedUnit.residents.map(r => r.name).join(', ')
                          : 'Sem moradores cadastrados'}
                      </div>
                    </div>
                  </>
                )}
                <button onClick={fetchData} style={{ marginLeft: 'auto', padding: '8px', background: '#F1F5F9', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                  <RefreshCw size={16} color="#64748B" />
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {visibleMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '14px', marginTop: '40px' }}>
                    Nenhuma mensagem ainda. Comece a conversa!
                  </div>
                )}
                {visibleMessages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.isFromAdmin ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '60%', padding: '12px 16px', borderRadius: msg.isFromAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.isFromAdmin
                        ? (msg.unitId === null ? 'linear-gradient(135deg,#F97316,#EA580C)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)')
                        : '#FFF',
                      color: msg.isFromAdmin ? '#FFF' : '#1E293B',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      {!msg.isFromAdmin && (
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                          {msg.senderName} {msg.unitId === null ? '(broadcast)' : ''}
                        </div>
                      )}
                      {msg.unitId === null && msg.isFromAdmin && (
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                          📢 Aviso para todos
                        </div>
                      )}
                      <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{msg.content}</div>
                      <div style={{ fontSize: '10px', marginTop: '6px', color: msg.isFromAdmin ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>
                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '16px 28px', background: '#FFF', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(selectedUnit === null); } }}
                  placeholder={selectedUnit === null ? '📢 Escreva um aviso para toda a vila...' : `Mensagem para ${selectedUnit?.name}...`}
                  rows={2}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: '14px', border: '1px solid #E2E8F0',
                    fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'Inter, sans-serif',
                    background: '#F8FAFC'
                  }}
                />
                <button
                  onClick={() => sendMessage(selectedUnit === null)}
                  disabled={sending || !msgText.trim()}
                  style={{
                    padding: '12px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                    background: selectedUnit === null
                      ? 'linear-gradient(135deg,#F97316,#EA580C)'
                      : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                    color: '#FFF', fontWeight: 700, fontSize: '14px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: sending || !msgText.trim() ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                  }}
                >
                  <Send size={16} />
                  {selectedUnit === null ? 'Avisar Todos' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── UNIDADES ── */}
        {tab === 'units' && (
          <div style={{ padding: '40px 48px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>🔔 Campanhas da Vila</h2>
            <p style={{ color: '#64748B', marginBottom: '32px' }}>
              {units.length} campainha(s) configurada(s). Configure o número nas <strong>Configurações</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {units.map((unit, idx) => (
                <div key={unit.id} style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `hsl(${(idx * 47) % 360},70%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Bell size={22} color="#FFF" />
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>{unit.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    {unit.residents?.length > 0
                      ? `👤 ${unit.residents.map(r => r.name).join(', ')}`
                      : '⚠️ Sem moradores'}
                  </div>
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    Código: {unit.inviteCode || '—'}
                  </div>
                  <button onClick={() => { setSelectedUnit(unit); setTab('messages'); }} style={{
                    marginTop: '12px', width: '100%', padding: '10px', borderRadius: '10px',
                    border: 'none', background: '#EFF6FF', color: '#3B82F6', fontWeight: 700,
                    fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}>
                    <MessageSquare size={14} /> Enviar Mensagem
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {tab === 'settings' && (
          <div style={{ padding: '40px 48px', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>⚙️ Configurações da Vila</h2>
            <p style={{ color: '#64748B', marginBottom: '32px' }}>
              Defina o nome e o número de casas. O sistema criará as campanhas automaticamente.
            </p>

            {feedback && (
              <div style={{
                padding: '14px 18px', borderRadius: '14px', marginBottom: '24px',
                background: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${feedback.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                color: feedback.type === 'success' ? '#166534' : '#991B1B',
                display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600
              }}>
                {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {feedback.text}
              </div>
            )}

            <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Nome da Vila
                </label>
                <input
                  value={vilaName}
                  onChange={e => setVilaName(e.target.value)}
                  placeholder="Ex: Vila das Flores"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Número de Casas / Campanhas
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={houseCount}
                    onChange={e => setHouseCount(parseInt(e.target.value) || 1)}
                    style={{ width: '120px', padding: '14px 16px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '18px', fontWeight: 800, outline: 'none', textAlign: 'center' }}
                  />
                  <div style={{ fontSize: '14px', color: '#64748B' }}>
                    {houseCount} campanhas serão criadas no QR code da vila
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
                <strong>⚠️ Atenção:</strong> Reduzir o número de casas remove as campanhas excedentes que não têm moradores cadastrados.
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '16px 28px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', color: '#FFF',
                  fontWeight: 800, fontSize: '15px', opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 16px rgba(59,130,246,0.3)', alignSelf: 'flex-start'
                }}
              >
                {saving ? 'Salvando...' : '💾 Salvar Configurações'}
              </button>
            </form>

            {/* QR Code info */}
            <div style={{ marginTop: '40px', padding: '24px', background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>📱 QR Code da Vila</h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>
                O QR code da sua vila aponta para o link abaixo. Ao escanear, o visitante vê a lista de campanhas e toca na que deseja chamar.
              </p>
              <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: '10px', fontFamily: 'monospace', fontSize: '12px', color: '#3B82F6', wordBreak: 'break-all' }}>
                {window.location.origin}{window.location.pathname}#/chamada/{propertyId}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
