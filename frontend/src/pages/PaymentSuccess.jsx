import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Home } from 'lucide-react';
import { API } from '../config';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(4);
  const [error, setError] = useState(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const userId = localStorage.getItem('cd_user_id') || searchParams.get('external_reference');
        if (!userId) {
          setError('Usuário não identificado.');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API}/api/payment/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        if (res.ok) {
          setLoading(false);
        } else {
          setError('Houve um problema ao processar seu pagamento. Entre em contato com o suporte.');
          setLoading(false);
        }
      } catch (err) {
        console.error('[MP] Erro confirmacao:', err);
        setError('Erro de conexão ao ativar seu plano.');
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams]);

  useEffect(() => {
    if (loading || error) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const unitId = localStorage.getItem('residentUnitId') || localStorage.getItem('cd_user_id');
          navigate(`/morador/${unitId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, error, navigate]);

  const handleGoToDashboard = () => {
    const unitId = localStorage.getItem('residentUnitId') || localStorage.getItem('cd_user_id');
    navigate(`/morador/${unitId}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
      {/* Aurora Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>

      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px', textAlign: 'center', borderRadius: '24px', background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="pulse" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid #3B82F6', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B' }}>Confirmando Ativação...</h2>
            <p style={{ fontSize: '14px', color: '#64748B' }}>Aguarde enquanto registramos o seu pagamento no Mercado Pago.</p>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={48} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444' }}>Atenção!</h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>{error}</p>
            <button onClick={handleGoToDashboard} className="btn-primary" style={{ marginTop: '16px' }}>
              Ir para o Painel <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
            
            {/* Glowing Success Icon */}
            <div className="scale-up" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
              <CheckCircle2 size={48} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>Pagamento Aprovado!</h2>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
              Parabéns! Sua <strong>Campainha Digital Anual Premium</strong> está ativa pelo período de 365 dias!
            </p>

            {/* Countdown Badge */}
            <div style={{ background: '#F0FDF4', color: '#16A34A', padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 700, border: '1px solid #DCFCE7', marginTop: '8px' }}>
              Redirecionando em {countdown} segundos...
            </div>

            <button 
              onClick={handleGoToDashboard} 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              Acessar Painel Agora <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
