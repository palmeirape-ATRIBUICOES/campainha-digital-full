import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, Trash2, Calendar, Clipboard, Share2, AlertCircle } from 'lucide-react';
import { API } from '../../config';

export default function VisitorCodesPanel({ unitId, propertyName }) {
  const [codes, setCodes] = useState([]);
  const [visitorName, setVisitorName] = useState('');
  const [daysValid, setDaysValid] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/units/${unitId}/visitor-codes`);
      if (r.ok) {
        const data = await r.json();
        setCodes(data);
      }
    } catch (e) {
      console.error('Error fetching visitor codes:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (unitId) fetchCodes();
  }, [unitId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const r = await fetch(`${API}/api/units/${unitId}/visitor-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorName: visitorName.trim(), daysValid: parseInt(daysValid) })
      });
      if (r.ok) {
        const newCode = await r.json();
        setSuccess(`Código ${newCode.code} gerado com sucesso!`);
        setVisitorName('');
        fetchCodes();
      } else {
        const errData = await r.json();
        setError(errData.error || 'Erro ao gerar código.');
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (codeId) => {
    if (!window.confirm('Deseja realmente cancelar este código de acesso?')) return;
    try {
      const r = await fetch(`${API}/api/units/${unitId}/visitor-codes/${codeId}`, {
        method: 'DELETE'
      });
      if (r.ok) {
        fetchCodes();
      }
    } catch (e) {
      console.error('Error deleting visitor code:', e);
    }
  };

  const copyToClipboard = (code, name) => {
    const text = `Olá, *${name}*! Aqui está o seu código de acesso pré-autorizado para a Vila/Condomínio *${propertyName || 'Digital'}*:\n\n🔑 Código: *${code}*\n\nAo chegar na portaria, basta informar este código para liberação imediata!`;
    navigator.clipboard.writeText(text);
    alert('Convite copiado para a área de transferência!');
  };

  const shareWhatsApp = (code, name) => {
    const text = `Olá, *${name}*! Aqui está o seu código de acesso pré-autorizado para a Vila/Condomínio *${propertyName || 'Digital'}*:\n\n🔑 Código: *${code}*\n\nAo chegar na portaria, basta informar este código para liberação imediata!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px' }}>
          <KeyRound size={22} color="var(--primary, #8B5CF6)" /> Pré-Autorizar Visitante
        </h3>
        <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, margin: '0 0 20px', lineHeight: 1.5 }}>
          Crie códigos temporários de 6 dígitos para seus convidados ou entregadores. O porteiro validará o código no painel para sua total comodidade.
        </p>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nome do Visitante</label>
            <input 
              value={visitorName} 
              onChange={e => setVisitorName(e.target.value)} 
              placeholder="Ex: Carlos Silva ou Sedex"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', background: '#F8FAFC', fontWeight: 600, color: '#1E293B', transition: 'border-color 0.2s' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Validade do Código</label>
            <select 
              value={daysValid} 
              onChange={e => setDaysValid(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', background: '#F8FAFC', fontWeight: 600, color: '#1E293B' }}
            >
              <option value="1">1 Dia (24 horas)</option>
              <option value="3">3 Dias</option>
              <option value="7">7 Dias</option>
            </select>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444', padding: '10px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success && (
            <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#059669', padding: '10px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
              {success}
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting || !visitorName.trim()} 
            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.25)', opacity: visitorName.trim() ? 1 : 0.6, transition: 'all 0.2s' }}
          >
            <Plus size={18} /> {submitting ? 'Gerando...' : 'Gerar Código de Acesso'}
          </button>
        </form>
      </div>

      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 4px' }}>
        🔑 Códigos Ativos ({codes.length})
      </h4>

      {loading ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', fontWeight: 600, padding: '20px' }}>Carregando códigos...</p>
      ) : codes.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed #E2E8F0', borderRadius: '20px', padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
          <KeyRound size={36} style={{ opacity: 0.2, marginBottom: '8px' }} />
          <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Nenhum código ativo de visitante no momento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {codes.map(c => {
            const isExpired = new Date() > new Date(c.expiresAt);
            return (
              <div 
                key={c.id} 
                style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', opacity: isExpired ? 0.6 : 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h5 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: '0 0 4px' }}>{c.visitorName}</h5>
                    <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                      <Calendar size={12} /> Vence em: {new Date(c.expiresAt).toLocaleDateString('pt-BR')} às {new Date(c.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', padding: '8px', borderRadius: '10px', color: '#EF4444', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', borderRadius: '12px', padding: '10px 14px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary, #8B5CF6)', letterSpacing: '2px' }}>{c.code}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => copyToClipboard(c.code, c.visitorName)}
                      title="Copiar Convite"
                      style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#475569' }}
                    >
                      <Clipboard size={12} /> Copiar
                    </button>
                    <button 
                      onClick={() => shareWhatsApp(c.code, c.visitorName)}
                      title="Enviar por WhatsApp"
                      style={{ background: '#25D366', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#FFF' }}
                    >
                      <Share2 size={12} /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
