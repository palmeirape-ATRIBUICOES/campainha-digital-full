import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, Building2, Phone, Search, KeyRound, CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PorteiroDashboard() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [authorizedEntry, setAuthorizedEntry] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    const role = localStorage.getItem('cd_admin_role');
    const adminEmail = localStorage.getItem('cd_admin_email');
    const singlePropertyId = localStorage.getItem('cd_doorman_propertyId');

    const fetchData = async () => {
      try {
        let url = `${API}/api/properties`;
        if (role !== 'master') {
          url += `?email=${encodeURIComponent(adminEmail || '')}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setProperties(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const s = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = s;
    
    if (singlePropertyId) {
      s.emit('register_doorman', { propertyId: singlePropertyId });
    } else {
      // For master doormen, we might need a global register or register for all
      properties.forEach(p => s.emit('register_doorman', { propertyId: p.id }));
    }

    s.on('entry_authorized', ({ unitId, visitorId, timestamp }) => {
      let uName = 'Morador';
      setProperties(prev => {
        prev.forEach(p => {
          const unit = p.units?.find(u => u.id === unitId);
          if (unit) uName = `${p.name} - ${unit.name}`;
        });
        return prev;
      });
      setAuthorizedEntry({ unitName: uName, timestamp });
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      setTimeout(() => setAuthorizedEntry(null), 15000);
    });

    return () => s.disconnect();
  }, [navigate]);

  if (loading) return <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando painel de controle...</div>;

  const allUnits = properties.flatMap(p => (p.units || []).map(u => ({ ...u, propertyName: p.name, propertyId: p.id })));
  const filteredUnits = allUnits.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.propertyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#1E293B' }}>
      <header style={{ padding: '20px 40px', background: '#FFF', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Logo size={32} />
          <div style={{ height: '24px', width: '1px', background: '#E2E8F0' }} />
          <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Painel de Monitoramento Central</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => { localStorage.clear(); navigate('/auth'); }} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #F1F5F9', background: '#FFF', color: '#64748B', fontWeight: 600, cursor: 'pointer' }}>Sair</button>
        </div>
      </header>

      {authorizedEntry && (
        <div style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#FFF', padding: '20px 40px', borderRadius: '100px', boxShadow: '0 20px 40px rgba(16, 185, 129, 0.4)', zIndex: 1000, fontWeight: 900, fontSize: '18px' }}>
          ✅ ACESSO LIBERADO: {authorizedEntry.unitName}
        </div>
      )}

      <main style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={24} style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input 
              type="text" 
              placeholder="Pesquisar por condomínio, apartamento ou morador..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ width: '100%', padding: '24px 24px 24px 72px', fontSize: '20px', borderRadius: '24px', border: '1px solid #E2E8F0', background: '#FFF', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', outline: 'none' }} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {filteredUnits.map(unit => (
            <div key={`${unit.propertyId}-${unit.id}`} style={{ background: '#FFF', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => navigate(`/chamada/${unit.id}`)}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', marginBottom: '8px' }}>{unit.propertyName}</div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 16px' }}>{unit.name}</h3>
              <button style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Phone size={16} /> Chamar Morador
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
