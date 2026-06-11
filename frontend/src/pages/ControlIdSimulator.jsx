import React, { useState } from 'react';
import { QrCode, CreditCard, Smile, Send, RefreshCw, ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react';
import { API } from '../config';

export default function ControlIdSimulator() {
  const [code, setCode] = useState('');
  const [type, setType] = useState('qrcode'); // 'qrcode' | 'card' | 'face'
  const [portalId, setPortalId] = useState('1');
  const [deviceId, setDeviceId] = useState('987654');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success: boolean, data: any, error: string }

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);

    let endpoint = '/api/controlid/new_qrcode.fcgi';
    let payload = {
      device_id: parseInt(deviceId) || 987654,
      portal_id: parseInt(portalId) || 1,
      time: Math.floor(Date.now() / 1000),
      uuid: Math.random().toString(36).substring(2, 15)
    };

    if (type === 'qrcode') {
      endpoint = '/api/controlid/new_qrcode.fcgi';
      payload.qrcode_value = code.trim();
    } else if (type === 'card') {
      endpoint = '/api/controlid/new_card.fcgi';
      payload.card_value = code.trim();
    } else if (type === 'face') {
      endpoint = '/api/controlid/new_user_identified.fcgi';
      payload.user_id = code.trim();
    }

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const eventCode = data?.result?.event;
        const isAuthorized = eventCode === 7;

        setResult({
          success: true,
          authorized: isAuthorized,
          data: data
        });
      } else {
        setResult({
          success: false,
          error: `Erro no servidor: Código de resposta ${res.status}`
        });
      }
    } catch (err) {
      setResult({
        success: false,
        error: 'Erro de conexão. Verifique se o servidor backend está rodando.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.hash = '/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      color: '#E2E8F0',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '600px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <button 
          onClick={handleBack}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94A3B8',
            padding: '10px 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} /> Voltar ao Sistema
        </button>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0, letterSpacing: '-0.5px' }}>
            🛠️ Simulador Control iD
          </h1>
          <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>Modo Online / Monitoramento Integrado</p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Guia explicativo */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '16px 20px',
          fontSize: '13px',
          lineHeight: 1.6,
          color: '#93C5FD'
        }}>
          💡 <strong>Como funciona a validação?</strong><br />
          Este painel emula as requisições que os leitores Control iD enviam ao servidor.
          Para testar, use o <strong>Código do Visitante</strong> (gerado na aba de moradores) ou o <strong>Código Único</strong> de um morador cadastrado.
        </div>

        {/* Formulário do Simulador */}
        <form onSubmit={handleSimulate} style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '24px',
          padding: '30px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '24px' }}>
            Simular Leitor de Acesso
          </h3>

          {/* Seleção do Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => { setType('qrcode'); setResult(null); }}
              style={{
                background: type === 'qrcode' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: type === 'qrcode' ? '2px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '14px',
                padding: '14px 10px',
                color: type === 'qrcode' ? '#60A5FA' : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <QrCode size={20} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => { setType('card'); setResult(null); }}
              style={{
                background: type === 'card' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: type === 'card' ? '2px solid #10B981' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '14px',
                padding: '14px 10px',
                color: type === 'card' ? '#34D399' : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={20} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>Cartão / Prox.</span>
            </button>

            <button
              type="button"
              onClick={() => { setType('face'); setResult(null); }}
              style={{
                background: type === 'face' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: type === 'face' ? '2px solid #8B5CF6' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '14px',
                padding: '14px 10px',
                color: type === 'face' ? '#A78BFA' : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Smile size={20} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>Biometria Facial</span>
            </button>
          </div>

          {/* Input do Código */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              {type === 'qrcode' && 'Código do QR Code Escaneado'}
              {type === 'card' && 'Número do Cartão de Proximidade (card_value)'}
              {type === 'face' && 'ID do Usuário Identificado na Face (user_id)'}
            </label>
            <input
              type="text"
              placeholder={type === 'qrcode' ? 'Digite os 6 dígitos do visitante ou código do morador...' : 'Ex: 102, 123456...'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '15px',
                color: '#FFF',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          {/* Configurações Adicionais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>PORTAL / RELÉ (portal_id)</label>
              <input
                type="number"
                value={portalId}
                onChange={(e) => setPortalId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#FFF',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>DISPOSITIVO (device_id)</label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#FFF',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFF',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              <>
                <RefreshCw className="spin" size={18} /> Processando Identificação...
              </>
            ) : (
              <>
                <Send size={18} /> Simular Acesso Control iD
              </>
            )}
          </button>
        </form>

        {/* Resultados da Validação */}
        {result && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: result.authorized ? '2px solid #10B981' : '2px solid #EF4444',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            {result.success ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  {result.authorized ? (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={24} />
                    </div>
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldAlert size={24} />
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: result.authorized ? '#10B981' : '#EF4444' }}>
                      {result.authorized ? 'ACESSO AUTORIZADO' : 'ACESSO RECUSADO'}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                      Control iD Evento: {result.data?.result?.event} | Usuário: {result.data?.result?.user_name}
                    </p>
                  </div>
                </div>

                {/* Ações enviadas de volta ao leitor */}
                {result.authorized && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#34D399', fontSize: '13px', fontWeight: 700 }}>⚡ Ações Físicas do Relé Disparadas:</h5>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#A7F3D0', lineHeight: 1.5 }}>
                      {result.data?.result?.actions?.map((act, index) => (
                        <li key={index}>
                          <strong>Ação:</strong> <code>{act.action}</code> | <strong>Parâmetro:</strong> <code>{act.parameters}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resposta JSON Bruta */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '8px' }}>RESPOSTA DO SERVIDOR (JSON):</span>
                  <pre style={{
                    margin: 0,
                    background: '#0F172A',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '11px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    color: '#818CF8',
                    lineHeight: 1.4
                  }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ color: '#FCA5A5', fontSize: '14px' }}>
                ⚠️ {result.error}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
