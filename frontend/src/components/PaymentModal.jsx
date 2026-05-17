import React, { useState, useEffect } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { X, CheckCircle, Copy } from 'lucide-react';
import { API } from '../config';

// Inicializa o Mercado Pago com a Chave Pública
// Use a chave pública do seu painel do Mercado Pago
initMercadoPago('TEST-c17390a9-6f07-46d6-4643-7c09305e1a3f', { locale: 'pt-BR' });

export default function PaymentModal({ userId, onClose, onSuccess }) {
  const [paymentResult, setPaymentResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const initialization = {
    amount: 39.90, // Valor do plano anual
    preferenceId: null // Não usamos preference, criamos o pagamento direto
  };

  const customization = {
    paymentMethods: {
      pix: 'all',
      creditCard: 'all'
    },
    visual: {
      style: {
        theme: 'default' // 'default' ou 'dark'
      }
    }
  };

  const onSubmit = async ({ selectedPaymentMethod, formData }) => {
    return new Promise((resolve, reject) => {
      fetch(`${API}/api/payment/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          external_reference: userId // Vincula o pagamento ao usuário criado
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            reject();
            alert('Erro ao processar pagamento: ' + (data.details?.message || data.error));
          } else {
            resolve();
            setPaymentResult(data);
          }
        })
        .catch((error) => {
          reject();
          alert('Erro de conexão ao processar pagamento.');
        });
    });
  };

  const onError = async (error) => {
    console.error('[MP SDK] Erro:', error);
  };

  const onReady = async () => {
    // Esconder o loading se necessário
  };

  const handleCopyPix = () => {
    if (paymentResult?.qr_code) {
      navigator.clipboard.writeText(paymentResult.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: 600 }}>Finalizar Assinatura</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {!paymentResult ? (
            <Payment
              initialization={initialization}
              customization={customization}
              onSubmit={onSubmit}
              onReady={onReady}
              onError={onError}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {paymentResult.status === 'approved' ? (
                <>
                  <CheckCircle size={64} color="#10B981" style={{ margin: '0 auto 16px' }} />
                  <h4 style={{ fontSize: '20px', color: '#0F172A', margin: '0 0 8px 0' }}>Pagamento Aprovado!</h4>
                  <p style={{ color: '#64748B', marginBottom: '24px' }}>Sua conta anual Premium foi ativada com sucesso.</p>
                  <button onClick={onSuccess} className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px' }}>
                    Entrar no Painel
                  </button>
                </>
              ) : paymentResult.qr_code_base64 ? (
                <>
                  <h4 style={{ fontSize: '20px', color: '#0F172A', margin: '0 0 16px 0' }}>Pague via PIX</h4>
                  <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
                    Abra o app do seu banco e escaneie o QR Code abaixo ou copie o código Pix Copia e Cola.
                  </p>
                  <img 
                    src={`data:image/jpeg;base64,${paymentResult.qr_code_base64}`} 
                    alt="QR Code PIX" 
                    style={{ width: '200px', height: '200px', margin: '0 auto 24px', display: 'block', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '8px' }} 
                  />
                  
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px dashed #CBD5E1', marginBottom: '24px', position: 'relative' }}>
                    <p style={{ margin: 0, fontSize: '12px', wordBreak: 'break-all', color: '#475569', paddingRight: '32px' }}>
                      {paymentResult.qr_code}
                    </p>
                    <button 
                      onClick={handleCopyPix}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6' }}
                      title="Copiar código PIX"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                  {copied && <p style={{ color: '#10B981', fontSize: '14px', marginTop: '-16px', marginBottom: '16px', fontWeight: 500 }}>Código copiado!</p>}

                  <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
                    Após o pagamento, a ativação da conta será automática em alguns segundos.
                  </p>

                  <button onClick={onSuccess} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#0F172A', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    Já paguei / Ir para o Painel
                  </button>
                </>
              ) : (
                <>
                  <h4 style={{ fontSize: '20px', color: '#0F172A', margin: '0 0 8px 0' }}>Pagamento Pendente</h4>
                  <p style={{ color: '#64748B', marginBottom: '24px' }}>Aguardando confirmação da instituição financeira.</p>
                  <button onClick={onSuccess} className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px' }}>
                    Ir para o Painel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
