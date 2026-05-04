import React, { useState, useEffect } from 'react';
import { Plus, Download, Trash2, Home, Building2, X, ShieldCheck, QrCode, LogOut, ChevronRight, Settings, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPanel() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ type: 'individual', name: '' });
  const [unitsList, setUnitsList] = useState([{ name: '' }]);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    fetchProperties();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/properties');
      const data = await res.json();
      setProperties(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (index, value) => {
    const newUnits = [...unitsList];
    newUnits[index].name = value;
    setUnitsList(newUnits);
  };

  const addUnitField = () => {
    setUnitsList([...unitsList, { name: '' }]);
  };

  const removeUnitField = (index) => {
    if (unitsList.length === 1) return;
    const newUnits = unitsList.filter((_, i) => i !== index);
    setUnitsList(newUnits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let parsedUnits = [];
    if (formData.type === 'collective') {
      parsedUnits = unitsList.filter(u => u.name.trim() !== '');
      if (parsedUnits.length === 0) {
        alert("Adicione pelo menos uma unidade para o condomínio.");
        return;
      }
    }
    
    try {
      const res = await fetch('http://localhost:3001/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, units: parsedUnits })
      });
      if (res.ok) {
        setFormData({ type: 'individual', name: '' });
        setUnitsList([{ name: '' }]);
        setShowCreateForm(false);
        fetchProperties();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProperty = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta placa permanentemente?')) return;
    try {
      await fetch(`http://localhost:3001/api/properties/${id}`, { method: 'DELETE' });
      fetchProperties();
    } catch (err) {
      console.error(err);
    }
  };

  const downloadQR = (url, name) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${name.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', paddingBottom: '60px' }}>
      
      {/* App Header */}
      <header style={{ background: 'var(--bg-surface-elevated)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={28} color="var(--primary)" />
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>Painel do Cliente</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
           {installPrompt && (
             <button onClick={handleInstallClick} style={{ background: 'rgba(0, 229, 255, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <Smartphone size={14} /> Instalar Painel
             </button>
           )}
           <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
             <LogOut size={18} /> Sair
           </Link>
        </div>
      </header>

      <main className="container fade-in" style={{ marginTop: '32px' }}>
        
        {/* Dashboard Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
           <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Minhas Propriedades</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gerencie suas placas QR Code e configure unidades</p>
           </div>
           {!showCreateForm && (
             <button className="btn-primary" onClick={() => setShowCreateForm(true)} style={{ padding: '12px 24px' }}>
               <Plus size={20} /> Nova Placa
             </button>
           )}
        </div>

        {/* Create Form (Conditional) */}
        {showCreateForm && (
          <div className="premium-card fade-in" style={{ marginBottom: '40px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <h3 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QrCode size={20} color="var(--primary)" /> Configurar Nova Instalação
               </h3>
               <button onClick={() => setShowCreateForm(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
               </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: formData.type === 'individual' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${formData.type === 'individual' ? 'var(--primary)' : 'var(--border-subtle)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <input type="radio" checked={formData.type === 'individual'} onChange={() => setFormData({...formData, type: 'individual'})} style={{ accentColor: 'var(--primary)' }} />
                     <Home size={18} color={formData.type === 'individual' ? 'var(--primary)' : 'var(--text-muted)'} />
                     <span style={{ fontWeight: 600 }}>Casa Única</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Configuração direta para residência individual.</span>
                </label>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: formData.type === 'collective' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${formData.type === 'collective' ? 'var(--primary)' : 'var(--border-subtle)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <input type="radio" checked={formData.type === 'collective'} onChange={() => setFormData({...formData, type: 'collective'})} style={{ accentColor: 'var(--primary)' }} />
                     <Building2 size={18} color={formData.type === 'collective' ? 'var(--primary)' : 'var(--text-muted)'} />
                     <span style={{ fontWeight: 600 }}>Condomínio / Vila</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>O agente configura todas as unidades do complexo.</span>
                </label>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: 'var(--text-muted)' }}>Nome da Propriedade (Ex: Residencial Solar)</label>
                <input 
                  type="text" 
                  placeholder="Nome do Imóvel" 
                  className="input-glass"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              {formData.type === 'collective' && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'block', marginBottom: '16px', fontWeight: 600, fontSize: '14px', color: 'var(--text-muted)' }}>Configurar Unidades (Moradores)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {unitsList.map((unit, index) => (
                      <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{index + 1}</div>
                        <input 
                          type="text" 
                          placeholder="Ex: Apto 101" 
                          className="input-glass"
                          style={{ flex: 1 }}
                          value={unit.name}
                          onChange={(e) => handleUnitChange(index, e.target.value)}
                          required
                        />
                        <button type="button" onClick={() => removeUnitField(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '12px', cursor: unitsList.length === 1 ? 'not-allowed' : 'pointer', opacity: unitsList.length === 1 ? 0.5 : 1 }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addUnitField} style={{ marginTop: '16px', background: 'transparent', color: 'var(--primary)', border: '1px dashed var(--primary)', padding: '12px', borderRadius: '12px', width: '100%', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Plus size={16} /> Adicionar Morador
                  </button>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center' }}>
                Finalizar Configuração <ChevronRight size={20} />
              </button>
            </form>
          </div>
        )}

        {/* Properties List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Carregando dados seguros...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {properties.map(p => (
              <div key={p.id} className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{p.name}</h3>
                    <span style={{ fontSize: '12px', padding: '4px 10px', background: p.type === 'individual' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 229, 255, 0.1)', color: p.type === 'individual' ? '#10B981' : 'var(--primary)', border: `1px solid ${p.type === 'individual' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 229, 255, 0.2)'}`, borderRadius: '100px', fontWeight: 600 }}>
                      {p.type === 'individual' ? 'Casa Única' : `Condomínio (${p.units.length} unids)`}
                    </span>
                  </div>
                  <button onClick={() => deleteProperty(p.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#EF4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Excluir Placa">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
                  <img src={p.qrCodeUrl} alt="QR Code" style={{ width: '100%', maxWidth: '160px', height: 'auto', display: 'block' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                   <button className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '13px' }} onClick={() => downloadQR(p.qrCodeUrl, p.name)}>
                     <Download size={16} /> Imprimir Placa
                   </button>
                   <button className="btn-secondary" style={{ width: '48px', padding: 0 }} title="Configurações da Placa">
                     <Settings size={18} />
                   </button>
                </div>
                
                <div style={{ fontSize: '13px', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Link da Placa Física:</span>
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'block', wordBreak: 'break-all' }}>{p.url}</a>
                </div>
                
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: 'auto' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
                    Acesso PWA dos Moradores:
                  </span>
                  
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {p.units.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '14px', fontWeight: 600 }}>{u.name || 'Proprietário'}</span>
                           <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pronto para instalar</span>
                        </div>
                        <a href={`/morador/${u.id}`} target="_blank" rel="noreferrer" style={{ color: '#10B981', textDecoration: 'none', fontSize: '12px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          BAIXAR <ChevronRight size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
