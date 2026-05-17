import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Copy } from 'lucide-react';
import { API } from '../config';

export default function PaymentModal({ userId, onClose, onSuccess }) {
  const [paymentResult, setPaymentResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loadingBrick, setLoadingBrick] = useState(true);
  const brickControllerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Se o pagamento já foi efetuado ou já inicializamos o brick, não recarrega
    if (paymentResult || initializedRef.current) return;

    let active = true;

    const initBrick = async () => {
      // Aguarda até o script do Mercado Pago estar carregado no window
      let attempts = 0;
      while (!window.MercadoPago && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.MercadoPago) {
        console.error('[MP SDK] Mercado Pago SDK não pôde ser carregado.');
        return;
      }

      if (!active) return;

      try {
        initializedRef.current = true;
        // Chave pública de produção ou teste
        const mp = new window.MercadoPago('TEST-c17390a9-6f07-46d6-4643-7c09305e1a3f', { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();
        
        // Garante que o container existe
        const container = document.getElementById('paymentBrick_container');
        if (!container) return;

        // Limpa o container antes de criar para evitar duplicações
        container.innerHTML = '';

        const controller = await bricksBuilder.create('payment', 'paymentBrick_container', {
          initialization: {
            amount: 39.90, // Valor fixo anual
          },
          customization: {
            paymentMethods: {
              pix: 'all',
              creditCard: 'all'
            },
            visual: {
              style: {
                theme: 'default' // 'default' ou 'dark'
              }
            }
          },
          callbacks: {
            onReady: () => {
              if (active) setLoadingBrick(false);
            },
            onSubmit: ({ selectedPaymentMethod, formData }) => {
              return new Promise((resolve, reject) => {
                fetch(`${API}/api/payment/process`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ...formData,
                    external_reference: userId // Vincula ao usuário atual
                  }),
                })
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.error) {
                      reject();
                      alert('Erro ao processar pagamento: ' + (data.details?.message || data.error));
                    } else {
                      resolve();
                      if (active) {
                        setPaymentResult(data);
                        // Destrói o brick para limpar o DOM e liberar recursos
                        if (brickControllerRef.current) {
                          brickControllerRef.current.unmount();
                        }
                      }
                    }
                  })
                  .catch((error) => {
                    reject();
                    alert('Erro de conexão ao processar pagamento.');
                  });
              });
            },
            onError: (error) => {
              console.error('[MP SDK] Erro fatal no Brick:', error);
              if (active) setLoadingBrick(false);
            }
          }
        });

        if (active) {
          brickControllerRef.current = controller;
        } else {
          controller.unmount();
        }
      } catch (err) {
        console.error('[MP Brick] Falha ao renderizar payment brick:', err);
        if (active) setLoadingBrick(false);
      }
    };

    initBrick();

    return () => {
      active = false;
      if (brickControllerRef.current) {
        brickControllerRef.current.unmount();
        brickControllerRef.current = null;
      }
    };
  }, [paymentResult, userId]);

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
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: 600 }}>Finalizar Assinatura</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {!paymentResult ? (
            <div style={{ position: 'relative', minHeight: '300px' }}>
              {loadingBrick && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', zIndex: 10 }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                  <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>Carregando opções de pagamento...</p>
                </div>
              )}
              {/* Onde o Mercado Pago SDK irá renderizar o formulário */}
              <div id="paymentBrick_container" />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              {paymentResult.status === 'approved' ? (
                <>
                  <CheckCircle size={64} color="#10B981" style={{ margin: '0 auto 16px' }} />
                  <h4 style={{ fontSize: '20px', color: '#0F172A', margin: '0 0 8px 0', fontWeight: 700 }}>Pagamento Aprovado!</h4>
                  <p style={{ color: '#64748B', marginBottom: '24px', lineHeight: '1.5' }}>Sua conta anual Premium foi ativada com sucesso. Seja bem-vindo(a)!</p>
                  <button onClick={onSuccess} className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#3B82F6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
                    Entrar no Painel
                  </button>
                </>
              ) : paymentResult.qr_code_base64 ? (
                <>
                  <h4 style={{ fontSize: '20px', color: '#0F172A', margin: '0 0 12px 0', fontWeight: 700 }}>Pague via PIX</h4>
                  <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                    Abra o app do seu banco e escaneie o QR Code abaixo ou copie o código Pix Copia e Cola.
                  </p>
                  <img 
                    src={`data:image/jpeg;base64,${paymentResult.qr_code_base64}`} 
                    alt="QR Code PIX" 
                    style={{ width: '200px', height: '200px', margin: '0 auto 24px', display: 'block', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '8px' }} 
                  />
                  
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px dashed #CBD5E1', marginBottom: '24px', position: 'relative', textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '11px', wordBreak: 'break-all', color: '#475569', paddingRight: '32px', fontFamily: 'monospace' }}>
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
                  {copied && <p style={{ color: '#10B981', fontSize: '14px', marginTop: '-16px', marginBottom: '16px', fontWeight: 600 }}>✓ Código copiado!</p>}

                  <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
                    Após o pagamento, a ativação da conta será automática em alguns segundos.
                  </p>

                  <button onClick={onSuccess} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#0F172A', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
                    Já paguei / Ir para o Painel
                  </button>
                </>
              ) : (
                <>
                  <h4 style={{ fontSize: '20px', color: '#0F172A', margin: '0 0 8px 0', fontWeight: 700 }}>Pagamento Pendente</h4>
                  <p style={{ color: '#64748B', marginBottom: '24px', lineHeight: '1.5' }}>Aguardando confirmação da instituição financeira ou operadora do cartão.</p>
                  <button onClick={onSuccess} className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#3B82F6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
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
