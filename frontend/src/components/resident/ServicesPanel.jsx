import React, { useState, useEffect } from 'react';
import { Pill, Flame, Droplets, ShoppingBag, ChevronRight, Phone, Star, MapPin, Settings, Save, Sparkles } from 'lucide-react';
import { API } from '../../config';

const PRESETS = {
  internet: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=600&h=300&fit=crop',
  iptv: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&h=300&fit=crop',
  general: 'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=600&h=300&fit=crop'
};

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
  
  // Settings/Banner state
  const [banner, setBanner] = useState(null);
  const [loadingBanner, setLoadingBanner] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  
  // Form state
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [btnText, setBtnText] = useState('');
  const [imagePreset, setImagePreset] = useState('internet');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Authentication check for admin@campainha.com
  const isAdmin = localStorage.getItem('cd_user_contact') === 'admin@campainha.com' ||
                  localStorage.getItem('cd_admin_email') === 'admin@campainha.com' ||
                  localStorage.getItem('cd_is_super_admin') === 'true';

  const [dynamicPartners, setDynamicPartners] = useState(PARTNERS);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`${API}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.partner_banner) {
            try {
              const parsed = JSON.parse(data.partner_banner);
              setBanner(parsed);
              
              // Populate form state
              setEnabled(parsed.enabled ?? false);
              setTitle(parsed.title || '');
              setDescription(parsed.description || '');
              setLink(parsed.link || '');
              setBtnText(parsed.btnText || '');
              setImagePreset(parsed.imagePreset || 'internet');
              if (parsed.imagePreset === 'custom') {
                setCustomImageUrl(parsed.imageUrl || '');
              }
            } catch (e) {
              console.error('Error parsing partner banner:', e);
            }
          }
          if (data.local_partners) {
            try {
              const parsedList = JSON.parse(data.local_partners);
              if (Array.isArray(parsedList) && parsedList.length > 0) {
                const grouped = { farmacia: [], gas: [], agua: [], mercado: [] };
                parsedList.forEach(p => {
                  const cat = p.category;
                  if (grouped[cat]) {
                    grouped[cat].push(p);
                  }
                });
                setDynamicPartners(grouped);
              }
            } catch (e) {
              console.error('Error parsing local partners:', e);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoadingBanner(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('cd_token');
      const bannerData = {
        enabled,
        title,
        description,
        link,
        btnText,
        imagePreset,
        imageUrl: imagePreset === 'custom' ? customImageUrl : PRESETS[imagePreset]
      };

      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          key: 'partner_banner',
          value: JSON.stringify(bannerData)
        })
      });

      if (res.ok) {
        setBanner(bannerData);
        alert('Configurações do banner salvas com sucesso!');
        setShowConfig(false);
      } else {
        alert('Erro ao salvar configurações do banner.');
      }
    } catch (err) {
      console.error('Connection error:', err);
      alert('Erro de conexão ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B', margin: '0 0 4px' }}>Parceiros da Localidade</h4>
        <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Serviços essenciais direto no seu condomínio.</p>
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <div style={{
          background: '#F8FAFC',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px'
        }}>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={16} />
              ⚙️ Banner de Parcerias (Admin)
            </span>
            <ChevronRight 
              size={16} 
              color="#3B82F6" 
              style={{ transform: showConfig ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} 
            />
          </button>

          {showConfig && (
            <form onSubmit={handleSaveBanner} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                <input 
                  type="checkbox" 
                  checked={enabled} 
                  onChange={e => setEnabled(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Ativar / Exibir Banner para moradores
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>Título do Banner</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Ex: Internet Fibra + IPTV" 
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>Descrição / Subtítulo</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Ex: Ultra velocidade fibra óptica com TV inclusa. Assine já!" 
                  required
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>Link de Ação (WhatsApp ou Site)</label>
                <input 
                  type="url" 
                  value={link} 
                  onChange={e => setLink(e.target.value)} 
                  placeholder="Ex: https://wa.me/5511999999999" 
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>Texto do Botão</label>
                <input 
                  type="text" 
                  value={btnText} 
                  onChange={e => setBtnText(e.target.value)} 
                  placeholder="Ex: Falar com Consultor" 
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>Estilo / Imagem de Fundo</label>
                <select 
                  value={imagePreset} 
                  onChange={e => setImagePreset(e.target.value)} 
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                >
                  <option value="internet">Internet Fibra (Padrão)</option>
                  <option value="iptv">Canais / IPTV (Padrão)</option>
                  <option value="general">Conectividade Geral</option>
                  <option value="custom">URL de Imagem Customizada</option>
                </select>
              </div>

              {imagePreset === 'custom' && (
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>URL da Imagem Customizada</label>
                  <input 
                    type="url" 
                    value={customImageUrl} 
                    onChange={e => setCustomImageUrl(e.target.value)} 
                    placeholder="https://exemplo.com/imagem.jpg" 
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={saving}
                style={{
                  background: '#3B82F6',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)',
                  transition: 'opacity 0.2s',
                  opacity: saving ? 0.7 : 1
                }}
              >
                <Save size={14} />
                {saving ? 'Salvando...' : 'Salvar Banner'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Banner de Parcerias */}
      {banner && banner.enabled && (
        <div style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.45)), url(${banner.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '20px',
          color: '#FFF',
          marginBottom: '20px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          minHeight: '160px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(16, 185, 129, 0.2)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '20px',
            padding: '3px 8px',
          }}>
            <Sparkles size={10} color="#10B981" />
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#10B981', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Recomendado</span>
          </div>

          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.4)', color: '#FFF' }}>
            {banner.title}
          </h3>
          <p style={{ margin: '6px 0 14px', fontSize: '11.5px', opacity: 0.9, lineHeight: '1.4', textShadow: '0 1px 2px rgba(0,0,0,0.4)', color: '#F1F5F9', maxWidth: '85%' }}>
            {banner.description}
          </p>
          
          <button 
            onClick={() => window.open(banner.link, '_blank')}
            style={{
              alignSelf: 'flex-start',
              background: '#10B981',
              color: '#FFF',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <Phone size={12} />
            {banner.btnText || 'Falar no WhatsApp'}
          </button>
        </div>
      )}

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
        {(active ? dynamicPartners[active] : Object.values(dynamicPartners).flat().slice(0, 3)).map((p, i) => (
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
