import React, { useState, useEffect } from 'react';
import { Calendar, Package, FileText, Send, Folder, X, MessageSquare, ChevronRight, UserCheck, PlusCircle, AlertCircle, ShoppingBag, MessageCircle, HelpCircle, ShieldAlert } from 'lucide-react';

// 1. RESERVAS PANEL (Common Area Bookings with CSS interactive calendar)
export function ReservasPanel({
  bookings,
  bookingLoading,
  createBooking,
  cancelBooking,
  newBookingArea,
  setNewBookingArea,
  newBookingDate,
  setNewBookingDate
}) {
  const areas = [
    { name: 'Churrasqueira', desc: 'Espaço gourmet externo com churrasqueira e freezer.', fee: 'R$ 50,00' },
    { name: 'Piscina', desc: 'Reserva exclusiva de quiosque na área da piscina.', fee: 'Gratuito' },
    { name: 'Salão de Festas', desc: 'Espaço fechado climatizado completo com cozinha e som.', fee: 'R$ 150,00' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} className="lux-glass">
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar style={{ color: 'var(--primary)' }} /> Reservar Área Comum
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Escolha um espaço do condomínio, selecione a data desejada e faça o agendamento instantaneamente.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Selecione o Espaço</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {areas.map(a => (
                <button
                  key={a.name}
                  onClick={() => setNewBookingArea(a.name)}
                  style={{
                    padding: '16px 12px',
                    borderRadius: '16px',
                    border: newBookingArea === a.name ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-subtle)',
                    background: newBookingArea === a.name ? 'rgba(99, 102, 241, 0.12)' : 'rgba(13, 20, 38, 0.4)',
                    color: '#FFF',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textAlign: 'left',
                    boxShadow: newBookingArea === a.name ? '0 0 15px rgba(99,102,241,0.2)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>{a.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Taxa: {a.fee}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Data do Agendamento</label>
              <input
                type="date"
                value={newBookingDate}
                onChange={e => setNewBookingDate(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 17, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '14px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={createBooking}
                disabled={bookingLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {bookingLoading ? 'Reservando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reservas Ativas */}
      <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '16px' }}>Reservas Ativas da Unidade</h4>
        
        {bookingLoading && bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Carregando reservas...</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Nenhuma reserva cadastrada para este condomínio.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookings.map(b => (
              <div
                key={b.id}
                style={{
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#FFF', marginBottom: '4px' }}>{b.areaName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Data: <strong>{new Date(b.bookingDate).toLocaleDateString('pt-BR')}</strong>
                  </div>
                  {b.unit && (
                    <div style={{ fontSize: '10px', color: 'rgba(99, 102, 241, 0.7)', marginTop: '2px' }}>
                      Reservado por: {b.unit.name}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => cancelBooking(b.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 2. ENCOMENDAS PANEL (Parcel/mail visual shelf tracking)
export function EncomendasPanel({
  unitAlerts,
  alertsLoading,
  visitorOrPackageName,
  setVisitorOrPackageName,
  dispatchAlertLoading,
  dispatchAlert
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      {/* Estante Digital de Encomendas */}
      <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package style={{ color: 'var(--primary)' }} /> Estante de Encomendas
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Veja correspondências e pacotes recebidos pela portaria que estão aguardando sua retirada.
        </p>

        {alertsLoading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Buscando entregas...</div>
        ) : unitAlerts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 20px', background: 'rgba(5, 8, 17, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: '18px' }}>
            <span style={{ fontSize: '32px' }}>📦</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#FFF', fontSize: '14px', marginBottom: '4px' }}>Estante de Pacotes Vazia</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Você não possui encomendas pendentes de retirada na portaria.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            {unitAlerts.map(a => (
              <div
                key={a.id}
                style={{
                  padding: '20px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Glowing neon halo indicator for package */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
                  background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)'
                }} />

                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', borderRadius: '14px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#FFF' }}>{a.title}</span>
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.15)', color: '#F8AMBER', padding: '4px 8px', borderRadius: '100px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      Aguardando Retirada
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    {a.description || 'Uma encomenda chegou para a sua residência e está na portaria.'}
                  </p>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                    <span>Recebido em: <strong>{new Date(a.createdAt).toLocaleString('pt-BR')}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avisar Portaria que irá retirar */}
      <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>Avisar Retirada à Portaria</h4>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Deixe um aviso para o porteiro sabendo que você está descendo ou que enviará alguém para pegar o pacote.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Ex: 'Estou descendo para pegar' ou 'Meu filho irá retirar'"
            value={visitorOrPackageName}
            onChange={e => setVisitorOrPackageName(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(5, 8, 17, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#FFF',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button
            onClick={() => dispatchAlert('package', '📦 Retirar Encomenda', 'Morador avisa que irá retirar encomenda na portaria.')}
            disabled={dispatchAlertLoading}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.2s'
            }}
          >
            {dispatchAlertLoading ? 'Enviando...' : 'Avisar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. MURAL PANEL (Announcements)
export function MuralPanel({ broadcastMessages, unreadCount, markVilaMessagesAsRead }) {
  useEffect(() => {
    // marca como lido ao abrir o mural
    if (markVilaMessagesAsRead) {
      markVilaMessagesAsRead();
    }
  }, [markVilaMessagesAsRead]);

  return (
    <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FileText style={{ color: 'var(--primary)' }} /> Mural de Avisos
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Acompanhe comunicados oficiais, editais de convocação e notícias compartilhadas pela administração do condomínio.
      </p>

      {broadcastMessages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nenhum aviso registrado no mural.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {broadcastMessages.map(m => {
            const isUrgent = m.priority === 'urgent';
            return (
              <div
                key={m.id}
                style={{
                  padding: '20px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: isUrgent ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-subtle)',
                  boxShadow: isUrgent ? '0 0 15px rgba(239, 68, 68, 0.05)' : 'none',
                  position: 'relative'
                }}
              >
                {/* Visual colored tag depending on priority */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
                  background: isUrgent ? '#EF4444' : '#10B981',
                  boxShadow: isUrgent ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '15px', color: '#FFF' }}>{m.title}</h4>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '100px',
                    background: isUrgent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: isUrgent ? '#EF4444' : '#10B981',
                    border: isUrgent ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    {isUrgent ? 'Importante' : 'Informativo'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                  {m.body}
                </p>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.35)' }}>
                  Publicado em: <strong>{new Date(m.createdAt).toLocaleString('pt-BR')}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 4. OCORRENCIAS PANEL (Service Tickets)
export function OcorrenciasPanel({
  tickets,
  ticketsLoading,
  createTicket,
  newTicketSubject,
  setNewTicketSubject,
  newTicketBody,
  setNewTicketBody,
  newTicketCategory,
  setNewTicketCategory,
  selectedTicket,
  setSelectedTicket,
  ticketReplyText,
  setTicketReplyText,
  API,
  token,
  fetchTickets
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyLoading, setReplyLoading] = useState(false);

  // Busca as respostas do chamado (usando mailboxMessage body ou simulado por enquanto)
  useEffect(() => {
    if (selectedTicket) {
      // O endpoint /mailbox retorna as mensagens. Em um sistema com sub-mensagens
      // exibiríamos as mensagens da thread. Criamos respostas simuladas baseadas no status
      // para dar a sensação exata de conversa em tempo real
      const mockReplies = [
        { sender: 'morador', content: selectedTicket.body, createdAt: selectedTicket.createdAt }
      ];
      if (selectedTicket.status === 'resolved') {
        mockReplies.push({
          sender: 'admin',
          content: 'Olá! Vimos o seu chamado e nossa equipe de manutenção já resolveu a pendência. Caso o problema persista, favor reabrir o chamado.',
          createdAt: new Date(new Date(selectedTicket.createdAt).getTime() + 4 * 60 * 60 * 1000).toISOString()
        });
      } else if (selectedTicket.status === 'read') {
        mockReplies.push({
          sender: 'admin',
          content: 'Chamado visualizado pela administração. Equipe técnica agendada para vistoria.',
          createdAt: new Date(new Date(selectedTicket.createdAt).getTime() + 1 * 60 * 60 * 1000).toISOString()
        });
      }
      setReplies(mockReplies);
    }
  }, [selectedTicket]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!ticketReplyText.trim() || !selectedTicket) return;
    setReplyLoading(true);
    // Simula envio de resposta na timeline
    setTimeout(() => {
      const newRep = {
        sender: 'morador',
        content: ticketReplyText.trim(),
        createdAt: new Date().toISOString()
      };
      setReplies(prev => [...prev, newRep]);
      setTicketReplyText('');
      setReplyLoading(false);
    }, 800);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'resolved': return { label: 'Resolvido', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'read': return { label: 'Em Andamento', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)' };
      default: return { label: 'Aberto', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1fr' : '1fr', gap: '24px' }}>
      {/* Listagem / Registro */}
      <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare style={{ color: 'var(--primary)' }} /> Ocorrências & Suporte
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              background: showAddForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              color: '#FFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {showAddForm ? 'Ver Chamados' : '+ Nova Ocorrência'}
          </button>
        </div>

        {showAddForm ? (
          <form onSubmit={createTicket} style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.3s ease-out' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Categoria</label>
              <select
                value={newTicketCategory}
                onChange={e => setNewTicketCategory(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 17, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="Manutenção" style={{ background: '#050811' }}>🔧 Manutenção (Luz queimada, portão com defeito)</option>
                <option value="Barulho" style={{ background: '#050811' }}>🔊 Reclamação de Barulho / Perturbação</option>
                <option value="Segurança" style={{ background: '#050811' }}>🛡️ Segurança (Problemas de acesso, câmeras)</option>
                <option value="Sugestão" style={{ background: '#050811' }}>💡 Sugestão ou Balanço financeiro</option>
                <option value="Outros" style={{ background: '#050811' }}>📝 Outros Assuntos</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Assunto Curto</label>
              <input
                type="text"
                placeholder="Ex: Goteira na garagem bloco A"
                value={newTicketSubject}
                onChange={e => setNewTicketSubject(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 17, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Descrição Completa</label>
              <textarea
                placeholder="Descreva detalhadamente o ocorrido..."
                value={newTicketBody}
                onChange={e => setNewTicketBody(e.target.value)}
                rows="4"
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 17, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={ticketsLoading}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)'
              }}
            >
              Registrar Chamado
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ticketsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Carregando chamados...</div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Nenhuma ocorrência registrada para a sua unidade.
              </div>
            ) : (
              tickets.map(t => {
                const badge = getStatusLabel(t.status);
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(isSelected ? null : t)}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFF' }}>{t.subject}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Aberto em: {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '9px', fontWeight: 800, padding: '4px 10px', borderRadius: '100px',
                        background: badge.bg, color: badge.color, border: `1px solid rgba(${badge.color === '#10B981' ? '16, 185, 129' : (badge.color === '#6366F1' ? '99, 102, 241' : '245, 158, 11')}, 0.2)`
                      }}>
                        {badge.label}
                      </span>
                      <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Detalhe Conversa (Timeline Chat) */}
      {selectedTicket && (
        <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px', animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px' }}>CONVERSA DO CHAMADO</div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>{selectedTicket.subject}</h4>
            </div>
            <button onClick={() => setSelectedTicket(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* Feed de Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px', marginBottom: '16px', maxHeight: '280px' }}>
            {replies.map((r, i) => {
              const isAdmin = r.sender === 'admin';
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    background: isAdmin ? 'rgba(22, 30, 56, 0.8)' : 'rgba(99, 102, 241, 0.15)',
                    border: isAdmin ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: isAdmin ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ fontSize: '10px', color: isAdmin ? 'var(--primary)' : 'rgba(255,255,255,0.5)', fontWeight: 800, marginBottom: '4px' }}>
                    {isAdmin ? 'ADMINISTRAÇÃO' : 'VOCÊ'}
                  </div>
                  <p style={{ fontSize: '13px', color: '#FFF', lineHeight: 1.5, wordBreak: 'break-word' }}>{r.content}</p>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: '4px' }}>
                    {new Date(r.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enviar Resposta */}
          {selectedTicket.status !== 'resolved' ? (
            <form onSubmit={sendReply} style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <input
                type="text"
                placeholder="Digite sua resposta..."
                value={ticketReplyText}
                onChange={e => setTicketReplyText(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(5, 8, 17, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#FFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={replyLoading || !ticketReplyText.trim()}
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#FFF',
                  border: 'none',
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                }}
              >
                <Send size={18} />
              </button>
            </form>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '12px', textAlign: 'center', color: '#10B981', fontSize: '12px', fontWeight: 700, marginTop: 'auto' }}>
              Este chamado foi encerrado e resolvido.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 5. DOCUMENTOS PANEL (Document Library)
export function DocumentosPanel() {
  const documents = [
    { title: 'Regimento Interno do Condomínio.pdf', size: '1.2 MB', category: 'Regimento', icon: <FileText size={20} /> },
    { title: 'Ata da Assembleia Geral Ordinária - Maio 2026.pdf', size: '640 KB', category: 'Assembleias', icon: <Folder size={20} /> },
    { title: 'Demonstrativo Financeiro Consolidado - Abril 2026.pdf', size: '4.8 MB', category: 'Financeiro', icon: <FileText size={20} /> },
    { title: 'Manual de Utilização do App Campainha.pdf', size: '920 KB', category: 'Manuais', icon: <HelpCircle size={20} /> }
  ];

  const handleDownload = (docName) => {
    alert(`Iniciando download do arquivo: ${docName}`);
    // Simulação exata de download de PDF
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,JVBERi0xLjQKJdPr6gogMSAwIG9iago8PAovVGl0bGUgKFNhYVMgRG9jdW1lbnQpCi9DcmVhdG9yICh1TW9yYSBJQSkKPj4KZW5kb2JqCnhyZWYKMCAxCjAwMDAwMDAwMDAgNjU1MzUgZiAKdHJhaWxlcgo8PAovU2l6ZSAyCi9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoxMTAKJSVFT0Y=';
    link.download = docName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Folder style={{ color: 'var(--primary)' }} /> Biblioteca de Documentos
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Acesse e baixe arquivos importantes do condomínio como regimentos, manuais, balancetes e atas a qualquer momento.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        {documents.map(d => (
          <div
            key={d.title}
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}
            className="hover-card-bg"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                {d.icon}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF', marginBottom: '4px' }}>{d.title}</div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Tamanho: <strong>{d.size}</strong></span>
                  <span>•</span>
                  <span>Categoria: <strong>{d.category}</strong></span>
                </div>
              </div>
            </div>
            <div>
              <button
                onClick={() => handleDownload(d.title)}
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. VIZINHOS PANEL (Neighbor search & chat using connections)
export function VizinhosPanel({
  connections,
  neighborsList,
  searchNeighborQuery,
  setSearchNeighborQuery,
  searchNeighbors,
  requestConnection,
  updateConnectionStatus,
  activeConnection,
  setActiveConnection,
  connectionMessages,
  fetchConnectionMessages,
  activeConnMsgText,
  setActiveConnMsgText,
  sendNeighborMessage,
  savedUnitId
}) {
  const [pollInterval, setPollInterval] = useState(null);

  // Polling de mensagens se o chat estiver aberto
  useEffect(() => {
    if (activeConnection) {
      fetchConnectionMessages(activeConnection.id);
      const interval = setInterval(() => {
        fetchConnectionMessages(activeConnection.id);
      }, 3000);
      setPollInterval(interval);
      return () => clearInterval(interval);
    }
  }, [activeConnection]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: activeConnection ? '1fr 1fr' : '1fr', gap: '24px' }}>
      {/* Busca e Solicitações */}
      <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>Conversa entre Moradores</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Busque unidades vizinhas por bloco ou número e inicie conversas privadas com segurança.
        </p>

        {/* Busca */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Buscar vizinho (Ex: Bloco A, 102)"
            value={searchNeighborQuery}
            onChange={e => setSearchNeighborQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(5, 8, 17, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#FFF',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button
            onClick={searchNeighbors}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              color: '#FFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Buscar
          </button>
        </div>

        {/* Resultados de Busca */}
        {neighborsList.length > 0 && (
          <div style={{ marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '12px', background: 'rgba(5,8,17,0.3)' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>RESULTADOS DA BUSCA:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {neighborsList.map(n => {
                const isConn = connections.some(c => c.senderUnitId === n.id || c.receiverUnitId === n.id);
                return (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{n.name} {n.block ? `(${n.block})` : ''}</span>
                    <button
                      onClick={() => requestConnection(n.id)}
                      disabled={isConn}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: isConn ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.15)',
                        color: isConn ? 'rgba(255,255,255,0.3)' : 'var(--primary)',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: isConn ? 'default' : 'pointer'
                      }}
                    >
                      {isConn ? 'Vinculado' : 'Conectar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de Conexões Ativas e Pendentes */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px' }}>CONVERSAS ATIVAS</div>
          
          {connections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
              Nenhuma conversa iniciada. Busque um vizinho acima!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {connections.map(c => {
                const myUnitId = savedUnitId || localStorage.getItem('residentUnitId');
                const otherUnit = c.senderUnitId === myUnitId ? c.receiverUnit : c.senderUnit;
                const isPending = c.status === 'pending';
                const isReceiver = c.receiverUnitId === myUnitId;

                return (
                  <div
                    key={c.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#FFF' }}>{otherUnit.name}</div>
                      <div style={{ fontSize: '10px', color: isPending ? '#F59E0B' : '#10B981' }}>
                        {isPending ? 'Pendente de aprovação' : 'Conectado'}
                      </div>
                    </div>

                    <div>
                      {isPending ? (
                        isReceiver ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => updateConnectionStatus(c.id, 'connected')} style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Aceitar</button>
                            <button onClick={() => updateConnectionStatus(c.id, 'blocked')} style={{ background: '#EF4444', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Recusar</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aguardando</span>
                        )
                      ) : (
                        <button
                          onClick={() => setActiveConnection(c)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--primary)',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Conversar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Ativo */}
      {activeConnection && (
        <div style={{ padding: '24px', background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)' }}>CONVERSANDO COM VIZINHO</span>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                {activeConnection.senderUnitId === (savedUnitId || localStorage.getItem('residentUnitId')) ? activeConnection.receiverUnit.name : activeConnection.senderUnit.name}
              </h4>
            </div>
            <button onClick={() => setActiveConnection(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>

          {/* Mensagens do chat */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '6px', maxHeight: '250px', marginBottom: '16px' }}>
            {connectionMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', margin: 'auto' }}>Nenhuma mensagem enviada. Diga olá!</div>
            ) : (
              connectionMessages.map(m => {
                const isMe = m.senderUnitId === (savedUnitId || localStorage.getItem('residentUnitId'));
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: isMe ? 'rgba(99, 102, 241, 0.15)' : 'rgba(22, 30, 56, 0.8)',
                      border: isMe ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding: '10px 14px',
                      maxWidth: '85%'
                    }}
                  >
                    <p style={{ fontSize: '13px', color: '#FFF', margin: 0, wordBreak: 'break-word' }}>{m.body}</p>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: '4px' }}>
                      {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Enviar */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <input
              type="text"
              placeholder="Escreva sua mensagem..."
              value={activeConnMsgText}
              onChange={e => setActiveConnMsgText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendNeighborMessage(); }}
              style={{
                flex: 1,
                background: 'rgba(5, 8, 17, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#FFF',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={sendNeighborMessage}
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFF',
                border: 'none',
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 7. UMORA AI ASSISTANT FLOAT WIDGET (floating glass chat simulator)
export function UmoraAiWidget({
  isUmoraOpen,
  setIsUmoraOpen,
  umoraMessages,
  umoraInput,
  setUmoraInput,
  isUmoraTyping,
  handleUmoraSend
}) {
  return (
    <>
      {/* Floating Sparkly Button */}
      <button
        onClick={() => setIsUmoraOpen(!isUmoraOpen)}
        style={{
          position: 'fixed',
          bottom: '88px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          color: '#FFF',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.5), 0 0 15px rgba(99,102,241,0.2)',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(10deg)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
        }}
      >
        {isUmoraOpen ? <X size={26} /> : <MessageCircle size={26} style={{ animation: 'bounce 2s infinite' }} />}
      </button>

      {/* Expanded Glass Chat Widget */}
      {isUmoraOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '160px',
            right: '24px',
            width: '360px',
            height: '460px',
            borderRadius: '24px',
            background: 'rgba(13, 20, 38, 0.85)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.15)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)',
                border: '1px solid rgba(99,102,241,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8'
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                uMora IA <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Especialista Condominial</span>
            </div>
          </div>

          {/* Chat log */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '300px'
            }}
          >
            {umoraMessages.map((m, i) => {
              const isUm = m.sender === 'umora';
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUm ? 'flex-start' : 'flex-end',
                    background: isUm ? 'rgba(22, 30, 56, 0.7)' : 'rgba(99, 102, 241, 0.15)',
                    border: isUm ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: isUm ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                    padding: '10px 14px',
                    maxWidth: '85%'
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#FFF', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{m.text}</p>
                </div>
              );
            })}

            {isUmoraTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(22, 30, 56, 0.7)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', animation: 'bounce 1.4s infinite' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', animation: 'bounce 1.4s infinite 0.2s' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', animation: 'bounce 1.4s infinite 0.4s' }} />
              </div>
            )}
          </div>

          {/* Quick topics / tags */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 16px 8px', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}>
            {[
              'Como reservar churrasqueira?',
              'Horário de silêncio?',
              'Como abrir o portão?',
              'Ver minhas encomendas'
            ].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setUmoraInput(tag);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-muted)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = '#FFF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              type="text"
              placeholder="Pergunte à uMora..."
              value={umoraInput}
              onChange={e => setUmoraInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleUmoraSend(); }}
              style={{
                flex: 1,
                background: 'rgba(5, 8, 17, 0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '12px 16px',
                color: '#FFF',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleUmoraSend}
              disabled={isUmoraTyping || !umoraInput.trim()}
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: '#FFF',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
