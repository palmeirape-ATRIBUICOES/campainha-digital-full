import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Copy, CreditCard, Smartphone, RefreshCw } from 'lucide-react';
import { API } from '../config';

export default function PaymentModal({ userId, userEmail, onClose, onSuccess }) {
  const [tab, setTab] = useState('pix'); // 'pix' | 'card'
  const [loading, setLoading] = useState(false);
  const [pixLoading, setPixLoading] = useState(true); // carrega ao abrir
  const [result, setResult] = useState(null);
  const [pixData, setPixData] = useState(null); // QR code pix pré-carregado
  const [error, setError] = useState('');
  const [pixError, setPixError] = useState('');
  const [copied, setCopied] = useState(false);

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
    const code = pixData?.qr_code || result?.qr_code;
    if (code) {
      navigator.clipboard.writeText(code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Gera PIX automaticamente ao abrir o modal ─────────────────────
  const generatePix = useCallback(async () => {
    const email = userEmail || localStorage.getItem('cd_user_contact') || '';
    const uid = userId || localStorage.getItem('cd_user_id') || '';

    if (!email) {
      setPixError('E-mail não encontrado. Tente fazer login novamente.');
      setPixLoading(false);
      return;
    }

    setPixLoading(true);
    setPixError('');
    setPixData(null);

    try {
      const res = await fetch(`${API}/api/payment/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId: uid })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao gerar PIX.');
      setPixData(data);
    } catch (err) {
      setPixError(err.message || 'Erro ao gerar o código PIX. Tente novamente.');
    } finally {
      setPixLoading(false);
    }
  }, [userId, userEmail]);

  // Gera ao montar
  useEffect(() => {
    generatePix();
  }, [generatePix]);

  // ── Enviar Cartão ─────────────────────────────────────────────────────
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
      const uid = userId || localStorage.getItem('cd_user_id') || '';
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
          external_reference: uid
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
    return 'visa';
  };

  // ── Tela de resultado de cartão aprovado ──────────────────────────
  if (result && result.status === 'approved') {
    return (
      <ModalWrapper onClose={onClose}>
        <ModalHeader onClose={onClose} />
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <CheckCircle size={72} color="#10B981" style={{ margin: '0 auto 20px', display: 'block' }} />
          <h4 style={{ fontSize: '22px', color: '#0F172A', margin: '0 0 10px', fontWeight: 800 }}>Pagamento Aprovado! 🎉</h4>
          <p style={{ color: '#64748B', marginBottom: '28px', lineHeight: 1.6, fontSize: '15px' }}>
            Sua conta anual Premium foi ativada com sucesso!
          </p>
          <button onClick={onSuccess} style={primaryBtn}>Entrar no Painel →</button>
        </div>
      </ModalWrapper>
    );
  }

  // ── Tela de resultado cartão pendente ──────────────────────────────
  if (result && !result.qr_code_base64) {
    return (
      <ModalWrapper onClose={onClose}>
        <ModalHeader onClose={onClose} />
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '18px', color: '#0F172A', margin: '0 0 10px', fontWeight: 700 }}>Pagamento em análise</h4>
          <p style={{ color: '#64748B', marginBottom: '28px', lineHeight: 1.6 }}>
            Aguardando confirmação da operadora. Você receberá um e-mail assim que for aprovado.
          </p>
          <button onClick={onSuccess} style={primaryBtn}>Ir para o Painel</button>
        </div>
      </ModalWrapper>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  //  RENDER PRINCIPAL
  // ────────────────────────────────────────────────────────────────────
  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader onClose={onClose} />

      <div style={{ padding: '0 24px 24px' }}>

        {/* ── Abas ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', margin: '20px 0', background: '#F8FAFC', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'pix', label: 'PIX', icon: <Smartphone size={15} /> },
            { id: 'card', label: 'Cartão de Crédito', icon: <CreditCard size={15} /> }
          ].map(t => (
            <button key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? '#1E3A8A' : '#94A3B8',
                boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══ ABA PIX ══════════════════════════════════════════════ */}
        {tab === 'pix' && (
          <>
            {/* Carregando */}
            {pixLoading && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  border: '4px solid #EFF6FF', borderTopColor: '#3B82F6',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
                }} />
                <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 600 }}>Gerando seu código PIX...</p>
                <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '4px' }}>Isso leva apenas um segundo</p>
              </div>
            )}

            {/* Erro no PIX */}
            {!pixLoading && pixError && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px', color: '#DC2626', fontSize: '13px', fontWeight: 700 }}>⚠ {pixError}</p>
                  <p style={{ margin: 0, color: '#EF4444', fontSize: '12px' }}>Verifique sua conexão e tente novamente.</p>
                </div>
                <button onClick={generatePix} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: '#3B82F6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                  <RefreshCw size={16} /> Tentar novamente
                </button>
              </div>
            )}

            {/* QR Code PIX */}
            {!pixLoading && pixData && (
              <>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '13px' }}>PIX gerado com sucesso!</p>
                    <p style={{ margin: '2px 0 0', color: '#15803D', fontSize: '12px' }}>Escaneie ou copie o código para pagar</p>
                  </div>
                </div>

                {/* QR Code */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', border: '2px solid #BBF7D0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'inline-block' }}>
                    <img
                      src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
                      alt="QR Code PIX"
                      style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
                    />
                  </div>
                </div>

                {/* Código Pix Copia e Cola */}
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px dashed #CBD5E1', marginBottom: '12px', position: 'relative' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>CÓDIGO PIX COPIA E COLA</p>
                  <p style={{ margin: 0, fontSize: '11px', wordBreak: 'break-all', color: '#475569', paddingRight: '44px', fontFamily: 'monospace', lineHeight: 1.6 }}>
                    {pixData.qr_code}
                  </p>
                  <button onClick={handleCopyPix} title="Copiar código PIX"
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: copied ? '#10B981' : '#EFF6FF', border: 'none', borderRadius: '8px',
                      padding: '8px 10px', cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                    <Copy size={14} color={copied ? '#fff' : '#3B82F6'} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: copied ? '#fff' : '#3B82F6' }}>
                      {copied ? 'Copiado!' : 'Copiar'}
                    </span>
                  </button>
                </div>

                {/* Resumo */}
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Plano Anual Premium</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>R$ 39,90</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94A3B8' }}>Ativação automática após o pagamento</p>
                </div>

                <button onClick={onSuccess} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                  Já paguei – Ir para o Painel
                </button>
              </>
            )}
          </>
        )}

        {/* ══ ABA CARTÃO ═══════════════════════════════════════════ */}
        {tab === 'card' && (
          <form onSubmit={handleCardSubmit}>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                <p style={{ margin: 0, color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>⚠ {error}</p>
              </div>
            )}

            <label style={labelStyle}>Número do Cartão</label>
            <input type="text" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000" maxLength={19} required style={inputStyle} inputMode="numeric" />

            <label style={labelStyle}>Nome no Cartão</label>
            <input type="text" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
              placeholder="COMO ESCRITO NO CARTÃO" required style={inputStyle} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Validade</label>
                <input type="text" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/AA" maxLength={5} required style={inputStyle} inputMode="numeric" />
              </div>
              <div>
                <label style={labelStyle}>CVV</label>
                <input type="text" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123" maxLength={4} required style={inputStyle} inputMode="numeric" />
              </div>
            </div>

            <label style={labelStyle}>CPF do Titular</label>
            <input type="text" value={cardCpf} onChange={e => setCardCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00" maxLength={14} required style={inputStyle} inputMode="numeric" />

            <label style={labelStyle}>E-mail para recibo</label>
            <input type="email" value={cardEmail} onChange={e => setCardEmail(e.target.value)}
              placeholder="seuemail@exemplo.com" required style={inputStyle} />

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', margin: '16px 0' }}>
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

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#CBD5E1', marginTop: '16px' }}>
          🔒 Pagamento seguro via Mercado Pago
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ModalWrapper>
  );
}

// ── Subcomponentes e estilos ─────────────────────────────────────────────────

function ModalWrapper({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px',
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        fontFamily: "'Inter', 'Roboto', sans-serif"
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ onClose }) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800, lineHeight: 1.2 }}>Finalizar Assinatura</h3>
        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>Plano Anual — R$ 39,90</p>
      </div>
      <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={18} color="#475569" />
      </button>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', marginTop: '14px'
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0',
  fontSize: '15px', outline: 'none', color: '#0F172A', background: '#fff',
  boxSizing: 'border-box', fontFamily: 'inherit'
};

const primaryBtn = {
  width: '100%', padding: '14px', borderRadius: '12px',
  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px',
  cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.4)'
};

const submitBtnStyle = (disabled) => ({
  width: '100%', padding: '14px', borderRadius: '12px',
  background: disabled ? '#94A3B8' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 4px 14px rgba(59,130,246,0.4)',
  transition: 'all 0.2s'
});
