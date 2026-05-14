import React, { useState } from 'react';
import { Pill, Flame, Droplets, ShoppingBag, ChevronRight, Clock } from 'lucide-react';

const SERVICES = [
  { id: 'farmacia',  icon: <Pill size={28}/>,        label: 'Farmácia',   color: '#10B981', bg: '#ECFDF5', desc: 'Medicamentos entregues na sua porta' },
  { id: 'gas',       icon: <Flame size={28}/>,       label: 'Gás',        color: '#F59E0B', bg: '#FFFBEB', desc: 'Botijão de gás com rapidez' },
  { id: 'agua',      icon: <Droplets size={28}/>,    label: 'Água',       color: '#3B82F6', bg: '#EFF6FF', desc: 'Galões de água mineral' },
  { id: 'mercado',   icon: <ShoppingBag size={28}/>, label: 'Mercado',    color: '#8B5CF6', bg: '#F5F3FF', desc: 'Compras do dia a dia' },
];

export default function ServicesPanel() {
  const [active, setActive] = useState(null);

  return (
    <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 2px' }}>
        <h4 style={{ fontWeight: 800, fontSize: '13px', color: '#1E293B', margin: 0 }}>🛒 Serviços & Parceiros</h4>
        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>Em breve</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {SERVICES.map(s => (
          <button key={s.id} onClick={() => setActive(active === s.id ? null : s.id)}
            style={{ padding: '16px 12px', borderRadius: '14px', border: `2px solid ${active === s.id ? s.color : '#E2E8F0'}`,
              background: active === s.id ? s.bg : '#FFF', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>{s.label}</div>
              <div style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Painel de parceiros */}
      {active && (
        <div style={{ marginTop: '12px', background: '#F8FAFC', borderRadius: '14px', padding: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Clock size={32} style={{ color: '#CBD5E1', marginBottom: '8px' }}/>
          <p style={{ fontWeight: 700, fontSize: '13px', color: '#64748B', margin: '0 0 4px' }}>
            Parceiros de {SERVICES.find(s => s.id === active)?.label} chegando em breve!
          </p>
          <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
            Estamos cadastrando fornecedores na sua região.
          </p>
        </div>
      )}
    </div>
  );
}
