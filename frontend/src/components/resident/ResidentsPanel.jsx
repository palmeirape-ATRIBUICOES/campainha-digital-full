import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Copy, Check, Shield } from 'lucide-react';
import { API } from '../../config';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        fontSize: '11px',
        color: copied ? '#10B981' : '#3B82F6',
        background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s'
      }}
    >
      {copied ? <><Check size={12}/>OK</> : <><Copy size={12}/>Copiar Código</>}
    </button>
  );
}

export default function ResidentsPanel({ unitId, propertyId }) {
  const [residents, setResidents] = useState([]);
  const [newResidentName, setNewResidentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (unitId) {
      fetchResidents();
    }
  }, [unitId]);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/units/${unitId}/residents`);
      if (res.ok) {
        const data = await res.json();
        setResidents(data);
      }
    } catch (err) {
      console.error('Error fetching unit residents:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedResidents = [...residents].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const primaryResident = sortedResidents[0];
  const currentUserId = localStorage.getItem('cd_user_id');
  const isMainResident = primaryResident && primaryResident.id === currentUserId;

  const handleToggleCalls = async (residentId, currentVal) => {
    try {
      const requesterId = localStorage.getItem('cd_user_id') || '';
      const res = await fetch(`${API}/api/units/${unitId}/residents/${residentId}/allow-calls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId, allowPortariaCalls: !currentVal })
      });
      if (res.ok) {
        await fetchResidents();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao alterar configuração.');
      }
    } catch (err) {
      alert('Erro de conexão ao alterar configuração.');
    }
  };

  const handleAddResident = async (e) => {
    e.preventDefault();
    if (!newResidentName.trim()) return;
    if (residents.length >= 5) {
      alert('Limite máximo de 5 moradores atingido.');
      return;
    }
    setSubmitting(true);
    try {
      const requesterId = localStorage.getItem('cd_user_id') || '';
      const res = await fetch(`${API}/api/units/${unitId}/residents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newResidentName.trim(), requesterId })
      });
      if (res.ok) {
        setNewResidentName('');
        await fetchResidents();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao cadastrar sub-morador.');
      }
    } catch (err) {
      alert('Erro de conexão ao cadastrar morador.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResident = async (residentId) => {
    if (!window.confirm('Remover este morador? O acesso dele será cancelado permanentemente.')) return;
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/units/${unitId}/residents/${residentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchResidents();
      } else {
        alert('Erro ao remover morador.');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
          <Users size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Moradores & Códigos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Gerencie as pessoas que moram com você</p>
        </div>
      </div>

      <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '14px', padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
        💡 <strong>Cada morador tem o seu próprio Código Único.</strong> O morador principal (1º cadastrado) pode decidir quem receberá as chamadas da portaria/visitantes através do botão de controle.
      </div>

      {/* Formulário de Cadastro */}
      {residents.length >= 5 ? (
        <div style={{
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
          border: '1px solid #FCA5A5',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B', margin: 0 }}>LIMITE DE MORADORES ATINGIDO</h4>
          <p style={{ fontSize: '12px', color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>
            Esta unidade atingiu o limite máximo de <strong>5 moradores cadastrados</strong> no sistema. Para adicionar um novo, remova um dos moradores ativos abaixo.
          </p>
        </div>
      ) : (
        <form onSubmit={handleAddResident} className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-main)' }}>➕ CADASTRAR NEW MORADOR (DEPENDENTE)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>NOME DO MORADOR</label>
              <input
                type="text"
                placeholder="Ex: Ana Filha, Maria Mãe, etc."
                className="input-glass"
                value={newResidentName}
                onChange={e => setNewResidentName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 700 }}
            >
              {submitting ? 'Cadastrando...' : 'Criar Código de Acesso'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Moradores Cadastrados */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>👥 MORADORES ATIVOS NESTA UNIDADE</h3>
        {loading && residents.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Carregando moradores...</p>
        ) : residents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Nenhum morador cadastrado</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Adicione seus familiares acima para que eles possam acessar!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {residents.map(res => (
              <div key={res.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>{res.name}</span>
                    {res.id === primaryResident?.id && (
                      <span style={{
                        fontSize: '10px',
                        background: 'rgba(59,130,246,0.1)',
                        color: '#3B82F6',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        fontWeight: 700,
                        marginLeft: '8px',
                        display: 'inline-block'
                      }}>
                        Principal
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Código Único do Morador:</span>
                  <code style={{ fontSize: '13px', fontWeight: 900, color: '#10B981', letterSpacing: '1px', background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: '6px', alignSelf: 'flex-start', marginTop: '4px' }}>{res.clientCode || '---'}</code>
                  
                  {res.id === primaryResident?.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🟢 Recebe chamadas (Sempre)
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => isMainResident && handleToggleCalls(res.id, res.allowPortariaCalls !== false)}
                      disabled={!isMainResident}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: isMainResident ? 'pointer' : 'default',
                        marginTop: '10px',
                        opacity: 1,
                        textAlign: 'left',
                        outline: 'none'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '20px',
                        borderRadius: '10px',
                        background: (res.allowPortariaCalls !== false) ? '#10B981' : '#CBD5E1',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        display: 'inline-block',
                        verticalAlign: 'middle'
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          position: 'absolute',
                          top: '2px',
                          left: (res.allowPortariaCalls !== false) ? '18px' : '2px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', verticalAlign: 'middle' }}>
                        {res.allowPortariaCalls !== false ? 'Recebe chamadas' : 'Chamadas desativadas'}
                      </span>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <CopyBtn text={res.clientCode || ''} />
                  <button
                    onClick={() => handleDeleteResident(res.id)}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: 'none',
                      color: '#EF4444',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={12} /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
