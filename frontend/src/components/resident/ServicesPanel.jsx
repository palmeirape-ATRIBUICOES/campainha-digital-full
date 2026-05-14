import React, { useState } from 'react';
import { Pill, Flame, Droplets, ShoppingBag, ChevronRight, Phone, Star, MapPin } from 'lucide-react';

const PARTNERS = {
  farmacia: [
    { name: 'Farmácia Preço Popular', rating: 4.8, dist: '0.8km', tel: '(11) 98888-7777', img: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=100&h=100&fit=crop' },
    { name: 'Drogaria São Paulo', rating: 4.9, dist: '1.2km', tel: '(11) 97777-6666', img: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=100&h=100&fit=crop' }
  ],
  gas: [
    { name: 'Ultragaz Entrega Rápida', rating: 4.7, dist: '2.5km', tel: '(11) 96666-5555', img: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=100&h=100&fit=crop' }
  ],
  agua: [
    { name: 'Fonte Viva Mineral', rating: 4.9, dist: '1.5km', tel: '(11) 95555-4444', img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf3d?w=100&h=100&fit=crop' }
  ],
  mercado: [
    { name: 'Mini Market Bairro', rating: 4.5, dist: '0.5km', tel: '(11) 94444-3333', img: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop' }
  ]
};

const SERVICES = [
  { id: 'farmacia',  icon: <Pill size={24}/>,        label: 'Farmácia',   color: '#10B981', bg: '#ECFDF5' },
  { id: 'gas',       icon: <Flame size={24}/>,       label: 'Gás / Fogo', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'agua',      icon: <Droplets size={24}/>,    label: 'Água',       color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'mercado',   icon: <ShoppingBag size={24}/>, label: 'Mercado',    color: '#8B5CF6', bg: '#F5F3FF' },
];

export default function ServicesPanel() {
  const [active, setActive] = useState(null);

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B', margin: '0 0 4px' }}>Parceiros da Localidade</h4>
        <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Serviços essenciais direto no seu condomínio.</p>
      </div>

      {/* Nano Banners */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
        {SERVICES.map(s => (
          <button key={s.id} onClick={() => setActive(active === s.id ? null : s.id)}
            style={{ 
              flexShrink: 0, padding: '12px 20px', borderRadius: '16px', 
              border: `2px solid ${active === s.id ? s.color : 'transparent'}`,
              background: active === s.id ? s.bg : '#F1F5F9', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
            }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B', whiteSpace: 'nowrap' }}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Partner Cards */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(active ? PARTNERS[active] : Object.values(PARTNERS).flat().slice(0, 3)).map((p, i) => (
          <div key={i} className="fade-in" style={{ 
            background: '#FFF', borderRadius: '16px', padding: '12px', 
            border: '1px solid #E2E8F0', display: 'flex', gap: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <img src={p.img} alt={p.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'crop' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{p.name}</h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: '#F59E0B', fontWeight: 800 }}>
                  <Star size={10} fill="#F59E0B" /> {p.rating}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#64748B' }}>
                  <MapPin size={10} /> {p.dist}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#10B981', fontWeight: 700 }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10B981' }} /> Aberto
                </div>
              </div>
              <button onClick={() => window.open(`tel:${p.tel}`)} style={{ 
                marginTop: '8px', width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: '8px', padding: '6px', fontSize: '11px', fontWeight: 700,
                color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <Phone size={12} /> LIGAR AGORA
              </button>
            </div>
          </div>
        ))}
      </div>

      {!active && (
        <button style={{ 
          marginTop: '12px', width: '100%', background: 'none', border: '1px dashed #CBD5E1',
          borderRadius: '12px', padding: '12px', fontSize: '11px', color: '#94A3B8',
          fontWeight: 600, cursor: 'default'
        }}>
          Novos parceiros em breve...
        </button>
      )}
    </div>
  );
}

