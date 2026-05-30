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

  // Estados de Destinatários Alvo
  const [targetType, setTargetType] = useState('all'); // 'all' | 'blocks' | 'unit' | 'resident'
  const [units, setUnits] = useState([]);
  const [uniqueBlocks, setUniqueBlocks] = useState([]);
  const [selectedBlocks, setSelectedBlocks] = useState({}); // { 'Bloco A': true, 'Bloco B': false }
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');

  // Estados de Anexo de Mídia (Foto/Vídeo)
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaName, setMediaName] = useState('');

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
    // Carregar unidades e moradores do condomínio para os seletores
    if (propertyId === 'demo-vila-id') {
      setUniqueBlocks(['BLOCO 1', 'BLOCO 2']);
      setUnits([
        { id: 'demo-u1', name: '1001', block: 'BLOCO 1', inviteCode: 'ABC', residents: [{ id: 'demo-res1', name: 'Carlos' }] },
        { id: 'demo-u2', name: '102', block: 'BLOCO 1', inviteCode: 'DEF', residents: [{ id: 'demo-res2', name: 'Ana' }] },
        { id: 'demo-u3', name: '201', block: 'BLOCO 2', inviteCode: 'GHI', residents: [{ id: 'demo-res3', name: 'Mariana' }] }
      ]);
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
      
      const fetchUnits = async () => {
        try {
          const res = await fetch(`${API}/api/properties/${propertyId}/units`);
          if (res.ok) {
            const data = await res.json();
            setUnits(data);
            
            // Extrair blocos únicos, com parser inteligente do name se o campo block estiver vazio
            const bList = [...new Set(data.map(u => {
              if (u.block) return u.block.trim().toUpperCase();
              // Regex inteligente: Extrai B1, B2, Bloco 1, Bloco A do nome do apartamento (ex: B1-101)
              const match = (u.name || '').match(/^(B\d+)/i) || (u.name || '').match(/^(Bloco\s*\w+)/i);
              return match ? match[1].toUpperCase() : 'B1';
            }).filter(Boolean))];
            setUniqueBlocks(bList);
          }
        } catch (err) {
          console.error('Erro ao carregar unidades:', err);
        }
      };
      fetchUnits();
    }
  }, [propertyId]);

  // Converter foto/vídeo para Base64 para envio seguro por JSON
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUrl(reader.result);
      setMediaName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearMedia = () => {
    setMediaUrl('');
    setMediaName('');
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este comunicado para todos os moradores?')) return;
    
    if (propertyId === 'demo-vila-id') {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      return;
    }

    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/broadcast/${messageId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        alert('Erro ao excluir comunicado do servidor.');
      }
    } catch {
      alert('Erro ao conectar ao servidor.');
    }
  };

  const sendMessage = async () => {
    if (!body.trim()) return;
    setSending(true);

    const blocksString = targetType === 'blocks'
      ? Object.keys(selectedBlocks).filter(k => selectedBlocks[k]).join(',')
      : null;

    const payload = {
      adminEmail,
      title: title || 'Aviso do Condomínio',
      body,
      priority,
      targetType,
      targetBlocks: blocksString,
      targetUnitId: (targetType === 'unit' || targetType === 'resident') ? selectedUnitId : null,
      targetResidentId: targetType === 'resident' ? selectedResidentId : null,
      mediaUrl: mediaUrl || null
    };

    if (propertyId === 'demo-vila-id') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.4;
        audio.play().catch(() => {});
      } catch {}

      const newMsg = {
        id: 'demo-bcast-' + Date.now(),
        title: payload.title,
        body: payload.body,
        priority: payload.priority,
        targetType: payload.targetType,
        targetBlocks: payload.targetBlocks,
        targetUnitId: payload.targetUnitId,
        targetResidentId: payload.targetResidentId,
        mediaUrl: payload.mediaUrl,
        createdAt: new Date(),
        readBy: ['demo-r-b1-101']
      };
      setMessages(prev => [newMsg, ...prev]);

      const event = new CustomEvent('demo-broadcast-sent', { detail: newMsg });
      window.dispatchEvent(event);

      setTitle(''); setBody(''); setPriority('normal');
      setTargetType('all'); setSelectedBlocks({}); setSelectedUnitId(''); setSelectedResidentId('');
      setMediaUrl(''); setMediaName('');
      setSent(true); setTimeout(() => setSent(false), 3000);
      setSending(false);
      return;
    }

    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/broadcast`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        setTitle(''); setBody(''); setPriority('normal');
        setTargetType('all'); setSelectedBlocks({}); setSelectedUnitId(''); setSelectedResidentId('');
        setMediaUrl(''); setMediaName('');
        setSent(true); setTimeout(() => setSent(false), 3000);
        loadMessages();
      } else { 
        const d = await r.json(); 
        alert(d.error); 
      }
    } catch { 
      alert('Erro ao enviar mensagem.'); 
    }
    setSending(false);
  };

  const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid #E2E8F0', fontSize:'14px', outline:'none', background:'#F8FAFC', fontFamily:'inherit' };

  return (
    <div style={{ padding:'20px 0' }}>
      <h3 style={{ fontSize:'18px', fontWeight:800, marginBottom:'4px' }}>📢 Comunicados</h3>
      <p style={{ fontSize:'12px', color:'#64748B', marginBottom:'20px' }}>Envie mensagens gerais, por blocos ou para um morador específico com fotos e vídeos.</p>

      {/* Composer */}
      <div style={{ background:'#FFF', border:'1px solid #E2E8F0', borderRadius:'16px', padding:'20px', marginBottom:'24px', boxShadow:'0 4px 12px rgba(0,0,0,0.03)' }}>
        
        {/* Destinatários */}
        <div style={{ marginBottom:'20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'8px', display:'block', letterSpacing:'0.5px' }}>ENVIAR PARA</label>
          <div style={{ display:'flex', flexWrap: 'wrap', gap:'12px', marginBottom:'16px' }}>
            {[
              { value: 'all', label: '👥 Todos' },
              { value: 'blocks', label: '🏢 Por Blocos' },
              { value: 'unit', label: '🚪 Apartamento' },
              { value: 'resident', label: '👤 Morador' }
            ].map(opt => (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px',
                border: targetType === opt.value ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                background: targetType === opt.value ? 'rgba(59,130,246,0.05)' : '#FFF',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: targetType === opt.value ? '#3B82F6' : '#64748B',
                transition: 'all 0.2s'
              }}>
                <input type="radio" name="targetType" value={opt.value} checked={targetType === opt.value} onChange={() => setTargetType(opt.value)} style={{ display:'none' }} />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Seletor de Blocos */}
          {targetType === 'blocks' && (
            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize:'12px', fontWeight:700, color:'#475569', display:'block', marginBottom:'8px' }}>Selecione os blocos desejados:</span>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'16px' }}>
                {uniqueBlocks.map(b => (
                  <label key={b} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', fontWeight:600, color:'#1E293B', cursor:'pointer' }}>
                    <input type="checkbox" checked={!!selectedBlocks[b]} onChange={(e) => setSelectedBlocks(prev => ({ ...prev, [b]: e.target.checked }))} style={{ width:'16px', height:'16px', accentColor:'#3B82F6' }} />
                    {b}
                  </label>
                ))}
                {uniqueBlocks.length === 0 && <span style={{ fontSize:'12px', color:'#94A3B8' }}>Nenhum bloco cadastrado nas unidades.</span>}
              </div>
            </div>
          )}

          {/* Seletor de Apartamento */}
          {targetType === 'unit' && (
            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize:'12px', fontWeight:700, color:'#475569', display:'block', marginBottom:'8px' }}>Selecione o Apartamento:</span>
              <select value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} style={inputStyle}>
                <option value="">-- Selecione uma Unidade --</option>
                {units.map(u => {
                  const parsedBlock = u.block ? u.block.toUpperCase() : ((u.name || '').match(/^(B\d+)/i)?.[1]?.toUpperCase() || 'B1');
                  return (
                    <option key={u.id} value={u.id}>
                      {parsedBlock} - Apt {u.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Seletor de Morador */}
          {targetType === 'resident' && (
            <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display:'flex', flexDirection:'column', gap:'12px' }}>
              <div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#475569', display:'block', marginBottom:'8px' }}>Selecione o Apartamento:</span>
                <select value={selectedUnitId} onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  setSelectedResidentId('');
                }} style={inputStyle}>
                  <option value="">-- Escolha o Apartamento --</option>
                  {units.map(u => {
                    const parsedBlock = u.block ? u.block.toUpperCase() : ((u.name || '').match(/^(B\d+)/i)?.[1]?.toUpperCase() || 'B1');
                    return (
                      <option key={u.id} value={u.id}>
                        {parsedBlock} - Apt {u.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedUnitId && (
                <div>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#475569', display:'block', marginBottom:'8px' }}>Selecione o Morador:</span>
                  <select value={selectedResidentId} onChange={(e) => setSelectedResidentId(e.target.value)} style={inputStyle}>
                    <option value="">-- Escolha o Morador --</option>
                    {(units.find(u => u.id === selectedUnitId)?.residents || []).map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email || r.phone || 'Sem contato'})
                      </option>
                    ))}
                    {(units.find(u => u.id === selectedUnitId)?.residents || []).length === 0 && (
                      <option disabled>Nenhum morador cadastrado nesta unidade</option>
                    )}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>TÍTULO</label>
          <input style={inputStyle} placeholder="Ex: Aviso importante sobre manutenção" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>MENSAGEM *</label>
          <textarea style={{ ...inputStyle, minHeight:'100px', resize:'vertical' }} placeholder="Digite sua mensagem..." value={body} onChange={e => setBody(e.target.value)} />
        </div>

        {/* Upload de Mídia (Foto ou Vídeo) */}
        <div style={{ marginBottom:'20px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'6px', display:'block', letterSpacing:'0.5px' }}>ANEXAR IMAGEM OU VÍDEO (OPCIONAL)</label>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} id="media-upload-input" style={{ display:'none' }} />
            <label htmlFor="media-upload-input" style={{
              padding: '10px 16px', borderRadius: '10px', border: '1px dashed #3B82F6', background: 'rgba(59,130,246,0.02)',
              color: '#3B82F6', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
            }}>
              <span>📁</span> Escolher Foto ou Vídeo
            </label>
            {mediaName && (
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {mediaName}
                <button type="button" onClick={clearMedia} style={{ background:'none', border:'none', color:'#EF4444', fontWeight:700, cursor:'pointer', fontSize:'13px' }}>✕</button>
              </span>
            )}
          </div>

          {mediaUrl && (
            <div style={{ marginTop: '12px', padding: '10px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'inline-block' }}>
              {mediaUrl.startsWith('data:video/') ? (
                <video src={mediaUrl} controls style={{ maxHeight: '150px', maxWidth: '300px', borderRadius: '8px' }} />
              ) : (
                <img src={mediaUrl} alt="Preview do anexo" style={{ maxHeight: '150px', maxWidth: '300px', borderRadius: '8px', objectFit: 'contain' }} />
              )}
            </div>
          )}
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
          {sent ? <><CheckCheck size={18}/> Enviado com sucesso!</> : sending ? 'Enviando...' : <><Send size={18}/> Enviar Comunicado</>}
        </button>
      </div>

      {/* Histórico */}
      <h4 style={{ fontSize:'14px', fontWeight:700, marginBottom:'12px', color:'#64748B', display:'flex', alignItems:'center', gap:'8px' }}>
        <Clock size={14}/> Comunicados Recentes ({messages.length})
      </h4>
      {loading ? <p style={{ textAlign:'center', color:'#64748B', padding:'20px' }}>Carregando...</p> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {messages.map(m => {
            let targetLabel = 'Público Geral';
            if (m.targetType === 'blocks') targetLabel = `Bloco(s): ${m.targetBlocks}`;
            else if (m.targetType === 'unit') {
              const uObj = units.find(u => u.id === m.targetUnitId);
              const blockName = uObj ? (uObj.block ? uObj.block.toUpperCase() : ((uObj.name || '').match(/^(B\d+)/i)?.[1]?.toUpperCase() || 'B1')) : '';
              targetLabel = uObj ? `${blockName} - Apt ${uObj.name}` : 'Apt Específico';
            } else if (m.targetType === 'resident') {
              const uObj = units.find(u => u.id === m.targetUnitId);
              const rObj = uObj?.residents?.find(r => r.id === m.targetResidentId);
              const blockName = uObj ? (uObj.block ? uObj.block.toUpperCase() : ((uObj.name || '').match(/^(B\d+)/i)?.[1]?.toUpperCase() || 'B1')) : '';
              targetLabel = rObj ? `Morador: ${rObj.name} (${blockName} - Apt ${uObj.name})` : 'Morador Específico';
            }

            return (
              <div key={m.id} style={{ background:'#FFF', border:'1px solid #E2E8F0', borderRadius:'14px', padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <span style={{ fontWeight:700, fontSize:'14px', display:'flex', alignItems:'center', gap:'6px' }}>
                    {m.priority === 'urgent' && <AlertTriangle size={14} color="#EF4444"/>}
                    {m.title}
                  </span>
                  <span style={{ fontSize:'11px', color:'#64748B' }}>{fmt(m.createdAt)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span style={{ fontSize:'10px', background:'#F1F5F9', color:'#475569', padding:'2px 8px', borderRadius:'100px', fontWeight:700 }}>
                    🎯 Alvo: {targetLabel}
                  </span>
                  <button onClick={() => deleteMessage(m.id)} style={{ background:'none', border:'none', color:'#EF4444', fontSize:'11px', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' }}>
                    🗑️ Excluir
                  </button>
                </div>
                <p style={{ fontSize:'13px', color:'#475569', margin:0, lineHeight:1.6 }}>{m.body}</p>
                
                {m.mediaUrl && (
                  <div style={{ marginTop:'10px' }}>
                    {m.mediaUrl.startsWith('data:video/') ? (
                      <video src={m.mediaUrl} controls style={{ maxHeight:'150px', maxWidth:'100%', borderRadius:'8px', border:'1px solid #E2E8F0' }} />
                    ) : (
                      <img src={m.mediaUrl} alt="Anexo" style={{ maxHeight:'150px', maxWidth:'100%', borderRadius:'8px', border:'1px solid #E2E8F0', objectFit:'contain' }} />
                    )}
                  </div>
                )}

                {m.readBy && m.readBy.length > 0 && (
                  <div style={{ marginTop:'8px', fontSize:'11px', color:'#10B981', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Users size={11}/> Lido por {m.readBy.length} morador{m.readBy.length !== 1 ? 'es' : ''}
                  </div>
                )}
              </div>
            );
          })}
          {messages.length === 0 && <p style={{ textAlign:'center', color:'#94A3B8', padding:'24px', fontSize:'13px' }}>Nenhum comunicado enviado ainda.</p>}
        </div>
      )}
    </div>
  );
}
