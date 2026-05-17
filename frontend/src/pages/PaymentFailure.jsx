import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentFailure() {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate('/auth');
  };

  const handleDashboardTrial = () => {
    const unitId = localStorage.getItem('residentUnitId') || localStorage.getItem('cd_user_id');
    if (unitId) {
      navigate(`/morador/${unitId}`);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
      {/* Aurora Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>

      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px', textAlign: 'center', borderRadius: '24px', background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        
        {/* Error Icon */}
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}>
          <XCircle size={48} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Pagamento Não Concluído</h2>
          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: '8px 0 0' }}>
            Não foi possível processar o seu pagamento ou a transação foi cancelada no checkout do Mercado Pago.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
          <button 
            onClick={handleRetry} 
            className="btn-primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}
          >
            <RefreshCw size={16} /> Tentar Novamente
          </button>
          
          <button 
            onClick={handleDashboardTrial} 
            style={{ width: '100%', padding: '12px', borderRadius: '14px', background: '#F1F5F9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
          >
            <ArrowLeft size={16} /> Ir para o Painel
          </button>
        </div>

      </div>
    </div>
  );
}
