import React, { forwardRef } from 'react';
import Logo from './Logo';

const PrintablePlate = forwardRef(({ qrImage, isPreview = false }, ref) => {
  return (
    <div 
      ref={ref}
      style={{ 
        width: '400px', 
        height: '500px', 
        background: '#FFFFFF', 
        position: isPreview ? 'relative' : 'absolute', 
        top: isPreview ? '0' : '-9999px',
        left: isPreview ? '0' : '-9999px',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '40px',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
        borderRadius: isPreview ? '20px' : '0',
        boxShadow: isPreview ? '0 20px 40px rgba(0,0,0,0.12)' : 'none',
        border: isPreview ? '1px solid #E2E8F0' : 'none'
      }}
    >
      {/* Detalhes dos "parafusos" do acrílico */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', width: '12px', height: '12px', borderRadius: '50%', background: '#CBD5E1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'absolute', top: '20px', right: '20px', width: '12px', height: '12px', borderRadius: '50%', background: '#CBD5E1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '12px', height: '12px', borderRadius: '50%', background: '#CBD5E1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '12px', height: '12px', borderRadius: '50%', background: '#CBD5E1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />

      {/* Header com Logo e Texto */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0 0 0' }}>
        <Logo size={48} showText={true} vertical={true} />
      </div>

      {/* Área Central: Ícone do Celular e QR Code */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: '20px 0' }}>
        <div style={{ width: '80px', height: '160px', borderRadius: '16px', background: '#0F172A', border: '4px solid #334155', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ position: 'absolute', bottom: '8px', width: '12px', height: '12px', borderRadius: '50%', background: '#94A3B8' }}></div>
           <div style={{ width: '64px', height: '120px', background: '#FFF', borderRadius: '4px' }}></div>
        </div>
        
        {qrImage ? (
          <img src={qrImage} alt="QR Code" style={{ width: '160px', height: '160px', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '160px', height: '160px', background: '#F1F5F9', border: '2px dashed #CBD5E1' }}></div>
        )}
      </div>

      {/* Texto de Instrução */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.4 }}>
          ESCANEIE AQUI COM<br/>O SEU TELEFONE E<br/>FALE COM O MORADOR
        </p>
      </div>
    </div>
  );
});

export default PrintablePlate;
