import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, Building2, Phone, Search, KeyRound, CheckCircle2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PorteiroDashboard() {
  const [property, setProperty] = useState(null);
  const [search, setSearch] = useState('');
  const [authorizedEntry, setAuthorizedEntry] = useState(null); // { unitName, timestamp }
  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    const propertyId = localStorage.getItem('cd_doorman_propertyId');
    if (!propertyId) {
      navigate('/portaria-login');
      return;
    }

    // Fetch property info
    const fetchProp = async () => {
      try {
        const res = await fetch(`${API}/api/properties/${propertyId}`);
        const data = await res.json();
        setProperty(data);
      } catch (err) {
        console.error('Failed to fetch property details', err);
      }
    };
    fetchProp();

    // Setup Socket
    const s = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = s;
    
    s.emit('register_doorman', { propertyId });

    s.on('entry_authorized', ({ unitId, visitorId, timestamp }) => {
      // Find unit name
      let uName = 'Morador';
      setProperty(prev => {
        if (prev) {
          const unit = prev.units.find(u => u.id === unitId);
          if (unit) uName = unit.name;
        }
        return prev;
      });

      setAuthorizedEntry({ unitName: uName, timestamp });
      
      // Play alert sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      } catch {}

      // Vibrate if on tablet
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      // Hide after 15 seconds (longer visibility)
      setTimeout(() => {
        setAuthorizedEntry(null);
      }, 15000);
    });

    return () => {
      s.disconnect();
    };
  }, [navigate]);

  if (!property) return <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Carregando dados da portaria...</div>;

  const filteredUnits = property.units?.filter(u => u.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)' }}>
      
      {/* HEADER */}
      <header className="glass-panel" style={{ padding: '20px 24px', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, background: '#FFF', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} color="#F59E0B" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Portaria - {property.name}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status: <span style={{ color: '#10B981', fontWeight: 600 }}>Operacional</span></p>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem('cd_doorman_propertyId'); navigate('/portaria-login'); }} className="btn-secondary" style={{ width: 'auto', padding: '10px 20px', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px', background: '#FFF5F5' }}>
          <LogOut size={16} /> Sair
        </button>
      </header>

      {/* FLASH NOTIFICATION */}
      {authorizedEntry && (
        <div className="fade-in" style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#000', padding: '24px 40px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 20px 60px rgba(16, 185, 129, 0.5)', zIndex: 100, border: '4px solid #059669', animation: 'pulse 1s infinite alternate' }}>
          <CheckCircle2 size={48} />
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px' }}>ACESSO LIBERADO</h2>
            <p style={{ fontSize: '16px', fontWeight: 700 }}>Autorizado por: {authorizedEntry.unitName}</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ position: 'relative', marginBottom: '32px' }}>
          <Search size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar unidade, bloco ou apartamento..." value={search} onChange={e => setSearch(e.target.value)} className="input-glass" style={{ padding: '20px 20px 20px 56px', fontSize: '18px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: '#FFF', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredUnits.map(unit => (
            <div key={unit.id} className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => navigate(`/chamada/${unit.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px' }}>Morador</span>
                  <h3 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)' }}>{unit.name}</h3>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '12px', borderRadius: '50%' }}>
                  <Phone size={24} color="#F59E0B" />
                </div>
              </div>
              <button className="btn-secondary" style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', borderColor: 'transparent', fontWeight: 700 }}>
                Chamar Unidade
              </button>
            </div>
          ))}
        </div>

      </main>

      <style>{`
        @keyframes pulse {
          0% { transform: translateX(-50%) scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          100% { transform: translateX(-50%) scale(1.05); box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  );
}
