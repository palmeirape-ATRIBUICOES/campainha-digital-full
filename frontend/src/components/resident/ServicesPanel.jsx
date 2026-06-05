import React, { useState, useEffect } from 'react';
import { Pill, Flame, Droplets, ShoppingBag, ChevronRight, Phone, Star, MapPin, Settings, Save, Sparkles, MessageCircle, ExternalLink } from 'lucide-react';
import { API } from '../../config';

const PRESETS = {
  internet: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=600&h=300&fit=crop',
  iptv: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&h=300&fit=crop',
  general: 'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=600&h=300&fit=crop'
};
export default function ServicesPanel() {
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

  // Authentication check for admin
  const isAdmin = localStorage.getItem('cd_user_contact') === 'admin@campainha.com' ||
                  localStorage.getItem('cd_admin_email') === 'admin@campainha.com' ||
                  localStorage.getItem('cd_is_super_admin') === 'true';

  const [dynamicPartners, setDynamicPartners] = useState([]);

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
              if (Array.isArray(parsedList)) {
                setDynamicPartners(parsedList);
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

      {/* Nano Banners e Partner Cards substituídos por anúncios customizados */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {dynamicPartners.map((p) => {
          const isVideo = p.category === 'video';
          const isWhatsApp = (p.tag && p.tag.toLowerCase().includes('whatsapp')) || 
                             (p.tel && (p.tel.includes('wa.me') || p.tel.includes('api.whatsapp.com') || p.tel.includes('whatsapp')));
          const tagText = p.tag || (isWhatsApp ? 'WhatsApp' : '');
          
          return (
            <div key={p.id} style={{ 
              background: '#FFF', borderRadius: '16px', padding: '16px', 
              border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', display: 'flex', background: '#F8FAFC' }}>
                {isVideo ? (
                  <video 
                    src={p.img} 
                    controls 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    style={{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '300px', objectFit: 'contain' }} 
                  />
                ) : (
                  <img 
                    src={p.img} 
                    alt={p.name} 
                    style={{ width: '100%', borderRadius: '12px', objectFit: 'contain', maxHeight: '300px' }} 
                  />
                )}

                {tagText && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isWhatsApp ? '#25D366' : '#3B82F6',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    zIndex: 2,
                    color: '#FFF'
                  }}>
                    {isWhatsApp ? (
                      <MessageCircle size={11} color="#FFF" fill="#FFF" />
                    ) : p.tel?.trim().startsWith('http') ? (
                      <ExternalLink size={11} color="#FFF" />
                    ) : (
                      <Phone size={11} color="#FFF" />
                    )}
                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {tagText}
                    </span>
                  </div>
                )}
              </div>
              
              {p.name && (
                <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>
                  {p.name}
                </h5>
              )}
              
              {p.tel && (() => {
                const cleanTel = p.tel.trim();
                const isLink = cleanTel.startsWith('http://') || cleanTel.startsWith('https://');
                
                let btnBg = '#3B82F6';
                let btnColor = '#FFF';
                let btnBorder = 'none';
                let btnShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                let btnIcon = <ExternalLink size={14} />;
                let btnText = p.tag || 'SAIBA MAIS';

                if (isWhatsApp) {
                  btnBg = '#25D366';
                  btnShadow = '0 4px 12px rgba(37, 211, 102, 0.2)';
                  btnIcon = <MessageCircle size={14} color="#FFF" fill="#FFF" />;
                  btnText = p.tag || 'CONVERSAR NO WHATSAPP';
                } else if (!isLink) {
                  btnBg = '#1E293B';
                  btnShadow = '0 4px 12px rgba(30, 41, 59, 0.15)';
                  btnIcon = <Phone size={14} />;
                  btnText = p.tag || 'LIGAR AGORA';
                }

                return (
                  <button 
                    onClick={() => {
                      if (isLink) {
                        window.open(cleanTel, '_blank');
                      } else {
                        window.open(`tel:${cleanTel}`);
                      }
                    }} 
                    style={{ 
                      width: '100%', 
                      background: btnBg, 
                      border: btnBorder,
                      boxShadow: btnShadow,
                      borderRadius: '12px', 
                      padding: '12px', 
                      fontSize: '13px', 
                      fontWeight: 800,
                      color: btnColor, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {btnIcon}
                    {btnText}
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}


