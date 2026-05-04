import React, { useState, useEffect } from 'react';
import { Plus, Download, Trash2, Home, Building2, X } from 'lucide-react';

export default function AdminPanel() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ type: 'individual', name: '' });
  const [unitsList, setUnitsList] = useState([{ name: '' }]); // dynamic array for collective

  useEffect(() => {
    fetchProperties();
  }, []);

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
        fetchProperties();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProperty = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
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
    <div className="container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '8px' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.imgur.com/your-logo.png'; }} />
        <div>
          <h1 className="text-gradient">Painel Administrativo</h1>
          <p className="text-muted">Gestão de Placas e QR Codes</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '24px' }}>Cadastrar Nova Placa QR Code</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
              <input type="radio" checked={formData.type === 'individual'} onChange={() => setFormData({...formData, type: 'individual'})} />
              <Home size={20} className="text-muted" /> Individual (Casa/Lote)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
              <input type="radio" checked={formData.type === 'collective'} onChange={() => setFormData({...formData, type: 'collective'})} />
              <Building2 size={20} className="text-muted" /> Coletivo (Condomínio/Vila)
            </label>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Nome da Propriedade ou Cliente</label>
            <input 
              type="text" 
              placeholder="Ex: Residencial Flores ou Casa do João" 
              className="input-glass"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          {formData.type === 'collective' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
              <label style={{ display: 'block', marginBottom: '16px', fontWeight: 600 }}>Adicione as Unidades (Ex: Apto 101, Apto 102)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {unitsList.map((unit, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder={`Nome da Unidade ${index + 1}`} 
                      className="input-glass"
                      value={unit.name}
                      onChange={(e) => handleUnitChange(index, e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => removeUnitField(index)} className="btn-danger" style={{ padding: '12px' }} disabled={unitsList.length === 1}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addUnitField} className="btn-glass" style={{ marginTop: '16px', width: '100%', borderStyle: 'dashed' }}>
                <Plus size={16} /> Adicionar Nova Unidade
              </button>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '16px', marginTop: '8px' }}>
            <Plus size={20} /> Gerar QR Code Definitivo
          </button>
        </form>
      </div>

      <h2 style={{ marginBottom: '24px' }}>Minhas Placas</h2>
      {loading ? <p>Carregando...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {properties.map(p => (
            <div key={p.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{p.name}</h3>
                  <span style={{ fontSize: '12px', padding: '4px 8px', background: p.type === 'individual' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)', color: p.type === 'individual' ? 'var(--success)' : 'var(--accent-cyan)', borderRadius: '4px', fontWeight: 600 }}>
                    {p.type === 'individual' ? 'Individual' : `Coletivo (${p.units.length} unids)`}
                  </span>
                </div>
                <button onClick={() => deleteProperty(p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Excluir Placa">
                  <Trash2 size={20} />
                </button>
              </div>
              
              <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <img src={p.qrCodeUrl} alt="QR Code" style={{ width: '100%', maxWidth: '200px', height: 'auto' }} />
              </div>
              
              <button className="btn-primary" style={{ width: '100%', marginBottom: '16px' }} onClick={() => downloadQR(p.qrCodeUrl, p.name)}>
                <Download size={18} /> Baixar Imagem (Impressão)
              </button>
              
              <div style={{ fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', wordBreak: 'break-all', border: '1px solid var(--glass-border)' }}>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>URL Física (QR Code):</strong>
                <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>{p.url}</a>
              </div>
              
              {p.type === 'collective' && (
                <div style={{ marginTop: '16px', fontSize: '13px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>Links de Acesso dos Moradores (Envie via WhatsApp):</strong>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {p.units.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                        <span>{u.name}</span>
                        <a href={`/morador/${u.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Acessar</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.type === 'individual' && p.units[0] && (
                <div style={{ marginTop: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                  <strong>Painel do Morador:</strong>
                  <a href={`/morador/${p.units[0].id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Acessar App</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
