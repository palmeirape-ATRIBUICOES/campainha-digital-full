import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Building2, MapPin, Hash, Copy, Check, MessageCircle } from 'lucide-react';

import { API } from '../config';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };
  return (
    <button onClick={copy} style={{ display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:copied?'#10B981':'#3B82F6',background:copied?'rgba(16,185,129,0.1)':'rgba(59,130,246,0.1)',border:'none',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',fontWeight:700 }}>
      {copied ? <><Check size={12}/>COPIADO!</> : <><Copy size={12}/>COPIAR</>}
    </button>
  );
}

function WaBtn({ code }) {
  const share = () => {
    const msg = `Seu código de acesso à Campainha Digital!\n\n🔑 Código: ${code}\n📱 App: ${window.location.origin}${window.location.pathname}#/auth`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <button onClick={share} style={{ display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#fff',background:'#25D366',border:'none',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',fontWeight:700 }}>
      <MessageCircle size={12}/>WHATSAPP
    </button>
  );
}

export default function UnitManager({ propertyId, adminEmail, onRefresh }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newUnit, setNewUnit] = useState({ name:'', block:'', street:'', number:'' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/units`);
      setUnits(await r.json());
    } catch { setUnits([]); }
    setLoading(false);
  };

  useEffect(() => { if (propertyId) load(); }, [propertyId]);

  const addUnit = async () => {
    if (!newUnit.name.trim()) return;
    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/units`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...newUnit, adminEmail })
      });
      if (r.ok) { setNewUnit({ name:'',block:'',street:'',number:'' }); setShowAdd(false); load(); if(onRefresh) onRefresh(); }
      else { const d = await r.json(); alert(d.error); }
    } catch(e) { alert('Erro ao adicionar unidade.'); }
  };

  const saveEdit = async (unitId) => {
    try {
      const r = await fetch(`${API}/api/properties/${propertyId}/units/${unitId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...editData, adminEmail })
      });
      if (r.ok) { setEditId(null); load(); if(onRefresh) onRefresh(); }
      else { const d = await r.json(); alert(d.error); }
    } catch { alert('Erro ao salvar.'); }
  };

  const deleteUnit = async (unitId) => {
    if (!window.confirm('Excluir esta unidade?')) return;
    try {
      await fetch(`${API}/api/properties/${propertyId}/units/${unitId}?adminEmail=${encodeURIComponent(adminEmail)}`, { method:'DELETE' });
      load(); if(onRefresh) onRefresh();
    } catch {}
  };

  const startEdit = (u) => { setEditId(u.id); setEditData({ name:u.name, block:u.block||'', street:u.street||'', number:u.number||'' }); };

  const inputStyle = { width:'100%', padding:'10px 12px', borderRadius:'10px', border:'1px solid var(--border-subtle)', fontSize:'13px', outline:'none', background:'var(--bg-surface)', color:'var(--text-main)' };
  const labelStyle = { fontSize:'11px', fontWeight:700, color:'var(--text-muted)', marginBottom:'4px', display:'block', letterSpacing:'0.5px' };

  return (
    <div style={{ padding:'20px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h3 style={{ fontSize:'18px', fontWeight:800, margin:0, color:'var(--text-main)' }}>Gestão de Unidades</h3>
          <p style={{ fontSize:'12px', color:'var(--text-muted)', margin:'4px 0 0' }}>{units.length} unidade{units.length !== 1 ? 's' : ''} cadastrada{units.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background:'linear-gradient(135deg,#3B82F6,#2563EB)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'12px', fontWeight:700, fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          <Plus size={16}/> Nova Unidade
        </button>
      </div>

      {/* Formulário Adicionar */}
      {showAdd && (
        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'16px', padding:'20px', marginBottom:'16px', boxShadow:'0 4px 12px rgba(0,0,0,0.04)', color:'var(--text-main)' }}>
          <h4 style={{ fontSize:'14px', fontWeight:700, marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px', color:'var(--text-main)' }}><Plus size={16} color="var(--primary)"/> Cadastrar Nova Unidade</h4>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>NOME DA UNIDADE *</label>
              <input style={inputStyle} placeholder="Ex: Casa 1, Apto 101" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name:e.target.value})} />
            </div>
            <div>
              <label style={labelStyle}>BLOCO</label>
              <input style={inputStyle} placeholder="Ex: Bloco A" value={newUnit.block} onChange={e => setNewUnit({...newUnit, block:e.target.value})} />
            </div>
            <div>
              <label style={labelStyle}>RUA</label>
              <input style={inputStyle} placeholder="Ex: Rua das Flores" value={newUnit.street} onChange={e => setNewUnit({...newUnit, street:e.target.value})} />
            </div>
            <div>
              <label style={labelStyle}>NÚMERO *</label>
              <input style={inputStyle} placeholder="Ex: 42" value={newUnit.number} onChange={e => setNewUnit({...newUnit, number:e.target.value})} />
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
            <button onClick={addUnit} style={{ flex:1, background:'#10B981', color:'#fff', border:'none', padding:'12px', borderRadius:'10px', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>Cadastrar</button>
            <button onClick={() => setShowAdd(false)} style={{ padding:'12px 20px', background:'var(--bg-deep)', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:600, color:'var(--text-muted)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'40px' }}>Carregando...</p> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {units.map(u => (
            <div key={u.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'14px', padding:'16px', transition:'all 0.2s', color:'var(--text-main)' }}>
              {editId === u.id ? (
                /* Modo Edição */
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={labelStyle}>NOME</label>
                      <input style={inputStyle} value={editData.name} onChange={e => setEditData({...editData,name:e.target.value})} />
                    </div>
                    <div><label style={labelStyle}>BLOCO</label><input style={inputStyle} value={editData.block} onChange={e => setEditData({...editData,block:e.target.value})} /></div>
                    <div><label style={labelStyle}>RUA</label><input style={inputStyle} value={editData.street} onChange={e => setEditData({...editData,street:e.target.value})} /></div>
                    <div><label style={labelStyle}>NÚMERO</label><input style={inputStyle} value={editData.number} onChange={e => setEditData({...editData,number:e.target.value})} /></div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => saveEdit(u.id)} style={{ flex:1, background:'#10B981', color:'#fff', border:'none', padding:'10px', borderRadius:'8px', fontWeight:700, fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}><Save size={14}/>Salvar</button>
                    <button onClick={() => setEditId(null)} style={{ padding:'10px 16px', background:'var(--bg-deep)', border:'none', borderRadius:'8px', cursor:'pointer', color:'var(--text-muted)' }}><X size={14}/></button>
                  </div>
                </div>
              ) : (
                /* Modo Visualização */
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                        <Building2 size={16} color="var(--primary)"/>
                        <span style={{ fontWeight:700, fontSize:'15px', color:'var(--text-main)' }}>{u.name}</span>
                      </div>
                      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'8px' }}>
                        {u.block && <span style={{ fontSize:'12px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'4px' }}><Hash size={11}/>Bloco: {u.block}</span>}
                        {u.street && <span style={{ fontSize:'12px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'4px' }}><MapPin size={11}/>Rua: {u.street}</span>}
                        {u.number && <span style={{ fontSize:'12px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'4px' }}>Nº: {u.number}</span>}
                      </div>
                      {(!u.block && !u.street && !u.number) && (
                        <p style={{ fontSize:'11px', color:'#D97706', fontWeight:600, margin:'4px 0' }}>⚠ Sem endereço cadastrado - morador não poderá ser localizado pelo interfone</p>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={() => startEdit(u)} style={{ background:'rgba(59,130,246,0.1)', border:'none', color:'#3B82F6', padding:'8px', borderRadius:'8px', cursor:'pointer' }}><Edit3 size={14}/></button>
                      <button onClick={() => deleteUnit(u.id)} style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444', padding:'8px', borderRadius:'8px', cursor:'pointer' }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  {u.accessCode && (
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'8px', padding:'8px 12px', background:'var(--bg-deep)', borderRadius:'8px', border:'1px solid var(--border-subtle)' }}>
                      <code style={{ fontSize:'14px', fontWeight:800, color:'var(--primary)', letterSpacing:'2px', flex:1 }}>{u.accessCode}</code>
                      <CopyBtn text={u.accessCode}/>
                      <WaBtn code={u.accessCode}/>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {units.length === 0 && !loading && (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
              <Building2 size={40} style={{ opacity:0.2, marginBottom:'12px' }}/>
              <p style={{ fontWeight:600 }}>Nenhuma unidade cadastrada</p>
              <p style={{ fontSize:'13px' }}>Clique em "Nova Unidade" para começar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

