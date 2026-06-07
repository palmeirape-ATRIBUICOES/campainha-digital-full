import React, { useState, useEffect } from 'react';
import { Users, UserX, Shield, ShieldOff, Plus, Trash2, Mail, Key, Copy, Check, RefreshCw } from 'lucide-react';

import { API } from '../config';

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 2000); }).catch(() => {}); };
  return <button onClick={copy} style={{ fontSize:'11px', color: c?'#10B981':'#3B82F6', background: c?'rgba(16,185,129,0.1)':'rgba(59,130,246,0.1)', border:'none', padding:'4px 8px', borderRadius:'6px', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:'3px' }}>{c ? <><Check size={10}/>OK</> : <><Copy size={10}/>Copiar</>}</button>;
}

export default function ResidentManager({ propertyId, property, adminEmail, onRefresh }) {
  const [tab, setTab] = useState('residents'); // residents | doorman
  const [doormanEmail, setDoormanEmail] = useState(property?.doormanEmail || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [newResidentNames, setNewResidentNames] = useState({});

  const handleAddResident = async (unitId) => {
    const name = newResidentNames[unitId] || '';
    if (!name.trim()) return;

    const u = units.find(unit => unit.id === unitId);
    if (u && (u.residents || []).length >= 5) {
      alert('Limite máximo de 5 moradores atingido para esta unidade.');
      return;
    }

    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/units/${unitId}/residents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (res.ok) {
        setNewResidentNames(prev => ({ ...prev, [unitId]: '' }));
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao adicionar morador.');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleDeleteResident = async (unitId, residentId) => {
    if (!window.confirm('Remover este morador? O acesso dele será bloqueado permanentemente.')) return;
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/units/${unitId}/residents/${residentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        alert('Erro ao remover morador.');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  };

  // Residents are derived from property units
  const units = property?.units || [];

  const saveDoorman = async () => {
    setSaving(true);
    try {
      // Update property doormanEmail via existing endpoint would need a PATCH
      // For now we use a dedicated endpoint
      const r = await fetch(`${API}/api/properties/${propertyId}/doorman`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, doormanEmail: doormanEmail.trim() })
      });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); if (onRefresh) onRefresh(); }
      else { const d = await r.json(); alert(d.error || 'Erro'); }
    } catch { alert('Erro ao salvar porteiro.'); }
    setSaving(false);
  };

  const removeDoorman = async () => {
    if (!window.confirm('Remover o porteiro atual?')) return;
    setDoormanEmail('');
    try {
      await fetch(`${API}/api/properties/${propertyId}/doorman`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, doormanEmail: '' })
      });
      if (onRefresh) onRefresh();
    } catch {}
  };

  const regenerateCode = async (unitId) => {
    if (!window.confirm('Gerar novo código? O código atual será invalidado.')) return;
    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/units/${unitId}/regenerate-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail })
      });
      if (r.ok) { if (onRefresh) onRefresh(); }
    } catch {}
  };

  const tabBtn = (key, label, icon) => (
    <button onClick={() => setTab(key)} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', background: tab===key ? '#3B82F6' : 'var(--bg-deep)', color: tab===key ? '#fff' : 'var(--text-muted)', transition:'all 0.2s' }}>
      {icon} {label}
    </button>
  );

  return (
    <div style={{ padding:'20px 0' }}>
      <h3 style={{ fontSize:'18px', fontWeight:800, marginBottom:'16px' }}>👥 Pessoas</h3>

      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {tabBtn('residents', 'Moradores', <Users size={15}/>)}
        {tabBtn('doorman', 'Porteiro', <Shield size={15}/>)}
      </div>

      {/* Moradores */}
      {tab === 'residents' && (
        <div>
          <p style={{ fontSize:'12px', color:'#64748B', marginBottom:'16px' }}>Cada unidade tem um código de acesso. Compartilhe com o morador para ele acessar a campainha.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {units.map(u => {
              const residentsList = u.residents || [];
              return (
                <div key={u.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'16px', padding:'20px', boxShadow:'0 4px 12px rgba(0,0,0,0.01)' }}>
                  {/* Cabeçalho da Unidade */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border-subtle)', paddingBottom:'12px', marginBottom:'14px' }}>
                    <div>
                      <span style={{ fontWeight:800, fontSize:'16px', color:'var(--text-main)' }}>{u.name}</span>
                      {(u.block || u.street) && (
                        <span style={{ fontSize:'12px', color:'var(--text-muted)', marginLeft:'8px', background:'var(--bg-deep)', padding:'3px 8px', borderRadius:'6px', fontWeight:600 }}>
                          {u.block && `Bloco ${u.block}`} {u.street && `Rua ${u.street}`} {u.number && `Nº ${u.number}`}
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:600 }}>Código Geral da Unidade:</span>
                      <code style={{ fontSize:'13px', fontWeight:800, color:'var(--primary)', letterSpacing:'1px', background:'rgba(59,130,246,0.08)', padding:'3px 8px', borderRadius:'6px' }}>{u.accessCode}</code>
                      <CopyBtn text={u.accessCode || ''}/>
                    </div>
                  </div>

                  {/* Lista de Moradores da Unidade */}
                  <div style={{ marginBottom:'16px' }}>
                    <span style={{ fontSize:'11px', fontWeight:800, color:'var(--text-muted)', display:'block', marginBottom:'8px', letterSpacing:'0.5px' }}>👥 MORADORES CADASTRADOS</span>
                    {residentsList.length === 0 ? (
                      <p style={{ fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic', padding:'8px 0' }}>Nenhum morador individual cadastrado nesta unidade. Use o formulário abaixo para adicionar.</p>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                        {residentsList.map(res => (
                          <div key={res.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-deep)', padding:'10px 14px', borderRadius:'10px', border:'1px solid var(--border-subtle)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                              {res.photo ? (
                                <img src={res.photo} alt={res.name} style={{ width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover', border:'1.5px solid #3B82F6', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:'var(--text-muted)', border:'1px solid var(--border-subtle)', flexShrink: 0 }}>
                                  {res.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                                <span style={{ fontSize:'13px', fontWeight:700, color:'var(--text-main)' }}>{res.name}</span>
                                <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{res.email || 'Cadastrado via Código Único'}</span>
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                                <span style={{ fontSize:'9px', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>Código Único do Morador</span>
                                <code style={{ fontSize:'12px', fontWeight:800, color:'#10B981', background:'rgba(16,185,129,0.08)', padding:'2px 6px', borderRadius:'4px', letterSpacing:'1px' }}>{res.clientCode || '---'}</code>
                              </div>
                              <CopyBtn text={res.clientCode || ''}/>
                              <button
                                onClick={() => handleDeleteResident(u.id, res.id)}
                                title="Remover Morador"
                                style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444', padding:'6px', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                              >
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Formulário para Adicionar Novo Morador */}
                  {residentsList.length >= 5 ? (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.1)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#EF4444',
                      fontSize: '12px',
                      fontWeight: 700,
                      textAlign: 'center'
                    }}>
                      ⚠️ Limite máximo de 5 moradores por unidade atingido.
                    </div>
                  ) : (
                    <div style={{ background:'var(--bg-deep)', padding:'12px 16px', borderRadius:'12px', border:'1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize:'11px', fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:'8px' }}>➕ CADASTRAR NOVO MORADOR NESTA UNIDADE</span>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input
                          type="text"
                          placeholder="Nome do morador (ex: Maria Mãe)"
                          className="input-glass"
                          value={newResidentNames[u.id] || ''}
                          onChange={e => setNewResidentNames(prev => ({ ...prev, [u.id]: e.target.value }))}
                          style={{ flex:1, padding:'8px 12px', fontSize:'13px', borderRadius:'8px' }}
                        />
                        <button
                          onClick={() => handleAddResident(u.id)}
                          className="btn-primary"
                          style={{ padding:'8px 16px', fontSize:'13px', borderRadius:'8px', fontWeight:700 }}
                        >
                          Cadastrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize:'11px', color:'#94A3B8', marginTop:'12px', lineHeight:1.5 }}>
            💡 Para bloquear um morador, clique no ícone 🔄 para regenerar o código de acesso. O código antigo será invalidado.
          </p>
        </div>
      )}

      {/* Porteiro */}
      {tab === 'doorman' && (
        <div>
          <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'16px' }}>Configure o e-mail do porteiro. Ele receberá um código de acesso para o painel da portaria.</p>
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'14px', padding:'20px', color:'var(--text-main)' }}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text-muted)', marginBottom:'6px', display:'block' }}>E-MAIL DO PORTEIRO</label>
              <div style={{ display:'flex', gap:'8px' }}>
                <input type="email" placeholder="porteiro@email.com" value={doormanEmail} onChange={e => setDoormanEmail(e.target.value)} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'1px solid var(--border-subtle)', fontSize:'14px', outline:'none', background:'var(--bg-deep)', color:'var(--text-main)' }}/>
                <button onClick={saveDoorman} disabled={saving} style={{ background: saved ? '#10B981' : '#3B82F6', color:'#fff', border:'none', padding:'12px 20px', borderRadius:'10px', fontWeight:700, fontSize:'13px', cursor:'pointer', transition:'all 0.2s' }}>
                  {saved ? '✓ Salvo' : saving ? '...' : 'Salvar'}
                </button>
              </div>
            </div>
            {property?.doormanCode && (
              <div style={{ background:'var(--bg-deep)', padding:'12px', borderRadius:'10px', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:600 }}>CÓDIGO DO PORTEIRO</span>
                  <div style={{ fontSize:'18px', fontWeight:900, color:'#3B82F6', letterSpacing:'3px', fontFamily:'monospace' }}>{property.doormanCode}</div>
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <CopyBtn text={property.doormanCode}/>
                  {property.doormanEmail && <button onClick={removeDoorman} style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444', padding:'8px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700 }}><UserX size={12}/>Remover</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

