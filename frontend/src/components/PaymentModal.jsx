import React, { useState } from 'react';
import { X, CheckCircle, Copy, CreditCard, Smartphone } from 'lucide-react';
import { API } from '../config';

export default function PaymentModal({ userId, userEmail, onClose, onSuccess }) {
  const [tab, setTab] = useState('pix'); // 'pix' | 'card'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // resultado final do pagamento
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Campos PIX ───────────────────────────────────────────────────────
  const [pixEmail, setPixEmail] = useState(userEmail || '');

  // ── Campos Cartão ─────────────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardEmail, setCardEmail] = useState(userEmail || '');
  const [cardCpf, setCardCpf] = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatCardNumber = (v) => v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '');
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d;
  };
  const formatCpf = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCopyPix = () => {
    if (result?.qr_code) {
      navigator.clipboard.writeText(result.qr_code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Enviar PIX ───────────────────────────────────────────────────────
  const handlePixSubmit = async (e) => {
    e.preventDefault();
    if (!pixEmail) return setError('Informe seu e-mail para gerar o PIX.');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/payment/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pixEmail, userId })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao gerar PIX.');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ── Enviar Cartão ─────────────────────────────────────────────────────
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações básicas
    const rawCard = cardNumber.replace(/\s/g, '');
    const rawCpf = cardCpf.replace(/\D/g, '');
    const [expMonth, expYear] = cardExpiry.split('/');

    if (rawCard.length < 16) return setError('Número do cartão inválido.');
    if (!cardName) return setError('Informe o nome como está no cartão.');
    if (!expMonth || !expYear || expMonth > 12) return setError('Data de vencimento inválida.');
    if (cardCvv.length < 3) return setError('CVV inválido.');
    if (!cardEmail) return setError('Informe seu e-mail.');
    if (rawCpf.length !== 11) return setError('CPF inválido.');

    setLoading(true);
    try {
      // Para cartão, enviamos os dados diretamente para o backend processar via MP API
      const res = await fetch(`${API}/api/payment/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: detectCardBrand(rawCard),
          transaction_amount: 39.90,
          installments: 1,
          payer: {
            email: cardEmail,
            identification: { type: 'CPF', number: rawCpf }
          },
          card: {
            number: rawCard,
            holder_name: cardName.toUpperCase(),
            expiration_month: parseInt(expMonth),
            expiration_year: parseInt(`20${expYear}`),
            security_code: cardCvv
          },
          external_reference: userId
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao processar cartão.');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const detectCardBrand = (num) => {
    if (/^4/.test(num)) return 'visa';
    if (/^5[1-5]/.test(num)) return 'master';
    if (/^3[47]/.test(num)) return 'amex';
    return 'visa'; // fallback
  };

  // ────────────────────────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 64px rgba(0,0,0,0.35)',
        fontFamily: "'Inter', 'Roboto', sans-serif"
      }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 700, lineHeight: 1.2 }}>Finalizar Assinatura</h3>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>Plano Anual — R$ 39,90</p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#475569" />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* ── Resultado após pagamento ───────────────────────────── */}
          {result ? (
            <div style={{ textAlign: 'center', paddingTop: '12px' }}>

              {/* PIX gerado */}
              {result.qr_code_base64 && (
                <>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '14px' }}>✅ PIX gerado! Pague e ative sua conta.</p>
                  </div>
                  <img
                    src={`data:image/jpeg;base64,${result.qr_code_base64}`}
                    alt="QR Code PIX"
                    style={{ width: '200px', height: '200px', margin: '0 auto 20px', display: 'block', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '8px' }}
                  />
                  <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px dashed #CBD5E1', marginBottom: '20px', position: 'relative', textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '11px', wordBreak: 'break-all', color: '#475569', paddingRight: '36px', fontFamily: 'monospace', lineHeight: 1.6 }}>
                      {result.qr_code}
                    </p>
                    <button onClick={handleCopyPix} title="Copiar código PIX"
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: copied ? '#10B981' : '#EFF6FF', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <Copy size={16} color={copied ? '#fff' : '#3B82F6'} />
                    </button>
                  </div>
                  {copied && <p style={{ color: '#10B981', fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>✓ Código copiado!</p>}
                  <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px', lineHeight: '1.5' }}>
                    Após o pagamento, a ativação será automática em segundos.
                  </p>
                  <button onClick={onSuccess} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#0F172A', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
                    Já paguei – Ir para o Painel
                  </button>
                </>
              )}

              {/* Cartão aprovado */}
              {result.status === 'approved' && !result.qr_code_base64 && (
                <>
                  <CheckCircle size={64} color="#10B981" style={{ margin: '0 auto 16px', display: 'block' }} />
                  <h4 style={{ fontSize: '20px', color: '#0F172A', margin: '0 0 8px', fontWeight: 700 }}>Pagamento Aprovado! 🎉</h4>
                  <p style={{ color: '#64748B', marginBottom: '24px', lineHeight: 1.6 }}>Sua conta anual Premium foi ativada.</p>
                  <button onClick={onSuccess} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#3B82F6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
                    Entrar no Painel
                  </button>
                </>
              )}

              {/* Pendente sem QR */}
              {result.status !== 'approved' && !result.qr_code_base64 && (
                <>
                  <h4 style={{ fontSize: '18px', color: '#0F172A', margin: '0 0 8px', fontWeight: 700 }}>Pagamento em análise</h4>
                  <p style={{ color: '#64748B', marginBottom: '24px', lineHeight: 1.6 }}>Aguardando confirmação. Você receberá um e-mail.</p>
                  <button onClick={onSuccess} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#3B82F6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                    Ir para o Painel
                  </button>
                </>
              )}
            </div>

          ) : (
            <>
              {/* ── Abas ────────────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#F8FAFC', padding: '4px', borderRadius: '12px' }}>
                {[
                  { id: 'pix', label: 'PIX', icon: <Smartphone size={15} /> },
                  { id: 'card', label: 'Cartão', icon: <CreditCard size={15} /> }
                ].map(t => (
                  <button key={t.id} onClick={() => { setTab(t.id); setError(''); }}
                    style={{
                      flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
                      background: tab === t.id ? '#fff' : 'transparent',
                      color: tab === t.id ? '#1E3A8A' : '#94A3B8',
                      boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* ── Erro global ─────────────────────────────────────── */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <p style={{ margin: 0, color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>⚠ {error}</p>
                </div>
              )}

              {/* ── Formulário PIX ────────────────────────────────── */}
              {tab === 'pix' && (
                <form onSubmit={handlePixSubmit}>
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                    <p style={{ margin: 0, color: '#1E40AF', fontSize: '13px', fontWeight: 600, lineHeight: 1.5 }}>
                      🟢 Método mais rápido! O QR Code será gerado instantaneamente e a ativação é automática após o pagamento.
                    </p>
                  </div>

                  <label style={labelStyle}>Seu E-mail</label>
                  <input
                    type="email"
                    value={pixEmail}
                    onChange={e => setPixEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    required
                    style={inputStyle}
                  />

                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '20px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Plano Anual Premium</span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>R$ 39,90</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>Acesso completo por 12 meses</p>
                  </div>

                  <button type="submit" disabled={loading} style={submitBtnStyle(loading)}>
                    {loading ? 'Gerando PIX...' : '🟢 Gerar QR Code PIX'}
                  </button>
                </form>
              )}

              {/* ── Formulário Cartão ─────────────────────────────── */}
              {tab === 'card' && (
                <form onSubmit={handleCardSubmit}>
                  <label style={labelStyle}>Número do Cartão</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    required
                    style={inputStyle}
                    inputMode="numeric"
                  />

                  <label style={labelStyle}>Nome no Cartão</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={e => setCardName(e.target.value.toUpperCase())}
                    placeholder="COMO ESCRITO NO CARTÃO"
                    required
                    style={inputStyle}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Validade</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/AA"
                        maxLength={5}
                        required
                        style={inputStyle}
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>CVV</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        required
                        style={inputStyle}
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <label style={labelStyle}>CPF do Titular</label>
                  <input
                    type="text"
                    value={cardCpf}
                    onChange={e => setCardCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                    style={inputStyle}
                    inputMode="numeric"
                  />

                  <label style={labelStyle}>E-mail para recibo</label>
                  <input
                    type="email"
                    value={cardEmail}
                    onChange={e => setCardEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    required
                    style={inputStyle}
                  />

                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Total — 1x sem juros</span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>R$ 39,90</span>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} style={submitBtnStyle(loading)}>
                    {loading ? 'Processando...' : '💳 Pagar com Cartão'}
                  </button>
                </form>
              )}

              <p style={{ textAlign: 'center', fontSize: '11px', color: '#94A3B8', marginTop: '16px' }}>
                🔒 Pagamento seguro via Mercado Pago
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Estilos compartilhados ───────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', marginTop: '12px'
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0',
  fontSize: '15px', outline: 'none', color: '#0F172A', background: '#fff',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
  fontFamily: 'inherit'
};

const submitBtnStyle = (disabled) => ({
  width: '100%', padding: '14px', borderRadius: '12px',
  background: disabled ? '#94A3B8' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px',
  cursor: disabled ? 'not-allowed' : 'pointer', marginTop: '4px',
  boxShadow: disabled ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)',
  transition: 'all 0.2s'
});
