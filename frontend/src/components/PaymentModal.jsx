import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Copy, CreditCard, Smartphone, RefreshCw, AlertTriangle } from 'lucide-react';
import { API } from '../config';

/**
 * PaymentModal
 * Props:
 *  - userId       : ID do usuário no banco
 *  - userEmail    : E-mail pré-preenchido
 *  - onClose      : Fecha o modal sem fazer nada
 *  - onSuccess    : Chamado quando pagamento é concluído com sucesso
 *  - onPaymentFailed : Chamado quando o PIX falha ao gerar (ex: erro de rede / token inválido)
 *                     Permite que o pai decida o que fazer (ex: voltar para escolha de plano)
 */
export default function PaymentModal({ userId, userEmail, onClose, onSuccess, onPaymentFailed }) {
  const [tab, setTab] = useState('pix');
  const [loading, setLoading] = useState(false);
  const [pixLoading, setPixLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [error, setError] = useState('');
  const [pixError, setPixError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [planPrice, setPlanPrice] = useState('39.90');
  const [simulating, setSimulating] = useState(false);
  const [initialTrialEndsAt, setInitialTrialEndsAt] = useState(undefined);

  const handleSimulatePayment = async () => {
    setSimulating(true);
    setPixError('');
    const uid = userId || localStorage.getItem('cd_user_id') || '';
    try {
      const res = await fetch(`${API}/api/payment/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      if (res.ok) {
        setResult({ status: 'approved' });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao simular pagamento.');
      }
    } catch (err) {
      setPixError(err.message || 'Erro de conexão ao simular pagamento.');
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    const fetchInitialStatus = async () => {
      const uid = userId || localStorage.getItem('cd_user_id') || '';
      if (!uid) return;
      try {
        const res = await fetch(`${API}/api/payment/status/${uid}`);
        if (res.ok) {
          const data = await res.json();
          setInitialTrialEndsAt(data.trialEndsAt || null);
        }
      } catch (err) {
        console.error('[PaymentModal] Erro ao buscar status inicial:', err);
        setInitialTrialEndsAt(null);
      }
    };
    fetchInitialStatus();
  }, [userId]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        if (data.plan_price) setPlanPrice(data.plan_price);
      } catch (err) {
        console.error('[PaymentModal] Erro ao buscar preco:', err);
      }
    };
    fetchSettings();
  }, []);

  // ── Campos Cartão ─────────────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardEmail, setCardEmail] = useState(userEmail || '');
  const [cardCpf, setCardCpf] = useState('');

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

  // ── Gera PIX automático ao abrir ──────────────────────────────────────
  const generatePix = useCallback(async () => {
    const email = userEmail || localStorage.getItem('cd_user_contact') || '';
    const uid = userId || localStorage.getItem('cd_user_id') || '';

    let emailToUse = email.trim().toLowerCase();
    if (!emailToUse || !emailToUse.includes('@')) {
      emailToUse = `${uid || 'cliente'}@campainhadigital.com`;
    }

    setPixLoading(true);
    setPixError('');
    setPixData(null);

    try {
      // Tenta a rota dedicada /api/payment/pix primeiro (payload simples, sem CPF)
      let res = await fetch(`${API}/api/payment/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, userId: uid })
      });

      // Se a rota não existir no servidor (404), faz fallback para /api/payment/process
      if (res.status === 404) {
        res = await fetch(`${API}/api/payment/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_method_id: 'pix',
            payer: { email: emailToUse },
            external_reference: uid
          })
        });
      }

      let data;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        // O servidor retornou HTML (ex: catch-all do frontend) — rota não existe
        throw new Error('Servidor de pagamento indisponível. Tente novamente em alguns minutos.');
      }

      if (!res.ok || data.error) {
        const detail = data.details?.message || data.details?.cause?.[0]?.description || '';
        throw new Error(detail || data.error || 'Erro ao gerar PIX.');
      }
      if (!data.qr_code_base64) throw new Error('QR Code não retornado pelo servidor.');

      setPixData(data);
    } catch (err) {
      setPixError(err.message || 'Erro ao gerar PIX. Verifique sua conexão.');
    } finally {
      setPixLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    generatePix();
  }, [generatePix]);

  // Polling automático para verificar aprovação do PIX
  useEffect(() => {
    if (!pixData || initialTrialEndsAt === undefined) return;

    const uid = userId || localStorage.getItem('cd_user_id') || '';
    if (!uid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/payment/status/${uid}`);
        if (res.ok) {
          const data = await res.json();
          
          let approved = false;
          if (!initialTrialEndsAt) {
            // Se não tinha trial ou estava expirado, basta que o novo status seja premium
            if (data.isPremium) approved = true;
          } else {
            // Se já tinha trial ativo, o trialEndsAt deve ter mudado e aumentado (estendido)
            if (data.trialEndsAt && data.trialEndsAt !== initialTrialEndsAt) {
              const prev = new Date(initialTrialEndsAt);
              const curr = new Date(data.trialEndsAt);
              if (curr > prev) {
                approved = true;
              }
            }
          }

          if (approved) {
            clearInterval(interval);
            setResult({ status: 'approved' });
          }
        }
      } catch (err) {
        console.error('[PaymentModal] Erro ao consultar status de pagamento:', err);
      }
    }, 3000); // Consulta a cada 3 segundos

    return () => clearInterval(interval);
  }, [pixData, userId, initialTrialEndsAt]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
    generatePix();
  };

  // ── Cartão ────────────────────────────────────────────────────────────
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const rawCard = cardNumber.replace(/\s/g, '');
    const rawCpf = cardCpf.replace(/\D/g, '');
    const [expMonth, expYear] = cardExpiry.split('/');

    if (rawCard.length < 16) return setError('Número do cartão inválido.');
    if (!cardName) return setError('Informe o nome como está no cartão.');
    if (!expMonth || !expYear || parseInt(expMonth) > 12) return setError('Data de vencimento inválida.');
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
          transaction_amount: parseFloat(planPrice),
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

  // ── Telas de resultado finais ─────────────────────────────────────────
  if (result && result.status === 'approved') {
    return (
      <ModalWrapper onClose={onClose}>
        <ModalHeader onClose={onClose} planPrice={planPrice} />
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <CheckCircle size={72} color="#10B981" style={{ margin: '0 auto 20px', display: 'block' }} />
          <h4 style={{ fontSize: '22px', color: '#0F172A', margin: '0 0 10px', fontWeight: 800 }}>Pagamento Aprovado! 🎉</h4>
          <p style={{ color: '#64748B', marginBottom: '28px', lineHeight: 1.6, fontSize: '15px' }}>Sua Campainha Digital está ativa por 12 meses!</p>
          <button onClick={onSuccess} style={primaryBtn}>Entrar no Painel →</button>
        </div>
      </ModalWrapper>
    );
  }

  if (result && !result.qr_code_base64) {
    return (
      <ModalWrapper onClose={onClose}>
        <ModalHeader onClose={onClose} planPrice={planPrice} />
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '18px', color: '#0F172A', margin: '0 0 10px', fontWeight: 700 }}>Pagamento em análise</h4>
          <p style={{ color: '#64748B', marginBottom: '28px', lineHeight: 1.6 }}>
            Aguardando confirmação da operadora. Você receberá um e-mail.
          </p>
          <button onClick={onSuccess} style={primaryBtn}>Ir para o Painel</button>
        </div>
      </ModalWrapper>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader onClose={onClose} planPrice={planPrice} />

      <div style={{ padding: '0 24px 24px' }}>
        {/* Abas */}
        <div style={{ display: 'flex', gap: '8px', margin: '20px 0', background: '#F8FAFC', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'pix', label: 'PIX', icon: <Smartphone size={15} /> },
            { id: 'card', label: 'Cartão de Crédito', icon: <CreditCard size={15} /> }
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(''); }}
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

        {/* ═══ ABA PIX ════════════════════════════════════════════════ */}
        {tab === 'pix' && (
          <>
            {pixLoading && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  border: '4px solid #EFF6FF', borderTopColor: '#3B82F6',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
                }} />
                <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 600, margin: 0 }}>Gerando seu código PIX...</p>
                <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '6px' }}>Aguarde um momento</p>
              </div>
            )}

            {/* Erro ao gerar PIX */}
            {!pixLoading && pixError && (
              <div style={{ padding: '8px 0 16px' }}>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                  <AlertTriangle size={32} color="#EF4444" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: '0 0 4px', color: '#DC2626', fontSize: '14px', fontWeight: 700 }}>Falha ao gerar o PIX</p>
                  <p style={{ margin: '0 0 12px', color: '#EF4444', fontSize: '12px', lineHeight: 1.5 }}>
                    {pixError}
                  </p>
                </div>

                {/* Opções: tentar de novo ou voltar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={handleRetry}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', background: '#3B82F6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                    <RefreshCw size={16} /> Tentar novamente o PIX Real
                  </button>

                  {/* Botão "Voltar para escolha de plano" — só aparece se existir o callback */}
                  {onPaymentFailed && (
                    <button onClick={onPaymentFailed}
                      style={{ padding: '13px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                      ← Escolher outro plano
                    </button>
                  )}

                  <button onClick={onClose}
                    style={{ padding: '11px', borderRadius: '12px', background: 'transparent', color: '#94A3B8', border: '1px solid #E2E8F0', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                    Fechar e tentar mais tarde
                  </button>
                </div>
              </div>
            )}

            {/* QR Code PIX */}
            {!pixLoading && pixData?.qr_code_base64 && (
              <>
                {/* Banner de status do PIX */}
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>✅</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '13px' }}>PIX gerado com sucesso!</p>
                    <p style={{ margin: '2px 0 0', color: '#15803D', fontSize: '12px' }}>Escaneie ou copie o código — R$ {planPrice.replace('.', ',')}</p>
                  </div>
                </div>

                {/* QR Code */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', border: '2px solid #BBF7D0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <img
                      src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
                      alt="QR Code PIX"
                      style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
                    />
                  </div>
                </div>

                {/* Código Copia e Cola */}
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px dashed #CBD5E1', marginBottom: '16px', position: 'relative' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px' }}>CÓDIGO PIX COPIA E COLA</p>
                  <p style={{ margin: 0, fontSize: '10px', wordBreak: 'break-all', color: '#475569', paddingRight: '70px', fontFamily: 'monospace', lineHeight: 1.6 }}>
                    {pixData.qr_code}
                  </p>
                  <button onClick={handleCopyPix}
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

                {/* Botões de Ação baseados em PIX Real vs PIX de Simulação */}
                {pixData.is_mock ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={handleSimulatePayment} disabled={simulating}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '12px', background: '#10B981', color: '#fff',
                        border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '14px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s'
                      }}>
                      {simulating ? 'Ativando Conta de Teste...' : 'Confirmar Pagamento Simulado'}
                    </button>
                    
                    <button onClick={onClose}
                      style={{
                        width: '100%', padding: '11px', borderRadius: '12px', background: 'transparent',
                        color: '#94A3B8', border: '1px solid #E2E8F0', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                      }}>
                      Fechar e testar depois
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
                      Após o pagamento, a ativação é automática em segundos.
                    </p>

                    <button onClick={onSuccess}
                      style={{ width: '100%', padding: '13px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                      Já paguei – Ir para o Painel
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ═══ ABA CARTÃO ════════════════════════════════════════════ */}
        {tab === 'card' && (
          <form onSubmit={handleCardSubmit}>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
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
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>R$ {planPrice.replace('.', ',')}</span>
              </div>
            </div>

            <button type="submit" disabled={loading} style={submitBtnStyle(loading)}>
              {loading ? 'Processando...' : '💳 Pagar com Cartão'}
            </button>

            {onPaymentFailed && (
              <button type="button" onClick={onPaymentFailed}
                style={{ width: '100%', marginTop: '10px', padding: '11px', borderRadius: '12px', background: 'transparent', color: '#94A3B8', border: '1px solid #E2E8F0', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                ← Escolher outro plano
              </button>
            )}
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#CBD5E1', marginTop: '16px' }}>
          🔒 Pagamento seguro via Mercado Pago
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ModalWrapper>
  );
}

function ModalWrapper({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(8px)',
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

function ModalHeader({ onClose, planPrice }) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800 }}>Finalizar Assinatura</h3>
        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>Plano Anual — R$ {planPrice ? planPrice.replace('.', ',') : '39,90'}</p>
      </div>
      <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={18} color="#475569" />
      </button>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', marginTop: '14px' };
const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '15px', outline: 'none', color: '#0F172A', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' };
const primaryBtn = { width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' };
const submitBtnStyle = (disabled) => ({ width: '100%', padding: '14px', borderRadius: '12px', background: disabled ? '#94A3B8' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: disabled ? 'none' : '0 4px 14px rgba(59,130,246,0.4)', transition: 'all 0.2s' });
