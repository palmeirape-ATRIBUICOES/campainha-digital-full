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
    <button onClick={() => setTab(key)} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', background: tab===key ? '#3B82F6' : '#F1F5F9', color: tab===key ? '#fff' : '#64748B', transition:'all 0.2s' }}>
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
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {units.map(u => (
              <div key={u.id} style={{ background:'#FFF', border:'1px solid #E2E8F0', borderRadius:'12px', padding:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <span style={{ fontWeight:700, fontSize:'14px' }}>{u.name}</span>
                    {(u.block || u.street) && <span style={{ fontSize:'11px', color:'#64748B', marginLeft:'8px' }}>{u.block && `Bloco ${u.block}`} {u.street && `Rua ${u.street}`} {u.number && `Nº ${u.number}`}</span>}
                  </div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <code style={{ fontSize:'13px', fontWeight:800, color:'#3B82F6', letterSpacing:'1px' }}>{u.accessCode}</code>
                    <CopyBtn text={u.accessCode || ''}/>
                    <button onClick={() => regenerateCode(u.id)} title="Regenerar código (bloqueia acesso atual)" style={{ background:'rgba(245,158,11,0.1)', border:'none', color:'#F59E0B', padding:'6px', borderRadius:'6px', cursor:'pointer' }}><RefreshCw size={12}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:'11px', color:'#94A3B8', marginTop:'12px', lineHeight:1.5 }}>
            💡 Para bloquear um morador, clique no ícone 🔄 para regenerar o código de acesso. O código antigo será invalidado.
          </p>
        </div>
      )}

      {/* Porteiro */}
      {tab === 'doorman' && (
        <div>
          <p style={{ fontSize:'12px', color:'#64748B', marginBottom:'16px' }}>Configure o e-mail do porteiro. Ele receberá um código de acesso para o painel da portaria.</p>
          <div style={{ background:'#FFF', border:'1px solid #E2E8F0', borderRadius:'14px', padding:'20px' }}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'6px', display:'block' }}>E-MAIL DO PORTEIRO</label>
              <div style={{ display:'flex', gap:'8px' }}>
                <input type="email" placeholder="porteiro@email.com" value={doormanEmail} onChange={e => setDoormanEmail(e.target.value)} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'1px solid #E2E8F0', fontSize:'14px', outline:'none', background:'#F8FAFC' }}/>
                <button onClick={saveDoorman} disabled={saving} style={{ background: saved ? '#10B981' : '#3B82F6', color:'#fff', border:'none', padding:'12px 20px', borderRadius:'10px', fontWeight:700, fontSize:'13px', cursor:'pointer', transition:'all 0.2s' }}>
                  {saved ? '✓ Salvo' : saving ? '...' : 'Salvar'}
                </button>
              </div>
            </div>
            {property?.doormanCode && (
              <div style={{ background:'#F8FAFC', padding:'12px', borderRadius:'10px', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontSize:'11px', color:'#64748B', fontWeight:600 }}>CÓDIGO DO PORTEIRO</span>
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

